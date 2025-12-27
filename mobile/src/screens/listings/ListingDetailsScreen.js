// Listing Details Screen
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Image,
    Dimensions,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import colors from '../../styles/colors';
import { spacing, borderRadius, shadows } from '../../styles/common';

const { width } = Dimensions.get('window');

const ListingDetailsScreen = ({ route, navigation }) => {
    const { listingId } = route.params;
    const { user, userProfile } = useAuth();
    const [listing, setListing] = useState(null);
    const [owner, setOwner] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isWishlisted, setIsWishlisted] = useState(false);

    useEffect(() => {
        fetchListing();
    }, [listingId]);

    const fetchListing = async () => {
        try {
            const docRef = doc(db, 'listings', listingId);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                setListing({ id: docSnap.id, ...data });

                // Fetch owner info
                if (data.ownerId) {
                    const ownerDoc = await getDoc(doc(db, 'users', data.ownerId));
                    if (ownerDoc.exists()) {
                        setOwner({ id: ownerDoc.id, ...ownerDoc.data() });
                    }
                }
            }
        } catch (error) {
            console.error('Error fetching listing:', error);
        } finally {
            setLoading(false);
        }
    };

    const startChat = async () => {
        if (!user) {
            Alert.alert('Login Required', 'Please login to contact the owner');
            return;
        }

        try {
            // Check for existing chat
            const chatQuery = query(
                collection(db, 'chats'),
                where('participants', 'array-contains', user.uid)
            );
            const chatSnap = await getDocs(chatQuery);

            let existingChat = null;
            chatSnap.forEach(doc => {
                const data = doc.data();
                if (data.participants.includes(listing.ownerId) && data.listingId === listingId) {
                    existingChat = { id: doc.id, ...data };
                }
            });

            if (existingChat) {
                navigation.navigate('Chat', {
                    chatId: existingChat.id,
                    userName: owner?.name || 'Owner',
                    userId: listing.ownerId,
                });
            } else {
                // Create new chat
                const chatRef = await addDoc(collection(db, 'chats'), {
                    participants: [user.uid, listing.ownerId],
                    participantInfo: {
                        [user.uid]: { name: userProfile?.name || user.displayName || 'User', photoURL: user.photoURL },
                        [listing.ownerId]: { name: owner?.name || 'Owner', photoURL: owner?.photoURL },
                    },
                    listingId,
                    listingTitle: listing.title,
                    createdAt: serverTimestamp(),
                    lastMessageAt: serverTimestamp(),
                    lastMessage: '',
                });

                navigation.navigate('Chat', {
                    chatId: chatRef.id,
                    userName: owner?.name || 'Owner',
                    userId: listing.ownerId,
                });
            }
        } catch (error) {
            console.error('Error starting chat:', error);
            Alert.alert('Error', 'Could not start conversation');
        }
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!listing) {
        return (
            <View style={styles.errorContainer}>
                <Ionicons name="alert-circle-outline" size={64} color={colors.grayLight} />
                <Text style={styles.errorText}>Listing not found</Text>
            </View>
        );
    }

    const images = listing.images?.length > 0 ? listing.images : ['https://via.placeholder.com/400'];

    return (
        <View style={styles.container}>
            <ScrollView>
                {/* Image Gallery */}
                <View style={styles.imageContainer}>
                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={(e) => {
                            const index = Math.round(e.nativeEvent.contentOffset.x / width);
                            setCurrentImageIndex(index);
                        }}
                    >
                        {images.map((image, index) => (
                            <Image key={index} source={{ uri: image }} style={styles.image} />
                        ))}
                    </ScrollView>
                    {/* Image Pagination */}
                    {images.length > 1 && (
                        <View style={styles.pagination}>
                            {images.map((_, index) => (
                                <View
                                    key={index}
                                    style={[styles.paginationDot, currentImageIndex === index && styles.paginationDotActive]}
                                />
                            ))}
                        </View>
                    )}
                    {/* Wishlist Button */}
                    <TouchableOpacity
                        style={styles.wishlistBtn}
                        onPress={() => setIsWishlisted(!isWishlisted)}
                    >
                        <Ionicons
                            name={isWishlisted ? 'heart' : 'heart-outline'}
                            size={24}
                            color={isWishlisted ? colors.error : colors.white}
                        />
                    </TouchableOpacity>
                </View>

                {/* Info Section */}
                <View style={styles.infoSection}>
                    <Text style={styles.title}>{listing.title}</Text>
                    <View style={styles.priceRow}>
                        <Text style={styles.price}>₹{listing.pricePerDay}</Text>
                        <Text style={styles.priceUnit}>/day</Text>
                        {listing.deposit > 0 && (
                            <Text style={styles.deposit}>+ ₹{listing.deposit} deposit</Text>
                        )}
                    </View>

                    {/* Location */}
                    <View style={styles.locationRow}>
                        <Ionicons name="location-outline" size={18} color={colors.gray} />
                        <Text style={styles.location}>
                            {listing.buildingName || listing.location || 'Megapolis'}
                        </Text>
                    </View>

                    {/* Tags */}
                    <View style={styles.tagsRow}>
                        <View style={styles.tag}>
                            <Text style={styles.tagText}>{listing.category}</Text>
                        </View>
                        {listing.condition && (
                            <View style={styles.tag}>
                                <Text style={styles.tagText}>{listing.condition}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Description */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Description</Text>
                    <Text style={styles.description}>{listing.description || 'No description provided'}</Text>
                </View>

                {/* Owner */}
                {owner && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Listed by</Text>
                        <View style={styles.ownerCard}>
                            {owner.photoURL ? (
                                <Image source={{ uri: owner.photoURL }} style={styles.ownerAvatar} />
                            ) : (
                                <View style={styles.ownerAvatarPlaceholder}>
                                    <Text style={styles.ownerAvatarText}>{owner.name?.charAt(0)}</Text>
                                </View>
                            )}
                            <View style={styles.ownerInfo}>
                                <Text style={styles.ownerName}>{owner.name}</Text>
                                <Text style={styles.ownerLocation}>
                                    {owner.society || owner.building || 'Megapolis'}
                                </Text>
                            </View>
                            {owner.isVerified && (
                                <View style={styles.verifiedBadge}>
                                    <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
                                    <Text style={styles.verifiedText}>Verified</Text>
                                </View>
                            )}
                        </View>
                    </View>
                )}

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* Bottom Action Bar */}
            <View style={styles.bottomBar}>
                <TouchableOpacity style={styles.chatButton} onPress={startChat}>
                    <Ionicons name="chatbubble-outline" size={22} color={colors.primary} />
                    <Text style={styles.chatButtonText}>Chat with Owner</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.bookButton}>
                    <Text style={styles.bookButtonText}>Request to Book</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.white,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.white,
    },
    errorText: {
        fontSize: 16,
        color: colors.gray,
        marginTop: spacing.md,
    },
    imageContainer: {
        position: 'relative',
    },
    image: {
        width: width,
        height: 300,
        backgroundColor: colors.grayLighter,
    },
    pagination: {
        flexDirection: 'row',
        position: 'absolute',
        bottom: spacing.md,
        alignSelf: 'center',
        gap: 6,
    },
    paginationDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.white + '80',
    },
    paginationDotActive: {
        backgroundColor: colors.white,
        width: 20,
    },
    wishlistBtn: {
        position: 'absolute',
        top: spacing.md,
        right: spacing.md,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.dark + '60',
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoSection: {
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.grayLightest,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    priceRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        marginBottom: spacing.sm,
    },
    price: {
        fontSize: 26,
        fontWeight: '700',
        color: colors.primary,
    },
    priceUnit: {
        fontSize: 16,
        color: colors.gray,
        marginLeft: 4,
    },
    deposit: {
        fontSize: 14,
        color: colors.gray,
        marginLeft: spacing.md,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: spacing.md,
    },
    location: {
        fontSize: 14,
        color: colors.gray,
    },
    tagsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    tag: {
        backgroundColor: colors.primary + '15',
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.sm,
    },
    tagText: {
        fontSize: 12,
        color: colors.primary,
        fontWeight: '500',
    },
    section: {
        padding: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.grayLightest,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: spacing.sm,
    },
    description: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 22,
    },
    ownerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.grayLightest,
        padding: spacing.md,
        borderRadius: borderRadius.lg,
    },
    ownerAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.grayLighter,
    },
    ownerAvatarPlaceholder: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.primary + '20',
        justifyContent: 'center',
        alignItems: 'center',
    },
    ownerAvatarText: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.primary,
    },
    ownerInfo: {
        flex: 1,
        marginLeft: spacing.md,
    },
    ownerName: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    ownerLocation: {
        fontSize: 13,
        color: colors.gray,
    },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.primary + '15',
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.sm,
    },
    verifiedText: {
        fontSize: 11,
        color: colors.primary,
        fontWeight: '600',
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        padding: spacing.md,
        backgroundColor: colors.white,
        borderTopWidth: 1,
        borderTopColor: colors.grayLighter,
        gap: spacing.sm,
        ...shadows.lg,
    },
    chatButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.primary,
        gap: spacing.xs,
    },
    chatButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.primary,
    },
    bookButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        backgroundColor: colors.primary,
    },
    bookButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.white,
    },
});

export default ListingDetailsScreen;
