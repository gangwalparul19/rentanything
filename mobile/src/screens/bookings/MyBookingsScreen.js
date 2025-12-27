// My Bookings Screen
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import colors from '../../styles/colors';
import { spacing, borderRadius, shadows } from '../../styles/common';

const MyBookingsScreen = ({ navigation }) => {
    const { user } = useAuth();
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchBookings = async () => {
        try {
            const q = query(collection(db, 'bookings'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            setBookings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        } catch (error) { console.error('Error:', error); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchBookings(); }, []);

    const getStatusColor = (status) => {
        switch (status) {
            case 'confirmed': return colors.success;
            case 'pending': return colors.warning;
            case 'cancelled': return colors.error;
            default: return colors.gray;
        }
    };

    const renderBooking = ({ item }) => (
        <View style={styles.card}>
            <View style={styles.header}><Text style={styles.title} numberOfLines={1}>{item.listingTitle || 'Booking'}</Text><View style={[styles.status, { backgroundColor: getStatusColor(item.status) + '20' }]}><Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>{item.status}</Text></View></View>
            <View style={styles.row}><Ionicons name="calendar-outline" size={16} color={colors.gray} /><Text style={styles.detail}>{item.startDate} - {item.endDate}</Text></View>
            <Text style={styles.price}>₹{item.totalAmount}</Text>
        </View>
    );

    return (
        <View style={styles.container}>
            <FlatList data={bookings} renderItem={renderBooking} keyExtractor={item => item.id} contentContainerStyle={styles.list}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={fetchBookings} />}
                ListEmptyComponent={!loading && <View style={styles.empty}><Ionicons name="calendar-outline" size={64} color={colors.grayLight} /><Text style={styles.emptyText}>No bookings yet</Text></View>}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    list: { padding: spacing.md },
    card: { backgroundColor: colors.white, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.md, ...shadows.sm },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    title: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, flex: 1 },
    status: { paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: borderRadius.sm },
    statusText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
    row: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.xs },
    detail: { fontSize: 13, color: colors.gray },
    price: { fontSize: 18, fontWeight: '700', color: colors.primary, marginTop: spacing.xs },
    empty: { alignItems: 'center', paddingTop: spacing.xl * 2 },
    emptyText: { fontSize: 16, color: colors.gray, marginTop: spacing.md },
});

export default MyBookingsScreen;
