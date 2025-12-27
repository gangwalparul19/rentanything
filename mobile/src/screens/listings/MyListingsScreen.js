// My Listings Screen - User's listings
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import colors from '../../styles/colors';
import { spacing, borderRadius, shadows } from '../../styles/common';

const MyListingsScreen = ({ navigation }) => {
    const { user } = useAuth();
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const fetchListings = async () => {
        try {
            const q = query(
                collection(db, 'listings'),
                where('ownerId', '==', user.uid),
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(q);
            setListings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) {
            console.error('Error:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => { fetchListings(); }, []);

    const renderItem = ({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ListingDetails', { listingId: item.id })}>
            <Image source={{ uri: item.images?.[0] || 'https://via.placeholder.com/100' }} style={styles.image} />
            <View style={styles.info}>
                <Text style={styles.title} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.price}>₹{item.pricePerDay}/day</Text>
                <View style={[styles.statusBadge, item.status === 'active' ? styles.statusActive : styles.statusInactive]}>
                    <Text style={styles.statusText}>{item.status}</Text>
                </View>
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <FlatList
                data={listings}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchListings(); }} />}
                ListEmptyComponent={!loading && (
                    <View style={styles.empty}>
                        <Ionicons name="cube-outline" size={64} color={colors.grayLight} />
                        <Text style={styles.emptyTitle}>No listings yet</Text>
                        <TouchableOpacity style={styles.createBtn} onPress={() => navigation.navigate('CreateListing')}>
                            <Text style={styles.createBtnText}>Create Listing</Text>
                        </TouchableOpacity>
                    </View>
                )}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    list: { padding: spacing.md },
    card: { flexDirection: 'row', backgroundColor: colors.white, borderRadius: borderRadius.lg, marginBottom: spacing.md, overflow: 'hidden', ...shadows.sm },
    image: { width: 100, height: 100, backgroundColor: colors.grayLighter },
    info: { flex: 1, padding: spacing.md },
    title: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 4 },
    price: { fontSize: 16, fontWeight: '700', color: colors.primary, marginBottom: spacing.xs },
    statusBadge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm },
    statusActive: { backgroundColor: colors.success + '20' },
    statusInactive: { backgroundColor: colors.gray + '20' },
    statusText: { fontSize: 11, fontWeight: '600', color: colors.success, textTransform: 'capitalize' },
    empty: { alignItems: 'center', paddingTop: spacing.xl * 2 },
    emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.textPrimary, marginTop: spacing.md },
    createBtn: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.md, marginTop: spacing.md },
    createBtnText: { color: colors.white, fontWeight: '600' },
});

export default MyListingsScreen;
