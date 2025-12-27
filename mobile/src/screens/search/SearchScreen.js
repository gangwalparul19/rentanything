// Search Screen - Browse and filter items
import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Image,
    ActivityIndicator,
    RefreshControl,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, orderBy, getDocs, limit, startAfter } from 'firebase/firestore';
import { db } from '../../config/firebase';
import colors from '../../styles/colors';
import { spacing, borderRadius, shadows } from '../../styles/common';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - spacing.lg * 2 - spacing.md) / 2;

const CATEGORIES = [
    { label: 'All', value: '' },
    { label: 'Party', value: 'party' },
    { label: 'Kids & Baby', value: 'baby' },
    { label: 'Electronics', value: 'electronics' },
    { label: 'Home', value: 'home-decor' },
    { label: 'Sports', value: 'sports' },
    { label: 'Photography', value: 'photography' },
    { label: 'Books', value: 'books' },
];

const SearchScreen = ({ navigation, route }) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState(route.params?.category || '');
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [lastDoc, setLastDoc] = useState(null);
    const [hasMore, setHasMore] = useState(true);

    const fetchListings = async (reset = false) => {
        if (loading && !reset) return;

        setLoading(true);
        try {
            let q = query(
                collection(db, 'listings'),
                where('status', '==', 'active'),
                orderBy('createdAt', 'desc'),
                limit(10)
            );

            // Add category filter
            if (selectedCategory) {
                q = query(
                    collection(db, 'listings'),
                    where('status', '==', 'active'),
                    where('category', '==', selectedCategory),
                    orderBy('createdAt', 'desc'),
                    limit(10)
                );
            }

            // Pagination
            if (!reset && lastDoc) {
                q = query(q, startAfter(lastDoc));
            }

            const snapshot = await getDocs(q);
            const items = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));

            // Filter by search query (client-side for simplicity)
            let filteredItems = items;
            if (searchQuery.trim()) {
                const lowerQuery = searchQuery.toLowerCase();
                filteredItems = items.filter(item =>
                    item.title?.toLowerCase().includes(lowerQuery) ||
                    item.description?.toLowerCase().includes(lowerQuery)
                );
            }

            if (reset) {
                setListings(filteredItems);
            } else {
                setListings(prev => [...prev, ...filteredItems]);
            }

            setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
            setHasMore(snapshot.docs.length === 10);
        } catch (error) {
            console.error('Error fetching listings:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchListings(true);
    }, [selectedCategory]);

    const handleSearch = () => {
        fetchListings(true);
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchListings(true);
    };

    const loadMore = () => {
        if (hasMore && !loading) {
            fetchListings(false);
        }
    };

    const renderCategory = ({ item }) => (
        <TouchableOpacity
            style={[
                styles.categoryChip,
                selectedCategory === item.value && styles.categoryChipActive,
            ]}
            onPress={() => setSelectedCategory(item.value)}
        >
            <Text
                style={[
                    styles.categoryChipText,
                    selectedCategory === item.value && styles.categoryChipTextActive,
                ]}
            >
                {item.label}
            </Text>
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
            {item.featured && (
                <View style={styles.featuredBadge}>
                    <Text style={styles.featuredText}>Featured</Text>
                </View>
            )}
            <View style={styles.listingInfo}>
                <Text style={styles.listingTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.listingPrice}>₹{item.pricePerDay}/day</Text>
                <View style={styles.listingMeta}>
                    <Ionicons name="location-outline" size={12} color={colors.gray} />
                    <Text style={styles.listingLocation} numberOfLines={1}>
                        {item.location || item.buildingName || 'Megapolis'}
                    </Text>
                </View>
                {item.ownerName && (
                    <View style={styles.ownerRow}>
                        <Ionicons name="person-circle-outline" size={14} color={colors.gray} />
                        <Text style={styles.ownerName} numberOfLines={1}>{item.ownerName}</Text>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );

    const renderFooter = () => {
        if (!loading) return null;
        return (
            <View style={styles.footerLoader}>
                <ActivityIndicator size="small" color={colors.primary} />
            </View>
        );
    };

    const renderEmpty = () => {
        if (loading) return null;
        return (
            <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={64} color={colors.grayLight} />
                <Text style={styles.emptyTitle}>No items found</Text>
                <Text style={styles.emptyText}>
                    Try adjusting your search or filters
                </Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                    <Ionicons name="search" size={20} color={colors.gray} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search items..."
                        placeholderTextColor={colors.grayLight}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        onSubmitEditing={handleSearch}
                        returnKeyType="search"
                    />
                    {searchQuery ? (
                        <TouchableOpacity onPress={() => { setSearchQuery(''); fetchListings(true); }}>
                            <Ionicons name="close-circle" size={20} color={colors.gray} />
                        </TouchableOpacity>
                    ) : null}
                </View>
            </View>

            {/* Category Filter */}
            <FlatList
                horizontal
                data={CATEGORIES}
                renderItem={renderCategory}
                keyExtractor={item => item.value || 'all'}
                showsHorizontalScrollIndicator={false}
                style={styles.categoryList}
                contentContainerStyle={styles.categoryListContent}
            />

            {/* Listings Grid */}
            <FlatList
                data={listings}
                renderItem={renderListing}
                keyExtractor={item => item.id}
                numColumns={2}
                columnWrapperStyle={styles.listingsRow}
                contentContainerStyle={styles.listingsContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
                }
                onEndReached={loadMore}
                onEndReachedThreshold={0.5}
                ListFooterComponent={renderFooter}
                ListEmptyComponent={renderEmpty}
            />

            {/* Create Listing FAB */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('CreateListing')}
            >
                <Ionicons name="add" size={28} color={colors.white} />
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    searchContainer: {
        padding: spacing.md,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.grayLighter,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.grayLightest,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: colors.textPrimary,
        marginLeft: spacing.sm,
    },
    categoryList: {
        backgroundColor: colors.white,
        maxHeight: 50,
    },
    categoryListContent: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.sm,
    },
    categoryChip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs,
        borderRadius: borderRadius.full,
        backgroundColor: colors.grayLightest,
        marginRight: spacing.sm,
        borderWidth: 1,
        borderColor: colors.grayLighter,
    },
    categoryChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    categoryChipText: {
        fontSize: 13,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    categoryChipTextActive: {
        color: colors.white,
    },
    listingsContainer: {
        padding: spacing.md,
        paddingBottom: 100,
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
        height: 130,
        backgroundColor: colors.grayLighter,
    },
    featuredBadge: {
        position: 'absolute',
        top: spacing.sm,
        left: spacing.sm,
        backgroundColor: colors.accent,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    featuredText: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.white,
    },
    listingInfo: {
        padding: spacing.sm,
    },
    listingTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: spacing.xs,
        lineHeight: 18,
    },
    listingPrice: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.primary,
        marginBottom: spacing.xs,
    },
    listingMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 2,
    },
    listingLocation: {
        fontSize: 11,
        color: colors.gray,
        flex: 1,
    },
    ownerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    ownerName: {
        fontSize: 11,
        color: colors.gray,
        flex: 1,
    },
    footerLoader: {
        paddingVertical: spacing.lg,
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: spacing.xl * 2,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary,
        marginTop: spacing.md,
    },
    emptyText: {
        fontSize: 14,
        color: colors.gray,
        marginTop: spacing.xs,
    },
    fab: {
        position: 'absolute',
        bottom: spacing.lg,
        right: spacing.lg,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        ...shadows.lg,
    },
});

export default SearchScreen;
