export const PATTERN_PALETTE = {
  baseBg: '#0B3D2E',
  surfaceBg: '#0D2B20',
  heroBg: '#123B2F',
  linePrimary: '#C9A84C',
  lineSecondary: '#D6B690',
  lineMuted: '#295B45',
  parchment: '#F5F0E8',
  accentTerracotta: '#B96A39',
} as const;

export const PATTERN_OPACITY = {
  headerMedallion: 0.1,
  headerVeil: 0.08,
  heroAccent: 0.12,
  cardAccent: 0.06,
  dividerAccent: 0.18,
} as const;

export const PATTERN_PLACEMENT = {
  homeHeader: {
    medallion: true,
    vegetalVeil: true,
    fullWallpaper: false,
  },
  onboardingHeader: {
    medallion: true,
    vegetalVeil: true,
    fullWallpaper: false,
  },
  progressCard: {
    medallion: false,
    vegetalVeil: false,
    accentOnly: true,
  },
  quickActionCard: {
    medallion: false,
    vegetalVeil: false,
    accentOnly: true,
  },
  history: {
    medallion: false,
    vegetalVeil: false,
    accentOnly: true,
  },
  answers: {
    medallion: false,
    vegetalVeil: false,
    accentOnly: true,
  },
  settings: {
    medallion: false,
    vegetalVeil: false,
    accentOnly: false,
  },
} as const;

export const PATTERN_MOTIFS = {
  primary: 'faded-medallion',
  secondary: 'vegetal-mosaic-veil',
  accent: 'jewelled-rosette-divider',
} as const;

export const PATTERN_RULES = [
  'Keep ornament in header and hero zones only.',
  'Do not place dense patterns behind stats, prayer rows, or calendar cells.',
  'Use almost monochrome motif treatment at first glance.',
  'Reserve bright gold for highlights, not large fills.',
  'Use terracotta only as a tiny supporting accent.',
  'Prefer cropped motifs over full repeated wallpaper.',
  'Avoid animated wallpaper and dense tiled backgrounds.',
] as const;

export type PatternPlacementKey = keyof typeof PATTERN_PLACEMENT;
