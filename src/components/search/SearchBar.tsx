import { useState, useCallback } from 'react';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { PackageSource } from '../../types/package';
import { SOURCE_LABELS } from '../../utils/constants';
import { playSound } from '../../utils/sounds';
import { useI18n } from '../../i18n';
import { useAnimateOnMount } from '../../utils/animations';

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '16px 24px',
  },
  inputRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'var(--md-sys-color-surface-container-high)',
    borderRadius: '28px',
    padding: '4px 16px 4px 16px',
    height: '56px',
    transition: 'box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1), transform 0.15s ease',
  },
  icon: {
    fontSize: '24px',
    color: 'var(--md-sys-color-on-surface-variant)',
    fontFamily: 'Material Symbols Outlined',
    flexShrink: 0,
  },
  input: {
    flex: 1,
    height: '100%',
    border: 'none',
    background: 'transparent',
    outline: 'none',
    fontSize: '16px',
    color: 'var(--md-sys-color-on-surface)',
    fontFamily: 'inherit',
  },
  clearBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '16px',
    border: 'none',
    background: 'transparent',
    color: 'var(--md-sys-color-on-surface-variant)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flexShrink: 0,
    transition: 'transform 0.15s ease, background-color 0.15s ease',
  },
  filters: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '6px 16px',
    borderRadius: '8px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: 'var(--md-sys-color-outline)',
    background: 'transparent',
    color: 'var(--md-sys-color-on-surface)',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
    fontFamily: 'inherit',
  },
  chipActive: {
    backgroundColor: 'var(--md-sys-color-secondary-container)',
    color: 'var(--md-sys-color-on-secondary-container)',
    borderColor: 'var(--md-sys-color-secondary-container)',
  },
};

interface SearchBarProps {
  onSearch: (query: string) => void;
  initialValue?: string;
}

export function SearchBar({ onSearch, initialValue = '' }: SearchBarProps) {
  const [query, setQuery] = useState(initialValue);
  const enabledSources = useSettingsStore((s) => s.settings.enabled_sources);
  const toggleSource = useSettingsStore((s) => s.toggleSource);
  const anim = useAnimateOnMount({ variant: 'slideUp', duration: 300 });
  const { t } = useI18n();

  const handleChange = useCallback(
    (value: string) => {
      setQuery(value);
      if (value.trim()) {
        playSound('search');
      }
      onSearch(value);
    },
    [onSearch]
  );

  return (
    <div style={{ ...styles.container, ...anim.style }}>
      <div
        style={styles.inputRow}
        onFocus={(e) => {
          e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.18)';
          e.currentTarget.style.transform = 'scale(1.005)';
        }}
        onBlur={(e) => {
          e.currentTarget.style.boxShadow = 'none';
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <span className="material-symbols-outlined" style={styles.icon}>
          search
        </span>
        <input
          style={styles.input}
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder={t('search.placeholder')}
          autoFocus
        />
        {!query && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '4px',
            padding: '3px 8px', borderRadius: '6px',
            backgroundColor: 'var(--md-sys-color-surface-container)',
            border: '1px solid var(--md-sys-color-outline-variant)',
            flexShrink: 0,
          }}>
            <kbd style={{ fontSize: '10px', color: 'var(--md-sys-color-outline)', fontFamily: 'inherit' }}>Ctrl+K</kbd>
          </div>
        )}
        {query && (
          <button
            style={styles.clearBtn}
            onClick={() => {
              playSound('click');
              handleChange('');
            }}
            aria-label="Clear search"
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.15)';
              e.currentTarget.style.backgroundColor = 'var(--md-sys-color-surface-container)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
              close
            </span>
          </button>
        )}
      </div>

      <div style={styles.filters}>
        {(Object.values(PackageSource) as PackageSource[]).map((source) => {
          const isActive = enabledSources.includes(source);
          return (
            <button
              key={source}
              style={{
                ...styles.chip,
                ...(isActive ? styles.chipActive : {}),
              }}
              onClick={() => {
                playSound('toggle');
                toggleSource(source);
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.borderColor = 'var(--md-sys-color-primary)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                if (!isActive) {
                  e.currentTarget.style.borderColor = 'var(--md-sys-color-outline)';
                }
              }}
            >
              {SOURCE_LABELS[source]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
