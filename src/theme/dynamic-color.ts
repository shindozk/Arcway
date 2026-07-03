import {
  argbFromHex,
  hexFromArgb,
  themeFromSourceColor,
  type Theme,
} from '@material/material-color-utilities';

export function hexToArgb(hex: string): number {
  return argbFromHex(hex);
}

export function argbToHex(argb: number): string {
  return hexFromArgb(argb);
}

export interface M3ColorScheme {
  primary: string;
  onPrimary: string;
  primaryContainer: string;
  onPrimaryContainer: string;
  secondary: string;
  onSecondary: string;
  secondaryContainer: string;
  onSecondaryContainer: string;
  tertiary: string;
  onTertiary: string;
  tertiaryContainer: string;
  onTertiaryContainer: string;
  error: string;
  onError: string;
  errorContainer: string;
  onErrorContainer: string;
  surface: string;
  onSurface: string;
  surfaceVariant: string;
  onSurfaceVariant: string;
  outline: string;
  outlineVariant: string;
  shadow: string;
  scrim: string;
  inverseSurface: string;
  inverseOnSurface: string;
  inversePrimary: string;
  surfaceDim: string;
  surfaceBright: string;
  surfaceContainerLowest: string;
  surfaceContainerLow: string;
  surfaceContainer: string;
  surfaceContainerHigh: string;
  surfaceContainerHighest: string;
}

export function generateScheme(
  seedColor: string,
  dark: boolean
): M3ColorScheme {
  const seed = argbFromHex(seedColor);
  const theme: Theme = themeFromSourceColor(seed);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const scheme = dark ? theme.schemes.dark : theme.schemes.light;
  const s = scheme as unknown as Record<string, number>;

  return {
    primary: argbToHex(s.primary),
    onPrimary: argbToHex(s.onPrimary),
    primaryContainer: argbToHex(s.primaryContainer),
    onPrimaryContainer: argbToHex(s.onPrimaryContainer),
    secondary: argbToHex(s.secondary),
    onSecondary: argbToHex(s.onSecondary),
    secondaryContainer: argbToHex(s.secondaryContainer),
    onSecondaryContainer: argbToHex(s.onSecondaryContainer),
    tertiary: argbToHex(s.tertiary),
    onTertiary: argbToHex(s.onTertiary),
    tertiaryContainer: argbToHex(s.tertiaryContainer),
    onTertiaryContainer: argbToHex(s.onTertiaryContainer),
    error: argbToHex(s.error),
    onError: argbToHex(s.onError),
    errorContainer: argbToHex(s.errorContainer),
    onErrorContainer: argbToHex(s.onErrorContainer),
    surface: argbToHex(s.surface),
    onSurface: argbToHex(s.onSurface),
    surfaceVariant: argbToHex(s.surfaceVariant),
    onSurfaceVariant: argbToHex(s.onSurfaceVariant),
    outline: argbToHex(s.outline),
    outlineVariant: argbToHex(s.outlineVariant),
    shadow: argbToHex(s.shadow),
    scrim: argbToHex(s.scrim),
    inverseSurface: argbToHex(s.inverseSurface),
    inverseOnSurface: argbToHex(s.inverseOnSurface),
    inversePrimary: argbToHex(s.inversePrimary),
    surfaceDim: argbToHex(s.surfaceDim ?? s.surface),
    surfaceBright: argbToHex(s.surfaceBright ?? s.surface),
    surfaceContainerLowest: argbToHex(s.surfaceContainerLowest ?? s.surface),
    surfaceContainerLow: argbToHex(s.surfaceContainerLow ?? s.surface),
    surfaceContainer: argbToHex(s.surfaceContainer ?? s.surface),
    surfaceContainerHigh: argbToHex(s.surfaceContainerHigh ?? s.surface),
    surfaceContainerHighest: argbToHex(s.surfaceContainerHighest ?? s.surface),
  };
}

export function applySchemeToRoot(scheme: M3ColorScheme): void {
  const root = document.documentElement;
  const entries = Object.entries(scheme) as [string, string][];
  for (const [key, value] of entries) {
    const cssVar = `--md-sys-color-${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
    root.style.setProperty(cssVar, value);
  }
}
