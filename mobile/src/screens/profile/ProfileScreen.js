// Profile Screen - User profile and settings
import React from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Image,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import colors from '../../styles/colors';
import { spacing, borderRadius, shadows } from '../../styles/common';

const ProfileScreen = ({ navigation }) => {
    const { user, userProfile, signOut } = useAuth();

    const handleSignOut = () => {
        Alert.alert(
            'Sign Out',
            'Are you sure you want to sign out?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Sign Out', style: 'destructive', onPress: () => signOut() },
            ]
        );
    };

    const menuItems = [
        {
            icon: 'cube-outline',
            label: 'My Listings',
            onPress: () => navigation.navigate('MyListings'),
        },
        {
            icon: 'calendar-outline',
            label: 'My Bookings',
            onPress: () => navigation.navigate('MyBookings'),
        },
        {
            icon: 'heart-outline',
            label: 'Wishlist',
            onPress: () => navigation.navigate('Wishlist'),
        },
        {
            icon: 'business-outline',
            label: 'My Properties',
            onPress: () => navigation.navigate('MyProperties'),
        },
    ];

    const settingsItems = [
        {
            icon: 'notifications-outline',
            label: 'Notifications',
            onPress: () => { },
        },
        {
            icon: 'shield-checkmark-outline',
            label: 'Privacy & Security',
            onPress: () => { },
        },
        {
            icon: 'help-circle-outline',
            label: 'Help Center',
            onPress: () => { },
        },
        {
            icon: 'document-text-outline',
            label: 'Terms of Service',
            onPress: () => { },
        },
        {
            icon: 'information-circle-outline',
            label: 'About',
            onPress: () => { },
        },
    ];

    const renderMenuItem = (item, index) => (
        <TouchableOpacity
            key={index}
            style={styles.menuItem}
            onPress={item.onPress}
        >
            <View style={styles.menuItemLeft}>
                <View style={styles.menuIconContainer}>
                    <Ionicons name={item.icon} size={22} color={colors.primary} />
                </View>
                <Text style={styles.menuItemLabel}>{item.label}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.grayLight} />
        </TouchableOpacity>
    );

    return (
        <ScrollView style={styles.container}>
            {/* Profile Header */}
            <View style={styles.header}>
                <View style={styles.profileSection}>
                    {user?.photoURL ? (
                        <Image source={{ uri: user.photoURL }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarText}>
                                {userProfile?.name?.charAt(0) || user?.email?.charAt(0) || '?'}
                            </Text>
                        </View>
                    )}
                    <View style={styles.userInfo}>
                        <Text style={styles.userName}>
                            {userProfile?.name || user?.displayName || 'User'}
                        </Text>
                        <Text style={styles.userEmail}>{user?.email}</Text>
                        {userProfile?.society && (
                            <View style={styles.locationRow}>
                                <Ionicons name="location" size={14} color={colors.primary} />
                                <Text style={styles.locationText}>{userProfile.society}</Text>
                            </View>
                        )}
                    </View>
                </View>
                <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => navigation.navigate('EditProfile')}
                >
                    <Ionicons name="pencil" size={18} color={colors.primary} />
                </TouchableOpacity>
            </View>

            {/* Stats */}
            <View style={styles.statsContainer}>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{userProfile?.listingsCount || 0}</Text>
                    <Text style={styles.statLabel}>Listings</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{userProfile?.rentalsCount || 0}</Text>
                    <Text style={styles.statLabel}>Rentals</Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{userProfile?.rating?.toFixed(1) || '5.0'}</Text>
                    <Text style={styles.statLabel}>Rating</Text>
                </View>
            </View>

            {/* Create Listing Button */}
            <TouchableOpacity
                style={styles.createButton}
                onPress={() => navigation.navigate('CreateListing')}
            >
                <Ionicons name="add-circle" size={22} color={colors.white} />
                <Text style={styles.createButtonText}>Create New Listing</Text>
            </TouchableOpacity>

            {/* Menu Items */}
            <View style={styles.menuSection}>
                <Text style={styles.sectionTitle}>My Activity</Text>
                <View style={styles.menuCard}>
                    {menuItems.map(renderMenuItem)}
                </View>
            </View>

            <View style={styles.menuSection}>
                <Text style={styles.sectionTitle}>Settings</Text>
                <View style={styles.menuCard}>
                    {settingsItems.map(renderMenuItem)}
                </View>
            </View>

            {/* Sign Out */}
            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
                <Ionicons name="log-out-outline" size={22} color={colors.error} />
                <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>

            {/* Version */}
            <Text style={styles.version}>Version 1.0.0</Text>

            <View style={{ height: spacing.xl }} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        backgroundColor: colors.white,
        padding: spacing.lg,
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: colors.grayLighter,
    },
    profileSection: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    avatar: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: colors.grayLighter,
    },
    avatarPlaceholder: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: colors.primary + '20',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 28,
        fontWeight: '600',
        color: colors.primary,
    },
    userInfo: {
        marginLeft: spacing.md,
        flex: 1,
    },
    userName: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 2,
    },
    userEmail: {
        fontSize: 14,
        color: colors.gray,
        marginBottom: 4,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    locationText: {
        fontSize: 13,
        color: colors.primary,
        fontWeight: '500',
    },
    editButton: {
        padding: spacing.sm,
        borderRadius: borderRadius.md,
        backgroundColor: colors.primary + '10',
    },
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: colors.white,
        paddingVertical: spacing.md,
        marginTop: spacing.sm,
        marginHorizontal: spacing.md,
        borderRadius: borderRadius.lg,
        ...shadows.sm,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.primary,
    },
    statLabel: {
        fontSize: 12,
        color: colors.gray,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: '70%',
        backgroundColor: colors.grayLighter,
        alignSelf: 'center',
    },
    createButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.primary,
        marginHorizontal: spacing.md,
        marginTop: spacing.md,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        gap: spacing.sm,
        ...shadows.md,
    },
    createButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.white,
    },
    menuSection: {
        marginTop: spacing.lg,
        paddingHorizontal: spacing.md,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.gray,
        marginBottom: spacing.sm,
        marginLeft: spacing.xs,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    menuCard: {
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        ...shadows.sm,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: colors.grayLightest,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    menuIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.primary + '10',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.md,
    },
    menuItemLabel: {
        fontSize: 15,
        fontWeight: '500',
        color: colors.textPrimary,
    },
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: spacing.md,
        marginTop: spacing.lg,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.lg,
        backgroundColor: colors.error + '10',
        gap: spacing.sm,
    },
    signOutText: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.error,
    },
    version: {
        textAlign: 'center',
        color: colors.grayLight,
        fontSize: 12,
        marginTop: spacing.lg,
    },
});

export default ProfileScreen;
