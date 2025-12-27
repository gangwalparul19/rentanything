// Home Screen - Main landing page with categories and featured listings
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    RefreshControl,
    Image,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import colors from '../../styles/colors';
import { spacing, borderRadius, shadows } from '../../styles/common';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - spacing.lg * 2 - spacing.md) / 2;

// Category definitions
const CATEGORIES = [
    { name: 'Party Essentials', icon: 'wine', slug: 'party', color: '#F59E0B' },
    { name: 'Kids & Baby', icon: 'body', slug: 'baby', color: '#EC4899' },
    { name: 'Electronics', icon: 'laptop', slug: 'electronics', color: '#3B82F6' },
    { name: 'Home & Garden', icon: 'home', slug: 'home-decor', color: '#22C55E' },
    { name: 'Sports', icon: 'football', slug: 'sports', color: '#8B5CF6' },
    { name: 'Photography', icon: 'camera', slug: 'photography', color: '#EF4444' },
    { name: 'Books', icon: 'book', slug: 'books', color: '#06B6D4' },
    { name: 'Other', icon: 'cube', slug: 'other', color: '#64748B' },
];

const HomeScreen = ({ navigation }) => {
    const { user, userProfile } = useAuth();
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchListings = async () => {
        try {
            const q = query(
                collection(db, 'listings'),
                where('status', '==', 'active'),
                orderBy('createdAt', 'desc'),
                limit(6)
            );
            const snapshot = await getDocs(q);
            const items = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));
            setListings(items);
        } catch (error) {
            console.error('Error fetching listings:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchListings();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchListings();
    };

    const renderCategory = ({ item }) => (
        <TouchableOpacity
            style={[styles.categoryCard, { backgroundColor: item.color + '15' }]}
            onPress={() => navigation.navigate('Search', { category: item.slug })}
        >
            <View style={[styles.categoryIcon, { backgroundColor: item.color + '25' }]}>
                <Ionicons name={item.icon} size={24} color={item.color} />
            </View>
            <Text style={styles.categoryName} numberOfLines={2}>{item.name}</Text>
        </TouchableOpacity>
    );

    const renderListing = ({ item }) => (
        <TouchableOpacity
            style={styles.listingCard}
            onPress={() => navigation.navigate('ListingDetails', { listingId: item.id })}
        >
            <Image
                source={{ uri: item.images?.[0] || 'https://via.placeholder.com/200' }}
                style={styles.listingImage}
            />
            <View style={styles.listingInfo}>
                <Text style={styles.listingTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.listingPrice}>₹{item.pricePerDay}/day</Text>
                <View style={styles.listingMeta}>
                    <Ionicons name="location-outline" size={12} color={colors.gray} />
                    <Text style={styles.listingLocation} numberOfLines={1}>
                        {item.location || 'Megapolis'}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <ScrollView
            style={styles.container}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
            }
        >
            {/* Hero Section */}
            <View style={styles.hero}>
                <Text style={styles.heroTitle}>Don't Buy. <Text style={styles.heroHighlight}>Just Rent.</Text></Text>
                <Text style={styles.heroSubtitle}>
                    The trusted rental marketplace for Hinjewadi Phase 3
                </Text>

                {/* Quick Actions */}
                <View style={styles.quickActions}>
                    <TouchableOpacity
                        style={styles.quickActionBtn}
                        onPress={() => navigation.navigate('Search')}
                    >
                        <Ionicons name="cube-outline" size={20} color={colors.white} />
                        <Text style={styles.quickActionText}>Browse Items</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.quickActionBtn, styles.quickActionSecondary]}
                        onPress={() => navigation.navigate('Properties')}
                    >
                        <Ionicons name="business-outline" size={20} color={colors.primary} />
                        <Text style={[styles.quickActionText, { color: colors.primary }]}>Properties</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Categories */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Browse Categories</Text>
                <FlatList
                    horizontal
                    data={CATEGORIES}
                    renderItem={renderCategory}
                    keyExtractor={item => item.slug}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoriesList}
                />
            </View>

            {/* Featured Listings */}
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Trending Near You</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Search')}>
                        <Text style={styles.seeAllLink}>See All</Text>
                    </TouchableOpacity>
                </View>

                {loading ? (
                    <View style={styles.loadingContainer}>
                        <Text style={styles.loadingText}>Loading listings...</Text>
                    </View>
                ) : listings.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Ionicons name="cube-outline" size={48} color={colors.grayLight} />
                        <Text style={styles.emptyText}>No listings yet</Text>
                        <TouchableOpacity
                            style={styles.createListingBtn}
                            onPress={() => navigation.navigate('CreateListing')}
                        >
                            <Text style={styles.createListingText}>Create First Listing</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={listings}
                        renderItem={renderListing}
                        keyExtractor={item => item.id}
                        numColumns={2}
                        columnWrapperStyle={styles.listingsRow}
                        scrollEnabled={false}
                    />
                )}
            </View>

            {/* How It Works */}
            <View style={styles.howItWorks}>
                <Text style={styles.sectionTitle}>How It Works</Text>
                <View style={styles.stepsContainer}>
                    <View style={styles.step}>
                        <View style={styles.stepIcon}>
                            <Ionicons name="search" size={24} color={colors.primary} />
                        </View>
                        <Text style={styles.stepLabel}>Find</Text>
                    </View>
                    <View style={styles.stepArrow}>
                        <Ionicons name="arrow-forward" size={16} color={colors.grayLight} />
                    </View>
                    <View style={styles.step}>
                        <View style={styles.stepIcon}>
                            <Ionicons name="calendar" size={24} color={colors.primary} />
                        </View>
                        <Text style={styles.stepLabel}>Book</Text>
                    </View>
                    <View style={styles.stepArrow}>
                        <Ionicons name="arrow-forward" size={16} color={colors.grayLight} />
                    </View>
                    <View style={styles.step}>
                        <View style={styles.stepIcon}>
                            <Ionicons name="handshake" size={24} color={colors.primary} />
                        </View>
                        <Text style={styles.stepLabel}>Collect</Text>
                    </View>
                </View>
            </View>

            {/* Bottom Spacing */}
            <View style={{ height: spacing.xl }} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    hero: {
        backgroundColor: colors.primary,
        padding: spacing.lg,
        paddingTop: spacing.xl,
        paddingBottom: spacing.xl,
        borderBottomLeftRadius: borderRadius.xl,
        borderBottomRightRadius: borderRadius.xl,
    },
    heroTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.white,
        marginBottom: spacing.xs,
    },
    heroHighlight: {
        color: colors.accent,
    },
    heroSubtitle: {
        fontSize: 14,
        color: colors.white + 'CC',
        marginBottom: spacing.lg,
    },
    quickActions: {
        flexDirection: 'row',
        gap: spacing.md,
    },
    quickActionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.white + '20',
        paddingVertical: spacing.sm + 4,
        borderRadius: borderRadius.md,
        gap: spacing.xs,
    },
    quickActionSecondary: {
        backgroundColor: colors.white,
    },
    quickActionText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.white,
    },
    section: {
        padding: spacing.lg,
        paddingBottom: 0,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: spacing.md,
    },
    seeAllLink: {
        fontSize: 14,
        color: colors.primary,
        fontWeight: '500',
    },
    categoriesList: {
        paddingRight: spacing.lg,
    },
    categoryCard: {
        width: 100,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
        alignItems: 'center',
        marginRight: spacing.sm,
    },
    categoryIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    categoryName: {
        fontSize: 12,
        fontWeight: '500',
        color: colors.textPrimary,
        textAlign: 'center',
    },
    listingsRow: {
        justifyContent: 'space-between',
        marginBottom: spacing.md,
    },
    listingCard: {
        width: CARD_WIDTH,
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        ...shadows.md,
    },
    listingImage: {
        width: '100%',
        height: 120,
        backgroundColor: colors.grayLighter,
    },
    listingInfo: {
        padding: spacing.sm,
    },
    listingTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    listingPrice: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.primary,
        marginBottom: spacing.xs,
    },
    listingMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    listingLocation: {
        fontSize: 11,
        color: colors.gray,
        flex: 1,
    },
    loadingContainer: {
        padding: spacing.xl,
        alignItems: 'center',
    },
    loadingText: {
        color: colors.gray,
    },
    emptyContainer: {
        padding: spacing.xl,
        alignItems: 'center',
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        marginTop: spacing.md,
    },
    emptyText: {
        color: colors.gray,
        marginTop: spacing.md,
        marginBottom: spacing.md,
    },
    createListingBtn: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
    },
    createListingText: {
        color: colors.white,
        fontWeight: '600',
    },
    howItWorks: {
        padding: spacing.lg,
        backgroundColor: colors.primaryLight + '10',
        margin: spacing.lg,
        marginTop: spacing.md,
        borderRadius: borderRadius.xl,
    },
    stepsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    step: {
        alignItems: 'center',
    },
    stepIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.white,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.xs,
        ...shadows.sm,
    },
    stepLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    stepArrow: {
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.lg,
    },
});

export default HomeScreen;
