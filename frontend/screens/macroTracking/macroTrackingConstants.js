// Palette, meal metadata and pager constants of the MacroTracking screen.
import theme from '../../theme/mfpDark';
import breakfastIcon from '../../assets/breakfast.png';
import lunchIcon from '../../assets/lunch.png';
import dinnerIcon from '../../assets/dinner.png';
import snacksIcon from '../../assets/snacks.png'

// Unified dark palette (match other screens). Reduce contrast vs. bg.
export const COLORS = {
    bg: theme.bg,
    card: theme.surface,
    text: theme.textPrimary,
    subtext: theme.textSecondary,
    hairline: theme.hairline,
    ringTint: theme.primary,
    ringBg: theme.ringBg,
    ringTrack: theme.ringBg,
    fieldBg: theme.surface,
    accentBlue: theme.primary,
    accent: theme.primary,
    // Macro colors
    protein: '#6c98fcff',
    carbs: '#ff7cb5ff',
    fat: '#FFC874',
};

export const mealsMeta = [
    { name: 'Breakfast', subtitle: 'Breakfast starts your day', icon: breakfastIcon, bgColor: '#FBEDD9' },
    { name: 'Lunch', subtitle: 'Lunch fuels your goals', icon: lunchIcon, bgColor: '#FFE8E9' },
    { name: 'Dinner', subtitle: 'Dinner completes your nutrition', icon: dinnerIcon, bgColor: '#EAEECE' },
    // Snacks bucket (UI shows plural, key also plural for consistency)
    { name: 'Snacks', subtitle: 'Snacks keep you energized', icon: snacksIcon, iconSize: 22, bgColor: '#fed2bcff' },
];

export const TOTAL_PAGES = 100000;
export const BASE_INDEX = Math.floor(TOTAL_PAGES / 2);
