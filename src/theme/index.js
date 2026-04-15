export const colors = {
  bg:          '#F7F3EE',
  bgCard:      '#FFFFFF',
  bgDark:      '#1C2330',
  gold:        '#C8952A',
  goldLight:   '#F0D080',
  goldMuted:   '#E8C96A',
  inkDark:     '#1C2330',
  inkMid:      '#4A5568',
  inkLight:    '#A0AEC0',

  // Richer category colors
  faith:             '#6B5B9E',  // Deep purple
  health:            '#2E8B57',  // Rich green
  finances:          '#C8952A',  // Gold
  relationships:     '#C0392B',  // Rich red
  family:            '#2471A3',  // Deep blue
  work:              '#27AE60',  // Emerald
  'answered-prayer': '#8B6914',  // Deep amber
  other:             '#607D8B',  // Blue grey

  // Category background tints
  faithBg:             '#F0EDF8',
  healthBg:            '#EAF5EE',
  financesBg:          '#FDF5E6',
  relationshipsBg:     '#FDECEA',
  familyBg:            '#EAF2FB',
  workBg:              '#EAFAF1',
  'answered-prayerBg': '#FDF0DC',
  otherBg:             '#ECEFF1',

  border:      '#E8E0D4',
  prayGlow:    '#FFF3CD',
  error:       '#E53E3E',
  success:     '#38A169',
};

export const fonts = {
  heading:  'Lora_700Bold',
  body:     'Lora_400Regular',
  ui:       'DMSans_400Regular',
  uiBold:   'DMSans_700Bold',
  caption:  'DMSans_400Regular',
};

export const type = {
  displaySize:   32,
  displayFont:   'Lora_700Bold',
  displayLine:   1.2,
  titleSize:     20,
  titleFont:     'Lora_700Bold',
  titleLine:     1.3,
  bodySize:      16,
  bodyFont:      'Lora_400Regular',
  bodyLine:      1.7,
  uiSize:        14,
  uiFont:        'DMSans_400Regular',
  uiBoldFont:    'DMSans_700Bold',
  uiLine:        1.4,
  captionSize:   12,
  captionFont:   'DMSans_400Regular',
  captionLine:   1.4,
  microSize:     11,
  microFont:     'DMSans_400Regular',
};

export const spacing = {
  xs:   4,
  sm:   8,
  md:   16,
  lg:   24,
  xl:   32,
  xxl:  48,
  xxxl: 64,
};

export const radius = {
  sm:   8,
  md:   14,
  lg:   20,
  full: 999,
};

export const shadow = {
  card: {
    shadowColor:   '#1C2330',
    shadowOffset:  { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius:  8,
    elevation:     3,
  },
  gold: {
    shadowColor:   '#C8952A',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius:  12,
    elevation:     6,
  },
};

export const CATEGORY_LABELS = {
  'faith':           '✦ Faith',
  'health':          '❤ Health',
  'finances':        '$ Finances',
  'relationships':   '⚭ Relationships',
  'family':          '⌂ Family',
  'work':            '⚙ Work',
  'answered-prayer': '🙏 Answered Prayer',
  'other':           '· Other',
};

// Helper to get category background tint
export function getCategoryBg(category) {
  const map = {
    'faith':           colors.faithBg,
    'health':          colors.healthBg,
    'finances':        colors.financesBg,
    'relationships':   colors.relationshipsBg,
    'family':          colors.familyBg,
    'work':            colors.workBg,
    'answered-prayer': colors['answered-prayerBg'],
    'other':           colors.otherBg,
  };
  return map[category] || colors.bgCard;
}