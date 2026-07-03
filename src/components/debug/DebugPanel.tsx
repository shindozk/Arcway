import { useState, useEffect, useRef, useCallback } from 'react';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';

interface LogEntry {
  id: number;
  level: string;
  message: string;
  timestamp: string;
  source: 'frontend' | 'backend';
  module?: string;
}

type FilterLevel = 'all' | 'info' | 'warn' | 'error' | 'debug';
type FilterSource = 'all' | 'frontend' | 'backend';

const LEVEL_STYLES: Record<string, { color: string; bg: string }> = {
  INFO:  { color: '#60a5fa', bg: 'rgba(96,165,250,0.08)' },
  LOG:   { color: '#34d399', bg: 'rgba(52,211,153,0.08)' },
  WARN:  { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)' },
  ERROR: { color: '#f87171', bg: 'rgba(248,113,113,0.08)' },
  DEBUG: { color: '#a78bfa', bg: 'rgba(167,139,250,0.08)' },
};

let logId = 0;

export function DebugPanel() {
  const [open, setOpen] = useState(false);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<FilterLevel>('all');
  const [sourceFilter, setSourceFilter] = useState<FilterSource>('all');
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ w: 560, h: 420 });
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({ sx: 0, sy: 0, px: 0, py: 0 });
  const resizeRef = useRef({ sx: 0, sy: 0, sw: 0, sh: 0 });

  const add = useCallback((entry: Omit<LogEntry, 'id'>) => {
    setLogs((prev) => {
      const next = [...prev, { ...entry, id: logId++ }];
      return next.length > 800 ? next.slice(-800) : next;
    });
  }, []);

  // Frontend console capture
  useEffect(() => {
    if (!open) return;
    const orig = { log: console.log, warn: console.warn, error: console.error, debug: console.debug };

    const ts = () => {
      const d = new Date();
      return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}.${String(d.getMilliseconds()).padStart(3,'0')}`;
    };
    const fmt = (...a: unknown[]) => a.map(x => typeof x === 'string' ? x : JSON.stringify(x, null, 2)).join(' ');

    console.log   = (...a: unknown[]) => { orig.log(...a);   add({ level: 'LOG',   message: fmt(...a), timestamp: ts(), source: 'frontend' }); };
    console.warn  = (...a: unknown[]) => { orig.warn(...a);  add({ level: 'WARN',  message: fmt(...a), timestamp: ts(), source: 'frontend' }); };
    console.error = (...a: unknown[]) => { orig.error(...a); add({ level: 'ERROR', message: fmt(...a), timestamp: ts(), source: 'frontend' }); };
    console.debug = (...a: unknown[]) => { orig.debug(...a); add({ level: 'DEBUG', message: fmt(...a), timestamp: ts(), source: 'frontend' }); };

    return () => { Object.assign(console, orig); };
  }, [open, add]);

  // Backend log listener
  useEffect(() => {
    if (!open) return;
    let unlisten: UnlistenFn | null = null;
    listen<{ level: string; message: string; timestamp: string; source: string }>('backend-log', (e) => {
      add({ level: e.payload.level, message: e.payload.message, timestamp: e.payload.timestamp, source: 'backend' });
    }).then(fn => { unlisten = fn; });
    return () => { unlisten?.(); };
  }, [open, add]);

  // Auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [logs]);

  // Drag
  useEffect(() => {
    if (!dragging) return;
    const move = (e: MouseEvent) => setPos({ x: dragRef.current.px + e.clientX - dragRef.current.sx, y: dragRef.current.py + e.clientY - dragRef.current.sy });
    const up = () => setDragging(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, [dragging]);

  // Resize
  useEffect(() => {
    if (!resizing) return;
    const move = (e: MouseEvent) => setSize({ w: Math.max(320, resizeRef.current.sw + resizeRef.current.sx - e.clientX), h: Math.max(200, resizeRef.current.sh + resizeRef.current.sy - e.clientY) });
    const up = () => setResizing(false);
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, [resizing]);

  const filtered = logs.filter(l => {
    if (sourceFilter !== 'all' && l.source !== sourceFilter) return false;
    if (filter === 'all') return true;
    if (filter === 'warn') return l.level === 'WARN' || l.level === 'ERROR';
    return l.level === filter.toUpperCase();
  });

  const counts = { all: filtered.length, error: 0, warn: 0, info: 0, debug: 0 };
  for (const l of filtered) {
    if (l.level === 'ERROR') counts.error++;
    else if (l.level === 'WARN') counts.warn++;
    else if (l.level === 'INFO' || l.level === 'LOG') counts.info++;
    else if (l.level === 'DEBUG') counts.debug++;
  }

  const btnBase: React.CSSProperties = {
    border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '11px',
    fontFamily: "'SF Mono', 'Fira Code', monospace", cursor: 'pointer', transition: 'all 0.15s',
    fontWeight: 500, letterSpacing: '0.3px',
  };

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(!open)}
        title="Debug Console"
        style={{
          position: 'fixed', bottom: 20, right: 20, width: 44, height: 44,
          borderRadius: '50%', border: 'none', cursor: 'pointer', zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: open ? '#ef4444' : '#3b82f6', color: '#fff',
          boxShadow: '0 2px 12px rgba(0,0,0,0.25)', transition: 'all 0.2s',
          fontSize: '20px', fontFamily: 'Material Symbols Outlined',
        }}
      >
        {open ? 'close' : 'terminal'}
      </button>

      {open && (
        <div style={{
          position: 'fixed', bottom: 76, right: 20, width: size.w, height: size.h,
          transform: `translate(${pos.x}px, ${pos.y}px)`,
          backgroundColor: '#0f0f0f', borderRadius: 12, border: '1px solid #262626',
          display: 'flex', flexDirection: 'column', zIndex: 9999,
          boxShadow: '0 12px 48px rgba(0,0,0,0.6)', overflow: 'hidden',
          fontFamily: "'SF Mono', 'Fira Code', 'Cascadia Code', monospace",
          fontSize: '12px', lineHeight: '1.5',
        }}>
          {/* Resize handle */}
          <div style={{ position: 'absolute', top: 0, left: 0, width: 6, height: '100%', cursor: 'ew-resize', zIndex: 10 }}
            onMouseDown={(e) => { e.stopPropagation(); setResizing(true); resizeRef.current = { sx: e.clientX, sy: e.clientY, sw: size.w, sh: size.h }; }} />

          {/* Header */}
          <div
            onMouseDown={(e) => { setDragging(true); dragRef.current = { sx: e.clientX, sy: e.clientY, px: pos.x, py: pos.y }; }}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 14px', backgroundColor: '#171717', borderBottom: '1px solid #262626',
              cursor: 'move', userSelect: 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#e5e5e5', letterSpacing: '0.5px' }}>
                CONSOLE
              </span>
              <span style={{
                fontSize: '10px', padding: '1px 7px', borderRadius: 8,
                backgroundColor: '#262626', color: '#737373', fontWeight: 500,
              }}>
                {counts.all}
              </span>
            </div>
            <button
              onClick={() => { setLogs([]); logId = 0; }}
              style={{ ...btnBase, backgroundColor: 'transparent', color: '#525252' }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#ef4444'}
              onMouseLeave={(e) => e.currentTarget.style.color = '#525252'}
            >
              clear
            </button>
          </div>

          {/* Filters */}
          <div style={{
            display: 'flex', gap: 4, padding: '6px 14px', backgroundColor: '#141414',
            borderBottom: '1px solid #1f1f1f', alignItems: 'center',
          }}>
            {(['all', 'error', 'warn', 'info', 'debug'] as FilterLevel[]).map(f => {
              const active = filter === f;
              const color = f === 'error' ? '#f87171' : f === 'warn' ? '#fbbf24' : f === 'info' ? '#60a5fa' : f === 'debug' ? '#a78bfa' : '#737373';
              return (
                <button key={f} onClick={() => setFilter(f)} style={{
                  ...btnBase,
                  backgroundColor: active ? `${color}15` : 'transparent',
                  color: active ? color : '#525252',
                  borderWidth: 1, borderStyle: 'solid', borderColor: active ? `${color}30` : 'transparent',
                }}>
                  {f.toUpperCase()}
                </button>
              );
            })}
            <div style={{ width: 1, height: 16, backgroundColor: '#262626', margin: '0 4px' }} />
            {(['all', 'frontend', 'backend'] as FilterSource[]).map(s => (
              <button key={s} onClick={() => setSourceFilter(s)} style={{
                ...btnBase,
                backgroundColor: sourceFilter === s ? '#262626' : 'transparent',
                color: sourceFilter === s ? '#a3a3a3' : '#404040',
              }}>
                {s === 'all' ? 'ALL' : s === 'frontend' ? 'FE' : 'BE'}
              </button>
            ))}
          </div>

          {/* Log list */}
          <div ref={scrollRef} style={{ flex: 1, overflow: 'auto', padding: '2px 0' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#404040', fontSize: '12px' }}>
                No logs yet
              </div>
            ) : filtered.map(l => {
              const ls = LEVEL_STYLES[l.level] || LEVEL_STYLES.LOG;
              return (
                <div key={l.id} style={{
                  display: 'flex', alignItems: 'flex-start', padding: '3px 14px', gap: 8,
                  backgroundColor: l.level === 'ERROR' ? ls.bg : 'transparent',
                  borderLeft: l.level === 'ERROR' ? '2px solid #f87171' : '2px solid transparent',
                }}>
                  <span style={{ color: '#404040', flexShrink: 0, width: 80, fontSize: '11px' }}>{l.timestamp}</span>
                  <span style={{
                    flexShrink: 0, width: 14, textAlign: 'center', fontWeight: 700, fontSize: '10px',
                    color: l.source === 'backend' ? '#60a5fa' : '#34d399',
                  }}>
                    {l.source === 'backend' ? 'B' : 'F'}
                  </span>
                  <span style={{
                    flexShrink: 0, width: 44, textAlign: 'center', fontWeight: 600,
                    fontSize: '10px', color: ls.color, letterSpacing: '0.5px',
                  }}>
                    {l.level}
                  </span>
                  <span style={{ color: '#d4d4d4', wordBreak: 'break-all', flex: 1, fontSize: '11.5px' }}>
                    {l.message}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
