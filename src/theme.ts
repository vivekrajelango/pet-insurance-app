import type { ThemeConfig } from 'antd';

/**
 * Brand values from the petzadore.com theme (see the wireframes canvas).
 * The same values are CSS variables in styles/app.css for non-Ant elements.
 */
export const brand = {
  red: '#C8102E',
  redDark: '#9E0B24',
  redTint: '#FCE8EC',
  page: '#F4F2F8',
  ink: '#1F1D24',
  muted: '#5A5866',
  border: '#E6E3EC',
  warnBg: '#FFF6EC',
  warnBorder: '#E8B27A',
  font: "Ubuntu, 'Segoe UI', system-ui, -apple-system, sans-serif",
} as const;

export const theme: ThemeConfig = {
  token: {
    colorPrimary: brand.red,
    colorLink: brand.red,
    colorLinkHover: brand.redDark,
    colorText: brand.ink,
    colorTextSecondary: brand.muted,
    colorBorder: '#C4C1CC',
    colorBorderSecondary: brand.border,
    colorBgLayout: brand.page,
    fontFamily: brand.font,
    fontSize: 15,
    borderRadius: 10,
    borderRadiusLG: 16,
    controlHeight: 44,
    controlHeightLG: 52,
  },
  components: {
    Button: { fontWeight: 700, primaryShadow: 'none', defaultShadow: 'none' },
    Card: { borderRadiusLG: 16 },
    Steps: { iconSize: 28 },
  },
};
