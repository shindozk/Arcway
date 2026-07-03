import { type M3ColorScheme, generateScheme, applySchemeToRoot } from './dynamic-color';
import { DEFAULT_SEED_COLOR } from '../utils/constants';

const lightTokens: Record<string, string> = {
  '--md-sys-color-primary': '#6750A4',
  '--md-sys-color-on-primary': '#FFFFFF',
  '--md-sys-color-primary-container': '#EADDFF',
  '--md-sys-color-on-primary-container': '#21005D',
  '--md-sys-color-secondary': '#625B71',
  '--md-sys-color-on-secondary': '#FFFFFF',
  '--md-sys-color-secondary-container': '#E8DEF8',
  '--md-sys-color-on-secondary-container': '#1D192B',
  '--md-sys-color-tertiary': '#7D5260',
  '--md-sys-color-on-tertiary': '#FFFFFF',
  '--md-sys-color-tertiary-container': '#FFD8E4',
  '--md-sys-color-on-tertiary-container': '#31111D',
  '--md-sys-color-error': '#B3261E',
  '--md-sys-color-on-error': '#FFFFFF',
  '--md-sys-color-error-container': '#F9DEDC',
  '--md-sys-color-on-error-container': '#410E0B',
  '--md-sys-color-surface': '#FEF7FF',
  '--md-sys-color-on-surface': '#1D1B20',
  '--md-sys-color-surface-variant': '#E7E0EC',
  '--md-sys-color-on-surface-variant': '#49454F',
  '--md-sys-color-outline': '#79747E',
  '--md-sys-color-outline-variant': '#CAC4D0',
  '--md-sys-color-shadow': '#000000',
  '--md-sys-color-scrim': '#000000',
  '--md-sys-color-inverse-surface': '#322F35',
  '--md-sys-color-inverse-on-surface': '#F5EFF7',
  '--md-sys-color-inverse-primary': '#D0BCFF',
  '--md-sys-color-surface-dim': '#DED8E1',
  '--md-sys-color-surface-bright': '#FEF7FF',
  '--md-sys-color-surface-container-lowest': '#FFFFFF',
  '--md-sys-color-surface-container-low': '#F7F2FA',
  '--md-sys-color-surface-container': '#F3EDF7',
  '--md-sys-color-surface-container-high': '#ECE6F0',
  '--md-sys-color-surface-container-highest': '#E6E0E9',
};

const darkTokens: Record<string, string> = {
  '--md-sys-color-primary': '#D0BCFF',
  '--md-sys-color-on-primary': '#381E72',
  '--md-sys-color-primary-container': '#4F378B',
  '--md-sys-color-on-primary-container': '#EADDFF',
  '--md-sys-color-secondary': '#CCC2DC',
  '--md-sys-color-on-secondary': '#332D41',
  '--md-sys-color-secondary-container': '#4A4458',
  '--md-sys-color-on-secondary-container': '#E8DEF8',
  '--md-sys-color-tertiary': '#EFB8C8',
  '--md-sys-color-on-tertiary': '#492532',
  '--md-sys-color-tertiary-container': '#633B48',
  '--md-sys-color-on-tertiary-container': '#FFD8E4',
  '--md-sys-color-error': '#F2B8B5',
  '--md-sys-color-on-error': '#601410',
  '--md-sys-color-error-container': '#8C1D18',
  '--md-sys-color-on-error-container': '#F9DEDC',
  '--md-sys-color-surface': '#141218',
  '--md-sys-color-on-surface': '#E6E0E9',
  '--md-sys-color-surface-variant': '#49454F',
  '--md-sys-color-on-surface-variant': '#CAC4D0',
  '--md-sys-color-outline': '#938F99',
  '--md-sys-color-outline-variant': '#49454F',
  '--md-sys-color-shadow': '#000000',
  '--md-sys-color-scrim': '#000000',
  '--md-sys-color-inverse-surface': '#E6E0E9',
  '--md-sys-color-inverse-on-surface': '#322F35',
  '--md-sys-color-inverse-primary': '#6750A4',
  '--md-sys-color-surface-dim': '#141218',
  '--md-sys-color-surface-bright': '#3B383E',
  '--md-sys-color-surface-container-lowest': '#0F0D13',
  '--md-sys-color-surface-container-low': '#1D1B20',
  '--md-sys-color-surface-container': '#211F26',
  '--md-sys-color-surface-container-high': '#2B2930',
  '--md-sys-color-surface-container-highest': '#36343B',
};

export function applyStaticTokens(dark: boolean): void {
  const tokens = dark ? darkTokens : lightTokens;
  const root = document.documentElement;
  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(key, value);
  }
}

export function applyDynamicTokens(seedColor: string, dark: boolean): void {
  const scheme: M3ColorScheme = generateScheme(seedColor, dark);
  applySchemeToRoot(scheme);
  applyAdditionalTypographyTokens();
}

function applyAdditionalTypographyTokens(): void {
  const root = document.documentElement;
  root.style.setProperty('--md-sys-typescale-display-large-size', '57px');
  root.style.setProperty('--md-sys-typescale-display-large-line-height', '64px');
  root.style.setProperty('--md-sys-typescale-display-large-weight', '400');
  root.style.setProperty('--md-sys-typescale-display-large-tracking', '-0.25px');

  root.style.setProperty('--md-sys-typescale-headline-large-size', '32px');
  root.style.setProperty('--md-sys-typescale-headline-large-line-height', '40px');
  root.style.setProperty('--md-sys-typescale-headline-large-weight', '400');

  root.style.setProperty('--md-sys-typescale-title-large-size', '22px');
  root.style.setProperty('--md-sys-typescale-title-large-line-height', '28px');
  root.style.setProperty('--md-sys-typescale-title-large-weight', '400');

  root.style.setProperty('--md-sys-typescale-body-large-size', '16px');
  root.style.setProperty('--md-sys-typescale-body-large-line-height', '24px');
  root.style.setProperty('--md-sys-typescale-body-large-weight', '400');

  root.style.setProperty('--md-sys-typescale-label-large-size', '14px');
  root.style.setProperty('--md-sys-typescale-label-large-line-height', '20px');
  root.style.setProperty('--md-sys-typescale-label-large-weight', '500');

  root.style.setProperty('--md-sys-shape-corner-small', '8px');
  root.style.setProperty('--md-sys-shape-corner-medium', '12px');
  root.style.setProperty('--md-sys-shape-corner-large', '16px');
  root.style.setProperty('--md-sys-shape-corner-extra-large', '28px');
  root.style.setProperty('--md-sys-shape-corner-full', '9999px');
}

export { generateScheme, applySchemeToRoot, type M3ColorScheme };
export { DEFAULT_SEED_COLOR };
