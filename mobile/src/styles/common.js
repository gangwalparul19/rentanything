// Common styles used across the app
import { StyleSheet, Platform } from 'react-native';
import colors from './colors';

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    '2xl': 48,
};

export const borderRadius = {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    full: 9999,
};

export const shadows = {
    sm: Platform.select({
        ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.05,
            shadowRadius: 2,
        },
        android: {
            elevation: 1,
        },
    }),
    md: Platform.select({
        ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
        },
        android: {
            elevation: 3,
        },
    }),
    lg: Platform.select({
        ios: {
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 8,
        },
        android: {
            elevation: 6,
        },
    }),
};

export const commonStyles = StyleSheet.create({
    // Layout
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    screenContainer: {
        flex: 1,
        backgroundColor: colors.background,
        paddingHorizontal: spacing.md,
    },
    centered: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    spaceBetween: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },

    // Cards
    card: {
        backgroundColor: colors.card,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        ...shadows.md,
    },
    cardBordered: {
        backgroundColor: colors.card,
        borderRadius: borderRadius.lg,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.cardBorder,
    },

    // Inputs
    input: {
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.grayLighter,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm + 4,
        fontSize: 16,
        color: colors.textPrimary,
    },
    inputFocused: {
        borderColor: colors.primary,
        borderWidth: 2,
    },

    // Buttons
    buttonPrimary: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm + 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonSecondary: {
        backgroundColor: colors.white,
        borderWidth: 1,
        borderColor: colors.primary,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm + 4,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonText: {
        color: colors.white,
        fontSize: 16,
        fontWeight: '600',
    },
    buttonTextSecondary: {
        color: colors.primary,
        fontSize: 16,
        fontWeight: '600',
    },

    // Badges
    badge: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.sm,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
    },
    badgeText: {
        color: colors.white,
        fontSize: 12,
        fontWeight: '600',
    },

    // Divider
    divider: {
        height: 1,
        backgroundColor: colors.grayLighter,
        marginVertical: spacing.md,
    },

    // Avatar
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.grayLighter,
    },
    avatarLarge: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.grayLighter,
    },
});

export default commonStyles;
