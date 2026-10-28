// Theme palettes — E-Learning App (shared file, owner: Hieu)
// Two palettes with IDENTICAL keys: screens always read colors from
// SettingsContext (useSettings().colors), never import a palette directly,
// so switching light/dark re-renders the whole app consistently.
export interface Palette {
  primary: string;
  primaryDark: string;
  banner: string;
  background: string;
  surface: string;
  border: string;
  text: string;
  textSecondary: string;
  star: string;
  price: string;
  danger: string;
  onPrimary: string;
}

export const lightColors: Palette = {
  primary: '#00BCD4', // teal accent used across the mockups (buttons, active tabs)
  primaryDark: '#0097A7',
  banner: '#7C4DFF', // purple promo banner
  background: '#FFFFFF',
  surface: '#F7F7F9',
  border: '#E6E6EA',
  text: '#1B1B1F',
  textSecondary: '#7A7A85',
  star: '#FFB800',
  price: '#00A8C5',
  danger: '#E53935',
  onPrimary: '#FFFFFF',
};

export const darkColors: Palette = {
  primary: '#26C6DA',
  primaryDark: '#4DD0E1',
  banner: '#7C4DFF',
  background: '#121216',
  surface: '#1E1E24',
  border: '#33333D',
  text: '#F2F2F5',
  textSecondary: '#A0A0AB',
  star: '#FFB800',
  price: '#26C6DA',
  danger: '#EF5350',
  onPrimary: '#FFFFFF',
};

export type ColorScheme = 'light' | 'dark';
