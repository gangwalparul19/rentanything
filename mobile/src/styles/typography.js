// Typography styles matching web app
import { Platform } from 'react-native';
import colors from './colors';

export const fonts = {
    regular: Platform.OS === 'ios' ? 'System' : 'Roboto',
    medium: Platform.OS === 'ios' ? 'System' : 'Roboto',
    bold: Platform.OS === 'ios' ? 'System' : 'Roboto',
};

export const fontSizes = {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
};

export const fontWeights = {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
};

export const lineHeights = {
    tight: 1.25,
    normal: 1.5,
    relaxed: 1.75,
};

export const typography = {
    h1: {
        fontSize: fontSizes['4xl'],
        fontWeight: fontWeights.bold,
        color: colors.textPrimary,
        lineHeight: fontSizes['4xl'] * lineHeights.tight,
    },
    h2: {
        fontSize: fontSizes['3xl'],
        fontWeight: fontWeights.bold,
        color: colors.textPrimary,
        lineHeight: fontSizes['3xl'] * lineHeights.tight,
    },
    h3: {
        fontSize: fontSizes['2xl'],
        fontWeight: fontWeights.semibold,
        color: colors.textPrimary,
        lineHeight: fontSizes['2xl'] * lineHeights.tight,
    },
    h4: {
        fontSize: fontSizes.xl,
        fontWeight: fontWeights.semibold,
        color: colors.textPrimary,
        lineHeight: fontSizes.xl * lineHeights.tight,
    },
    body: {
        fontSize: fontSizes.base,
        fontWeight: fontWeights.normal,
        color: colors.textPrimary,
        lineHeight: fontSizes.base * lineHeights.normal,
    },
    bodySmall: {
        fontSize: fontSizes.sm,
        fontWeight: fontWeights.normal,
        color: colors.textSecondary,
        lineHeight: fontSizes.sm * lineHeights.normal,
    },
    caption: {
        fontSize: fontSizes.xs,
        fontWeight: fontWeights.normal,
        color: colors.textMuted,
        lineHeight: fontSizes.xs * lineHeights.normal,
    },
    button: {
        fontSize: fontSizes.base,
        fontWeight: fontWeights.semibold,
        letterSpacing: 0.5,
    },
    link: {
        fontSize: fontSizes.base,
        fontWeight: fontWeights.medium,
        color: colors.primary,
    },
};

export default typography;
