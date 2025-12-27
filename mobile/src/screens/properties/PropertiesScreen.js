// Properties Screen - Browse property listings
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    Image,
    RefreshControl,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '../../config/firebase';
import colors from '../../styles/colors';
import { spacing, borderRadius, shadows } from '../../styles/common';

const { width } = Dimensions.get('window');

const PropertiesScreen = ({ navigation }) => {
    const [properties, setProperties] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter] = useState('all'); // all, rent, flatmate

    const fetchProperties = async () => {
        try {
            let q = query(
                collection(db, 'properties'),
                where('status', '==', 'active'),
                orderBy('createdAt', 'desc'),
                limit(20)
            );

            if (filter !== 'all') {
                q = query(
                    collection(db, 'properties'),
                    where('status', '==', 'active'),
                    where('type', '==', filter),
                    orderBy('createdAt', 'desc'),
                    limit(20)
                );
            }

            const snapshot = await getDocs(q);
            const items = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));
            setProperties(items);
        } catch (error) {
            console.error('Error fetching properties:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchProperties();
    }, [filter]);

    const onRefresh = () => {
        setRefreshing(true);
        fetchProperties();
    };

    const renderFilter = (label, value) => (
        <TouchableOpacity
            style={[styles.filterChip, filter === value && styles.filterChipActive]}
            onPress={() => setFilter(value)}
        >
            <Text style={[styles.filterChipText, filter === value && styles.filterChipTextActive]}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    const renderProperty = ({ item }) => (
        <TouchableOpacity
            style={styles.propertyCard}
            onPress={() => navigation.navigate('PropertyDetails', { propertyId: item.id })}
        >
            <Image
                source={{ uri: item.images?.[0] || 'https://via.placeholder.com/400x200' }}
                style={styles.propertyImage}
            />
            <View style={styles.typeBadge}>
                <Text style={styles.typeText}>
                    {item.type === 'flatmate' ? 'Flatmate' : 'For Rent'}
                </Text>
            </View>
            <View style={styles.propertyInfo}>
                <Text style={styles.propertyTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.propertyPrice}>
                    ₹{item.rent?.toLocaleString()}/month
                </Text>
                <View style={styles.propertyDetails}>
                    {item.bedrooms && (
                        <View style={styles.detailItem}>
                            <Ionicons name="bed-outline" size={14} color={colors.gray} />
                            <Text style={styles.detailText}>{item.bedrooms} BHK</Text>
                        </View>
                    )}
                    {item.furnishing && (
                        <View style={styles.detailItem}>
                            <Ionicons name="tv-outline" size={14} color={colors.gray} />
                            <Text style={styles.detailText}>{item.furnishing}</Text>
                        </View>
                    )}
                </View>
                <View style={styles.locationRow}>
                    <Ionicons name="location-outline" size={14} color={colors.gray} />
                    <Text style={styles.locationText} numberOfLines={1}>
                        {item.building || item.location || 'Megapolis'}
                    </Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    const renderEmpty = () => {
        if (loading) return null;
        return (
            <View style={styles.emptyContainer}>
                <Ionicons name="business-outline" size={64} color={colors.grayLight} />
                <Text style={styles.emptyTitle}>No properties found</Text>
                <Text style={styles.emptyText}>Be the first to list a property!</Text>
                <TouchableOpacity
                    style={styles.listPropertyBtn}
                    onPress={() => navigation.navigate('ListProperty')}
                >
                    <Text style={styles.listPropertyText}>List Property</Text>
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Filters */}
            <View style={styles.filterContainer}>
                {renderFilter('All', 'all')}
                {renderFilter('For Rent', 'rent')}
                {renderFilter('Flatmate', 'flatmate')}
            </View>

            {/* Properties List */}
            <FlatList
                data={properties}
                renderItem={renderProperty}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
                }
                ListEmptyComponent={renderEmpty}
            />

            {/* List Property FAB */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('ListProperty')}
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
    filterContainer: {
        flexDirection: 'row',
        padding: spacing.md,
        backgroundColor: colors.white,
        borderBottomWidth: 1,
        borderBottomColor: colors.grayLighter,
        gap: spacing.sm,
    },
    filterChip: {
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xs + 2,
        borderRadius: borderRadius.full,
        backgroundColor: colors.grayLightest,
        borderWidth: 1,
        borderColor: colors.grayLighter,
    },
    filterChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '500',
        color: colors.textSecondary,
    },
    filterChipTextActive: {
        color: colors.white,
    },
    listContainer: {
        padding: spacing.md,
        paddingBottom: 100,
    },
    propertyCard: {
        backgroundColor: colors.white,
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        marginBottom: spacing.md,
        ...shadows.md,
    },
    propertyImage: {
        width: '100%',
        height: 180,
        backgroundColor: colors.grayLighter,
    },
    typeBadge: {
        position: 'absolute',
        top: spacing.sm,
        left: spacing.sm,
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.sm,
    },
    typeText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.white,
    },
    propertyInfo: {
        padding: spacing.md,
    },
    propertyTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    propertyPrice: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.primary,
        marginBottom: spacing.sm,
    },
    propertyDetails: {
        flexDirection: 'row',
        gap: spacing.md,
        marginBottom: spacing.sm,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    detailText: {
        fontSize: 13,
        color: colors.gray,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    locationText: {
        fontSize: 13,
        color: colors.gray,
        flex: 1,
    },
    emptyContainer: {
        alignItems: 'center',
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
        marginBottom: spacing.lg,
    },
    listPropertyBtn: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.lg,
        paddingVertical: spacing.sm,
        borderRadius: borderRadius.md,
    },
    listPropertyText: {
        color: colors.white,
        fontWeight: '600',
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

export default PropertiesScreen;
