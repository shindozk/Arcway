const MODULE = 'app';

function ts(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}.${String(d.getMilliseconds()).padStart(3,'0')}`;
}

function log(level: string, module: string, ...args: unknown[]) {
  const prefix = `[${ts()}] [${module}]`;
  const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a, null, 2)).join(' ');
  const styled = `%c${prefix}%c ${msg}`;
  const styles = [
    `color: ${level === 'ERROR' ? '#f87171' : level === 'WARN' ? '#fbbf24' : '#60a5fa'}; font-weight: bold`,
    'color: inherit',
  ];

  switch (level) {
    case 'ERROR': console.error(styled, ...styles); break;
    case 'WARN':  console.warn(styled, ...styles);  break;
    case 'DEBUG': console.debug(styled, ...styles); break;
    default:      console.log(styled, ...styles);    break;
  }
}

export function createLogger(module: string) {
  return {
    info:  (...args: unknown[]) => log('INFO',  module, ...args),
    warn:  (...args: unknown[]) => log('WARN',  module, ...args),
    error: (...args: unknown[]) => log('ERROR', module, ...args),
    debug: (...args: unknown[]) => log('DEBUG', module, ...args),
  };
}

export const logger = createLogger(MODULE);
