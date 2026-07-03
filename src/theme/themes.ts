export interface ThemePreset {
  name: string;
  seedColor: string;
  dark: boolean;
}

export const defaultLight: ThemePreset = {
  name: 'Default Light',
  seedColor: '#6750A4',
  dark: false,
};

export const defaultDark: ThemePreset = {
  name: 'Default Dark',
  seedColor: '#6750A4',
  dark: true,
};

export const presets: ThemePreset[] = [
  { name: 'M3 Purple', seedColor: '#6750A4', dark: false },
  { name: 'M3 Purple Dark', seedColor: '#6750A4', dark: true },
  { name: 'Teal', seedColor: '#006B5E', dark: false },
  { name: 'Teal Dark', seedColor: '#006B5E', dark: true },
  { name: 'Blue', seedColor: '#0061A4', dark: false },
  { name: 'Blue Dark', seedColor: '#0061A4', dark: true },
  { name: 'Red', seedColor: '#BA1A1A', dark: false },
  { name: 'Red Dark', seedColor: '#BA1A1A', dark: true },
  { name: 'Green', seedColor: '#386A20', dark: false },
  { name: 'Green Dark', seedColor: '#386A20', dark: true },
  { name: 'Orange', seedColor: '#8B5000', dark: false },
  { name: 'Orange Dark', seedColor: '#8B5000', dark: true },
  { name: 'Pink', seedColor: '#984061', dark: false },
  { name: 'Pink Dark', seedColor: '#984061', dark: true },
];
