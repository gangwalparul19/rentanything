// Property Details Screen
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import colors from '../../styles/colors';
import { spacing, borderRadius, shadows } from '../../styles/common';

const { width } = Dimensions.get('window');

const PropertyDetailsScreen = ({ route, navigation }) => {
    const { propertyId } = route.params;
    const [property, setProperty] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetch = async () => {
            try {
                const docSnap = await getDoc(doc(db, 'properties', propertyId));
                if (docSnap.exists()) setProperty({ id: docSnap.id, ...docSnap.data() });
            } catch (error) { console.error('Error:', error); }
            finally { setLoading(false); }
        };
        fetch();
    }, []);

    if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color={colors.primary} /></View>;
    if (!property) return <View style={styles.loading}><Text>Property not found</Text></View>;

    return (
        <View style={styles.container}>
            <ScrollView>
                <Image source={{ uri: property.images?.[0] || 'https://via.placeholder.com/400' }} style={styles.image} />
                <View style={styles.info}>
                    <Text style={styles.title}>{property.title}</Text>
                    <Text style={styles.price}>₹{property.rent?.toLocaleString()}/month</Text>
                    <View style={styles.detailsRow}>
                        <View style={styles.detail}><Ionicons name="bed-outline" size={18} color={colors.gray} /><Text style={styles.detailText}>{property.bedrooms} BHK</Text></View>
                        <View style={styles.detail}><Ionicons name="tv-outline" size={18} color={colors.gray} /><Text style={styles.detailText}>{property.furnishing}</Text></View>
                    </View>
                    <View style={styles.locationRow}><Ionicons name="location-outline" size={18} color={colors.gray} /><Text style={styles.location}>{property.building || property.location}</Text></View>
                    <Text style={styles.sectionTitle}>Description</Text>
                    <Text style={styles.description}>{property.description}</Text>
                </View>
                <View style={{ height: 100 }} />
            </ScrollView>
            <View style={styles.bottomBar}>
                <TouchableOpacity style={styles.contactBtn}><Ionicons name="call-outline" size={20} color={colors.white} /><Text style={styles.contactText}>Contact Owner</Text></TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.white },
    loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    image: { width, height: 250, backgroundColor: colors.grayLighter },
    info: { padding: spacing.lg },
    title: { fontSize: 22, fontWeight: '700', color: colors.textPrimary, marginBottom: spacing.xs },
    price: { fontSize: 24, fontWeight: '700', color: colors.primary, marginBottom: spacing.md },
    detailsRow: { flexDirection: 'row', gap: spacing.lg, marginBottom: spacing.md },
    detail: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    detailText: { fontSize: 14, color: colors.gray },
    locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: spacing.lg },
    location: { fontSize: 14, color: colors.gray },
    sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.sm },
    description: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing.md, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.grayLighter, ...shadows.lg },
    contactBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, padding: spacing.md, borderRadius: borderRadius.md, gap: spacing.sm },
    contactText: { color: colors.white, fontSize: 16, fontWeight: '600' },
});

export default PropertyDetailsScreen;
