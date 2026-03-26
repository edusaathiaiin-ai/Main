/**
 * lib/saathiThemes.ts — per-saathi colour themes + CSS variable resolver.
 */

export type SaathiThemeVariant = {
  bgPrimary: string;
  bgSecondary: string;
  textPrimary: string;
  textSecondary: string;
  border: string;
};

export type SaathiTheme = {
  bgPrimary: string; bgSecondary: string; bgTertiary: string; bgMessage: string;
  textPrimary: string; textSecondary: string; textMuted: string;
  accent: string; accentText: string; border: string;
  userBubbleBg: string; userBubbleText: string;
  watermarkOpacity: number;
  dark: SaathiThemeVariant;
  light: SaathiThemeVariant;
};

export const SAATHI_THEMES: Record<string, SaathiTheme> = {
  kanoonsaathi: {
    bgPrimary:'oklch(18% 0.02 60)', bgSecondary:'oklch(15% 0.025 60)', bgTertiary:'oklch(20% 0.02 60)', bgMessage:'oklch(22% 0.025 60)',
    textPrimary:'oklch(92% 0.03 80)', textSecondary:'oklch(70% 0.025 75)', textMuted:'oklch(50% 0.02 70)',
    accent:'#C9993A', accentText:'#1a1008', border:'oklch(28% 0.025 65)',
    userBubbleBg:'#8B6914', userBubbleText:'#FFF8E8', watermarkOpacity:0.04,
    dark:{ bgPrimary:'oklch(12% 0.025 60)', bgSecondary:'oklch(10% 0.025 60)', textPrimary:'oklch(92% 0.03 80)', textSecondary:'oklch(65% 0.025 75)', border:'oklch(22% 0.025 65)' },
    light:{ bgPrimary:'oklch(94% 0.015 80)', bgSecondary:'oklch(90% 0.02 78)', textPrimary:'oklch(18% 0.02 60)', textSecondary:'oklch(35% 0.025 65)', border:'oklch(80% 0.02 75)' },
  },
  maathsaathi: {
    bgPrimary:'oklch(18% 0.015 253)', bgSecondary:'oklch(15% 0.015 253)', bgTertiary:'oklch(20% 0.015 253)', bgMessage:'oklch(22% 0.018 253)',
    textPrimary:'oklch(93% 0.01 253)', textSecondary:'oklch(72% 0.015 253)', textMuted:'oklch(52% 0.012 253)',
    accent:'oklch(75% 0.12 253)', accentText:'#0a0f1f', border:'oklch(28% 0.015 253)',
    userBubbleBg:'oklch(45% 0.12 253)', userBubbleText:'oklch(96% 0.005 253)', watermarkOpacity:0.035,
    dark:{ bgPrimary:'oklch(11% 0.015 253)', bgSecondary:'oklch(9% 0.015 253)', textPrimary:'oklch(93% 0.01 253)', textSecondary:'oklch(68% 0.015 253)', border:'oklch(22% 0.015 253)' },
    light:{ bgPrimary:'oklch(96% 0.008 253)', bgSecondary:'oklch(92% 0.012 253)', textPrimary:'oklch(15% 0.015 253)', textSecondary:'oklch(35% 0.015 253)', border:'oklch(82% 0.012 253)' },
  },
  physisaathi: {
    bgPrimary:'oklch(16% 0.018 240)', bgSecondary:'oklch(13% 0.018 240)', bgTertiary:'oklch(18% 0.018 240)', bgMessage:'oklch(20% 0.02 240)',
    textPrimary:'oklch(93% 0.01 240)', textSecondary:'oklch(72% 0.014 240)', textMuted:'oklch(52% 0.012 240)',
    accent:'oklch(70% 0.14 240)', accentText:'#050a1a', border:'oklch(26% 0.018 240)',
    userBubbleBg:'oklch(42% 0.12 240)', userBubbleText:'oklch(97% 0.005 240)', watermarkOpacity:0.035,
    dark:{ bgPrimary:'oklch(10% 0.015 240)', bgSecondary:'oklch(8% 0.015 240)', textPrimary:'oklch(93% 0.01 240)', textSecondary:'oklch(68% 0.014 240)', border:'oklch(20% 0.018 240)' },
    light:{ bgPrimary:'oklch(96% 0.008 235)', bgSecondary:'oklch(92% 0.012 235)', textPrimary:'oklch(13% 0.018 240)', textSecondary:'oklch(33% 0.016 240)', border:'oklch(82% 0.012 238)' },
  },
  biosaathi: {
    bgPrimary:'oklch(16% 0.04 145)', bgSecondary:'oklch(13% 0.04 145)', bgTertiary:'oklch(18% 0.04 145)', bgMessage:'oklch(20% 0.045 145)',
    textPrimary:'oklch(94% 0.02 140)', textSecondary:'oklch(73% 0.03 140)', textMuted:'oklch(53% 0.025 142)',
    accent:'oklch(75% 0.18 145)', accentText:'#051a0a', border:'oklch(26% 0.04 145)',
    userBubbleBg:'oklch(42% 0.15 140)', userBubbleText:'oklch(97% 0.01 140)', watermarkOpacity:0.04,
    dark:{ bgPrimary:'oklch(10% 0.035 145)', bgSecondary:'oklch(8% 0.035 145)', textPrimary:'oklch(94% 0.02 140)', textSecondary:'oklch(68% 0.03 140)', border:'oklch(20% 0.04 145)' },
    light:{ bgPrimary:'oklch(96% 0.02 130)', bgSecondary:'oklch(91% 0.03 130)', textPrimary:'oklch(14% 0.04 145)', textSecondary:'oklch(32% 0.04 142)', border:'oklch(80% 0.03 135)' },
  },
  medicosaathi: {
    bgPrimary:'oklch(16% 0.025 18)', bgSecondary:'oklch(13% 0.025 18)', bgTertiary:'oklch(18% 0.025 18)', bgMessage:'oklch(20% 0.028 18)',
    textPrimary:'oklch(94% 0.01 18)', textSecondary:'oklch(73% 0.018 18)', textMuted:'oklch(53% 0.015 20)',
    accent:'oklch(65% 0.18 18)', accentText:'#1a0505', border:'oklch(26% 0.025 18)',
    userBubbleBg:'oklch(42% 0.16 18)', userBubbleText:'oklch(97% 0.005 18)', watermarkOpacity:0.035,
    dark:{ bgPrimary:'oklch(10% 0.022 18)', bgSecondary:'oklch(8% 0.022 18)', textPrimary:'oklch(94% 0.01 18)', textSecondary:'oklch(68% 0.018 18)', border:'oklch(20% 0.025 18)' },
    light:{ bgPrimary:'oklch(97% 0.012 18)', bgSecondary:'oklch(93% 0.018 18)', textPrimary:'oklch(14% 0.025 18)', textSecondary:'oklch(32% 0.025 18)', border:'oklch(82% 0.018 18)' },
  },
  nursingsaathi: {
    bgPrimary:'oklch(16% 0.025 18)', bgSecondary:'oklch(13% 0.025 18)', bgTertiary:'oklch(18% 0.025 18)', bgMessage:'oklch(20% 0.028 18)',
    textPrimary:'oklch(94% 0.01 18)', textSecondary:'oklch(73% 0.018 18)', textMuted:'oklch(53% 0.015 20)',
    accent:'oklch(68% 0.15 18)', accentText:'#1a0505', border:'oklch(26% 0.025 18)',
    userBubbleBg:'oklch(44% 0.14 18)', userBubbleText:'oklch(97% 0.005 18)', watermarkOpacity:0.035,
    dark:{ bgPrimary:'oklch(10% 0.022 18)', bgSecondary:'oklch(8% 0.022 18)', textPrimary:'oklch(94% 0.01 18)', textSecondary:'oklch(68% 0.018 18)', border:'oklch(20% 0.025 18)' },
    light:{ bgPrimary:'oklch(97% 0.012 18)', bgSecondary:'oklch(93% 0.018 18)', textPrimary:'oklch(14% 0.025 18)', textSecondary:'oklch(32% 0.025 18)', border:'oklch(82% 0.018 18)' },
  },
  psychsaathi: {
    bgPrimary:'oklch(16% 0.022 293)', bgSecondary:'oklch(13% 0.022 293)', bgTertiary:'oklch(18% 0.022 293)', bgMessage:'oklch(20% 0.025 293)',
    textPrimary:'oklch(94% 0.008 293)', textSecondary:'oklch(73% 0.016 293)', textMuted:'oklch(53% 0.014 293)',
    accent:'oklch(72% 0.15 293)', accentText:'#0f0a1f', border:'oklch(26% 0.022 293)',
    userBubbleBg:'oklch(42% 0.13 293)', userBubbleText:'oklch(97% 0.005 293)', watermarkOpacity:0.04,
    dark:{ bgPrimary:'oklch(10% 0.02 293)', bgSecondary:'oklch(8% 0.02 293)', textPrimary:'oklch(94% 0.008 293)', textSecondary:'oklch(68% 0.016 293)', border:'oklch(20% 0.022 293)' },
    light:{ bgPrimary:'oklch(96% 0.012 293)', bgSecondary:'oklch(92% 0.016 293)', textPrimary:'oklch(14% 0.022 293)', textSecondary:'oklch(32% 0.022 293)', border:'oklch(82% 0.016 293)' },
  },
  pharmasaathi: {
    bgPrimary:'oklch(16% 0.04 102)', bgSecondary:'oklch(13% 0.04 102)', bgTertiary:'oklch(18% 0.04 102)', bgMessage:'oklch(20% 0.042 102)',
    textPrimary:'oklch(95% 0.015 100)', textSecondary:'oklch(74% 0.025 100)', textMuted:'oklch(54% 0.02 102)',
    accent:'oklch(80% 0.19 102)', accentText:'#0a1505', border:'oklch(26% 0.04 102)',
    userBubbleBg:'oklch(48% 0.16 102)', userBubbleText:'oklch(97% 0.008 100)', watermarkOpacity:0.04,
    dark:{ bgPrimary:'oklch(10% 0.035 102)', bgSecondary:'oklch(8% 0.035 102)', textPrimary:'oklch(95% 0.015 100)', textSecondary:'oklch(69% 0.025 100)', border:'oklch(20% 0.04 102)' },
    light:{ bgPrimary:'oklch(97% 0.02 100)', bgSecondary:'oklch(93% 0.025 100)', textPrimary:'oklch(14% 0.04 102)', textSecondary:'oklch(30% 0.04 102)', border:'oklch(82% 0.025 102)' },
  },
  compsaathi: {
    bgPrimary:'oklch(12% 0.04 152)', bgSecondary:'oklch(10% 0.04 152)', bgTertiary:'oklch(14% 0.04 152)', bgMessage:'oklch(16% 0.042 152)',
    textPrimary:'oklch(92% 0.06 152)', textSecondary:'oklch(70% 0.05 152)', textMuted:'oklch(50% 0.04 152)',
    accent:'oklch(72% 0.22 152)', accentText:'#010f05', border:'oklch(22% 0.04 152)',
    userBubbleBg:'oklch(38% 0.18 152)', userBubbleText:'oklch(96% 0.04 152)', watermarkOpacity:0.05,
    dark:{ bgPrimary:'oklch(8% 0.035 152)', bgSecondary:'oklch(6% 0.035 152)', textPrimary:'oklch(92% 0.06 152)', textSecondary:'oklch(65% 0.05 152)', border:'oklch(18% 0.04 152)' },
    light:{ bgPrimary:'oklch(96% 0.025 148)', bgSecondary:'oklch(91% 0.03 148)', textPrimary:'oklch(12% 0.04 152)', textSecondary:'oklch(28% 0.04 150)', border:'oklch(80% 0.03 150)' },
  },
  mechsaathi: {
    bgPrimary:'oklch(15% 0.015 200)', bgSecondary:'oklch(12% 0.015 200)', bgTertiary:'oklch(17% 0.015 200)', bgMessage:'oklch(19% 0.018 200)',
    textPrimary:'oklch(93% 0.01 200)', textSecondary:'oklch(72% 0.014 200)', textMuted:'oklch(52% 0.012 200)',
    accent:'oklch(68% 0.12 200)', accentText:'#030f12', border:'oklch(25% 0.015 200)',
    userBubbleBg:'oklch(40% 0.1 200)', userBubbleText:'oklch(97% 0.005 200)', watermarkOpacity:0.035,
    dark:{ bgPrimary:'oklch(9% 0.014 200)', bgSecondary:'oklch(7% 0.014 200)', textPrimary:'oklch(93% 0.01 200)', textSecondary:'oklch(67% 0.014 200)', border:'oklch(19% 0.015 200)' },
    light:{ bgPrimary:'oklch(96% 0.008 200)', bgSecondary:'oklch(92% 0.01 200)', textPrimary:'oklch(13% 0.015 200)', textSecondary:'oklch(31% 0.014 200)', border:'oklch(82% 0.01 200)' },
  },
  civilsaathi: {
    bgPrimary:'oklch(16% 0.015 55)', bgSecondary:'oklch(13% 0.015 55)', bgTertiary:'oklch(18% 0.015 55)', bgMessage:'oklch(20% 0.018 55)',
    textPrimary:'oklch(93% 0.01 55)', textSecondary:'oklch(72% 0.012 55)', textMuted:'oklch(52% 0.01 55)',
    accent:'#C9993A', accentText:'#1a1008', border:'oklch(26% 0.015 55)',
    userBubbleBg:'#8B6914', userBubbleText:'#FFF8E8', watermarkOpacity:0.035,
    dark:{ bgPrimary:'oklch(10% 0.013 55)', bgSecondary:'oklch(8% 0.013 55)', textPrimary:'oklch(93% 0.01 55)', textSecondary:'oklch(67% 0.012 55)', border:'oklch(20% 0.015 55)' },
    light:{ bgPrimary:'oklch(95% 0.008 55)', bgSecondary:'oklch(91% 0.012 55)', textPrimary:'oklch(14% 0.015 55)', textSecondary:'oklch(32% 0.014 55)', border:'oklch(81% 0.01 55)' },
  },
  elecsaathi: {
    bgPrimary:'oklch(15% 0.025 220)', bgSecondary:'oklch(12% 0.025 220)', bgTertiary:'oklch(17% 0.025 220)', bgMessage:'oklch(19% 0.028 220)',
    textPrimary:'oklch(93% 0.012 220)', textSecondary:'oklch(72% 0.018 220)', textMuted:'oklch(52% 0.015 220)',
    accent:'oklch(70% 0.16 220)', accentText:'#030a18', border:'oklch(25% 0.025 220)',
    userBubbleBg:'oklch(40% 0.14 220)', userBubbleText:'oklch(97% 0.005 220)', watermarkOpacity:0.04,
    dark:{ bgPrimary:'oklch(9% 0.022 220)', bgSecondary:'oklch(7% 0.022 220)', textPrimary:'oklch(93% 0.012 220)', textSecondary:'oklch(67% 0.018 220)', border:'oklch(19% 0.025 220)' },
    light:{ bgPrimary:'oklch(96% 0.01 215)', bgSecondary:'oklch(92% 0.014 215)', textPrimary:'oklch(13% 0.025 220)', textSecondary:'oklch(30% 0.022 220)', border:'oklch(82% 0.014 218)' },
  },
  biotechsaathi: {
    bgPrimary:'oklch(16% 0.04 160)', bgSecondary:'oklch(13% 0.04 160)', bgTertiary:'oklch(18% 0.04 160)', bgMessage:'oklch(20% 0.042 160)',
    textPrimary:'oklch(94% 0.018 155)', textSecondary:'oklch(73% 0.028 155)', textMuted:'oklch(53% 0.022 158)',
    accent:'oklch(74% 0.2 160)', accentText:'#021508', border:'oklch(26% 0.04 160)',
    userBubbleBg:'oklch(43% 0.16 158)', userBubbleText:'oklch(97% 0.01 155)', watermarkOpacity:0.04,
    dark:{ bgPrimary:'oklch(10% 0.035 160)', bgSecondary:'oklch(8% 0.035 160)', textPrimary:'oklch(94% 0.018 155)', textSecondary:'oklch(68% 0.028 155)', border:'oklch(20% 0.04 160)' },
    light:{ bgPrimary:'oklch(96% 0.018 155)', bgSecondary:'oklch(91% 0.025 155)', textPrimary:'oklch(13% 0.04 160)', textSecondary:'oklch(30% 0.038 158)', border:'oklch(80% 0.028 157)' },
  },
  envirosaathi: {
    bgPrimary:'oklch(15% 0.05 120)', bgSecondary:'oklch(12% 0.05 120)', bgTertiary:'oklch(17% 0.05 120)', bgMessage:'oklch(19% 0.052 120)',
    textPrimary:'oklch(94% 0.02 115)', textSecondary:'oklch(73% 0.03 115)', textMuted:'oklch(53% 0.025 118)',
    accent:'oklch(76% 0.2 120)', accentText:'#051200', border:'oklch(25% 0.05 120)',
    userBubbleBg:'oklch(43% 0.17 118)', userBubbleText:'oklch(97% 0.01 115)', watermarkOpacity:0.04,
    dark:{ bgPrimary:'oklch(9% 0.045 120)', bgSecondary:'oklch(7% 0.045 120)', textPrimary:'oklch(94% 0.02 115)', textSecondary:'oklch(68% 0.03 115)', border:'oklch(19% 0.05 120)' },
    light:{ bgPrimary:'oklch(96% 0.025 110)', bgSecondary:'oklch(91% 0.03 110)', textPrimary:'oklch(13% 0.05 120)', textSecondary:'oklch(28% 0.048 118)', border:'oklch(80% 0.032 115)' },
  },
  aerosaathi: {
    bgPrimary:'oklch(15% 0.025 215)', bgSecondary:'oklch(12% 0.025 215)', bgTertiary:'oklch(17% 0.025 215)', bgMessage:'oklch(19% 0.028 215)',
    textPrimary:'oklch(93% 0.012 215)', textSecondary:'oklch(72% 0.018 215)', textMuted:'oklch(52% 0.015 215)',
    accent:'oklch(68% 0.16 215)', accentText:'#02080f', border:'oklch(25% 0.025 215)',
    userBubbleBg:'oklch(40% 0.14 215)', userBubbleText:'oklch(97% 0.005 215)', watermarkOpacity:0.035,
    dark:{ bgPrimary:'oklch(9% 0.022 215)', bgSecondary:'oklch(7% 0.022 215)', textPrimary:'oklch(93% 0.012 215)', textSecondary:'oklch(67% 0.018 215)', border:'oklch(19% 0.025 215)' },
    light:{ bgPrimary:'oklch(96% 0.01 210)', bgSecondary:'oklch(92% 0.014 210)', textPrimary:'oklch(13% 0.025 215)', textSecondary:'oklch(30% 0.022 215)', border:'oklch(82% 0.015 213)' },
  },
  aerospacesaathi: {
    bgPrimary:'oklch(13% 0.02 255)', bgSecondary:'oklch(10% 0.02 255)', bgTertiary:'oklch(15% 0.02 255)', bgMessage:'oklch(17% 0.022 255)',
    textPrimary:'oklch(93% 0.01 255)', textSecondary:'oklch(72% 0.016 255)', textMuted:'oklch(52% 0.013 255)',
    accent:'oklch(70% 0.14 255)', accentText:'#030510', border:'oklch(23% 0.02 255)',
    userBubbleBg:'oklch(40% 0.12 255)', userBubbleText:'oklch(97% 0.005 255)', watermarkOpacity:0.04,
    dark:{ bgPrimary:'oklch(8% 0.018 255)', bgSecondary:'oklch(6% 0.018 255)', textPrimary:'oklch(93% 0.01 255)', textSecondary:'oklch(67% 0.016 255)', border:'oklch(17% 0.02 255)' },
    light:{ bgPrimary:'oklch(96% 0.008 250)', bgSecondary:'oklch(92% 0.012 250)', textPrimary:'oklch(12% 0.02 255)', textSecondary:'oklch(30% 0.018 255)', border:'oklch(82% 0.012 253)' },
  },
  econsaathi: {
    bgPrimary:'oklch(15% 0.02 170)', bgSecondary:'oklch(12% 0.02 170)', bgTertiary:'oklch(17% 0.02 170)', bgMessage:'oklch(19% 0.022 170)',
    textPrimary:'oklch(93% 0.01 170)', textSecondary:'oklch(72% 0.015 170)', textMuted:'oklch(52% 0.012 170)',
    accent:'oklch(70% 0.15 170)', accentText:'#030f08', border:'oklch(25% 0.02 170)',
    userBubbleBg:'oklch(40% 0.13 168)', userBubbleText:'oklch(97% 0.005 170)', watermarkOpacity:0.035,
    dark:{ bgPrimary:'oklch(9% 0.018 170)', bgSecondary:'oklch(7% 0.018 170)', textPrimary:'oklch(93% 0.01 170)', textSecondary:'oklch(67% 0.015 170)', border:'oklch(19% 0.02 170)' },
    light:{ bgPrimary:'oklch(96% 0.01 165)', bgSecondary:'oklch(92% 0.014 165)', textPrimary:'oklch(13% 0.02 170)', textSecondary:'oklch(30% 0.018 170)', border:'oklch(82% 0.013 168)' },
  },
  finsaathi: {
    bgPrimary:'oklch(14% 0.02 245)', bgSecondary:'oklch(11% 0.02 245)', bgTertiary:'oklch(16% 0.02 245)', bgMessage:'oklch(18% 0.022 245)',
    textPrimary:'oklch(93% 0.012 245)', textSecondary:'oklch(72% 0.018 245)', textMuted:'oklch(52% 0.015 245)',
    accent:'#C9993A', accentText:'#0a0d1f', border:'oklch(24% 0.022 245)',
    userBubbleBg:'#7a5e20', userBubbleText:'oklch(96% 0.01 80)', watermarkOpacity:0.04,
    dark:{ bgPrimary:'oklch(9% 0.018 245)', bgSecondary:'oklch(7% 0.018 245)', textPrimary:'oklch(93% 0.012 245)', textSecondary:'oklch(67% 0.018 245)', border:'oklch(19% 0.022 245)' },
    light:{ bgPrimary:'oklch(96% 0.01 240)', bgSecondary:'oklch(92% 0.014 240)', textPrimary:'oklch(12% 0.02 245)', textSecondary:'oklch(30% 0.02 245)', border:'oklch(82% 0.015 242)' },
  },
  archsaathi: {
    bgPrimary:'oklch(16% 0.015 45)', bgSecondary:'oklch(13% 0.015 45)', bgTertiary:'oklch(18% 0.015 45)', bgMessage:'oklch(20% 0.018 45)',
    textPrimary:'oklch(93% 0.01 45)', textSecondary:'oklch(72% 0.012 45)', textMuted:'oklch(52% 0.01 45)',
    accent:'#C9993A', accentText:'#1a0f00', border:'oklch(26% 0.015 45)',
    userBubbleBg:'#9a7520', userBubbleText:'#FFF8E8', watermarkOpacity:0.035,
    dark:{ bgPrimary:'oklch(10% 0.013 45)', bgSecondary:'oklch(8% 0.013 45)', textPrimary:'oklch(93% 0.01 45)', textSecondary:'oklch(67% 0.012 45)', border:'oklch(20% 0.015 45)' },
    light:{ bgPrimary:'oklch(95% 0.008 45)', bgSecondary:'oklch(91% 0.012 45)', textPrimary:'oklch(14% 0.015 45)', textSecondary:'oklch(32% 0.014 45)', border:'oklch(81% 0.01 45)' },
  },
  chemenggsaathi: {
    bgPrimary:'oklch(16% 0.04 50)', bgSecondary:'oklch(13% 0.04 50)', bgTertiary:'oklch(18% 0.04 50)', bgMessage:'oklch(20% 0.042 50)',
    textPrimary:'oklch(94% 0.015 50)', textSecondary:'oklch(73% 0.025 50)', textMuted:'oklch(53% 0.02 50)',
    accent:'oklch(75% 0.18 50)', accentText:'#1a0a00', border:'oklch(26% 0.04 50)',
    userBubbleBg:'oklch(46% 0.15 50)', userBubbleText:'oklch(97% 0.008 50)', watermarkOpacity:0.04,
    dark:{ bgPrimary:'oklch(10% 0.035 50)', bgSecondary:'oklch(8% 0.035 50)', textPrimary:'oklch(94% 0.015 50)', textSecondary:'oklch(68% 0.025 50)', border:'oklch(20% 0.04 50)' },
    light:{ bgPrimary:'oklch(96% 0.018 50)', bgSecondary:'oklch(92% 0.022 50)', textPrimary:'oklch(14% 0.04 50)', textSecondary:'oklch(30% 0.038 50)', border:'oklch(82% 0.022 50)' },
  },
  default: {
    bgPrimary:'#0B1F3A', bgSecondary:'#060F1D', bgTertiary:'#0F2847', bgMessage:'#0F2847',
    textPrimary:'#ffffff', textSecondary:'rgba(255,255,255,0.6)', textMuted:'rgba(255,255,255,0.35)',
    accent:'#C9993A', accentText:'#0B1F3A', border:'rgba(255,255,255,0.08)',
    userBubbleBg:'#C9993A', userBubbleText:'#0B1F3A', watermarkOpacity:0.03,
    dark:{ bgPrimary:'#060F1D', bgSecondary:'#040810', textPrimary:'#ffffff', textSecondary:'rgba(255,255,255,0.55)', border:'rgba(255,255,255,0.07)' },
    light:{ bgPrimary:'#F0F4F8', bgSecondary:'#E4EAF2', textPrimary:'#0B1F3A', textSecondary:'rgba(11,31,58,0.6)', border:'rgba(11,31,58,0.1)' },
  },
};

/** Returns CSS custom properties to apply as inline styles on the root chat div. */
export function getSaathiTheme(slug: string, mode: 'dark' | 'light'): Record<string, string> {
  const base = SAATHI_THEMES[slug] ?? SAATHI_THEMES.default;
  const v = mode === 'light' ? base.light : base.dark;
  return {
    '--bg-primary':       v.bgPrimary   ?? base.bgPrimary,
    '--bg-secondary':     v.bgSecondary ?? base.bgSecondary,
    '--bg-tertiary':      base.bgTertiary,
    '--bg-message':       base.bgMessage,
    '--text-primary':     v.textPrimary   ?? base.textPrimary,
    '--text-secondary':   v.textSecondary ?? base.textSecondary,
    '--text-muted':       base.textMuted,
    '--accent':           base.accent,
    '--accent-text':      base.accentText,
    '--border':           v.border ?? base.border,
    '--user-bubble-bg':   base.userBubbleBg,
    '--user-bubble-text': base.userBubbleText,
    '--watermark-opacity':String(base.watermarkOpacity),
  };
}
