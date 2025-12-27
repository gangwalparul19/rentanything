// Wishlist Screen
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, RefreshControl, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import colors from '../../styles/colors';
import { spacing, borderRadius, shadows } from '../../styles/common';

const { width } = Dimensions.get('window');
const CARD_WIDTH = (width - spacing.lg * 2 - spacing.md) / 2;

const WishlistScreen = ({ navigation }) => {
    const { user } = useAuth();
    const [wishlistItems, setWishlistItems] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchWishlist = async () => {
        try {
            const q = query(collection(db, 'wishlists'), where('userId', '==', user.uid));
            const snapshot = await getDocs(q);
            const items = await Promise.all(snapshot.docs.map(async (wishDoc) => {
                const listing = await getDoc(doc(db, 'listings', wishDoc.data().listingId));
                return listing.exists() ? { id: listing.id, ...listing.data() } : null;
            }));
            setWishlistItems(items.filter(Boolean));
        } catch (error) { console.error('Error:', error); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchWishlist(); }, []);

    const renderItem = ({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate('ListingDetails', { listingId: item.id })}>
            <Image source={{ uri: item.images?.[0] || 'https://via.placeholder.com/150' }} style={styles.image} />
            <View style={styles.info}><Text style={styles.title} numberOfLines={2}>{item.title}</Text><Text style={styles.price}>₹{item.pricePerDay}/day</Text></View>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <FlatList data={wishlistItems} renderItem={renderItem} keyExtractor={item => item.id} numColumns={2} columnWrapperStyle={styles.row}
                contentContainerStyle={styles.list} refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchWishlist} />}
                ListEmptyComponent={!loading && <View style={styles.empty}><Ionicons name="heart-outline" size={64} color={colors.grayLight} /><Text style={styles.emptyText}>Your wishlist is empty</Text></View>}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    list: { padding: spacing.md },
    row: { justifyContent: 'space-between', marginBottom: spacing.md },
    card: { width: CARD_WIDTH, backgroundColor: colors.white, borderRadius: borderRadius.lg, overflow: 'hidden', ...shadows.sm },
    image: { width: '100%', height: 120, backgroundColor: colors.grayLighter },
    info: { padding: spacing.sm },
    title: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: 4 },
    price: { fontSize: 14, fontWeight: '700', color: colors.primary },
    empty: { alignItems: 'center', paddingTop: spacing.xl * 2 },
    emptyText: { fontSize: 16, color: colors.gray, marginTop: spacing.md },
});

export default WishlistScreen;
