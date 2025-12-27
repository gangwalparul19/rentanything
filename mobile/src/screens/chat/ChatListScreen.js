// Chat List Screen - List of conversations
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    StyleSheet,
    TouchableOpacity,
    Image,
    RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import colors from '../../styles/colors';
import { spacing, borderRadius, shadows } from '../../styles/common';

const ChatListScreen = ({ navigation }) => {
    const { user } = useAuth();
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        if (!user) return;

        // Real-time listener for conversations
        const q = query(
            collection(db, 'chats'),
            where('participants', 'array-contains', user.uid),
            orderBy('lastMessageAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const chats = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
            }));
            setConversations(chats);
            setLoading(false);
            setRefreshing(false);
        }, (error) => {
            console.error('Error fetching chats:', error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user]);

    const onRefresh = () => {
        setRefreshing(true);
        // Listener will handle refresh
        setTimeout(() => setRefreshing(false), 1000);
    };

    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return date.toLocaleDateString();
    };

    const getOtherUser = (chat) => {
        if (!chat.participantInfo) return { name: 'Unknown', photoURL: null };
        const otherId = chat.participants?.find(id => id !== user?.uid);
        return chat.participantInfo[otherId] || { name: 'Unknown', photoURL: null };
    };

    const renderConversation = ({ item }) => {
        const otherUser = getOtherUser(item);
        const unreadCount = item.unreadCount?.[user?.uid] || 0;

        return (
            <TouchableOpacity
                style={styles.chatItem}
                onPress={() => navigation.navigate('Chat', {
                    chatId: item.id,
                    userName: otherUser.name,
                    userId: item.participants?.find(id => id !== user?.uid),
                })}
            >
                <View style={styles.avatarContainer}>
                    {otherUser.photoURL ? (
                        <Image source={{ uri: otherUser.photoURL }} style={styles.avatar} />
                    ) : (
                        <View style={styles.avatarPlaceholder}>
                            <Text style={styles.avatarText}>
                                {otherUser.name?.charAt(0)?.toUpperCase() || '?'}
                            </Text>
                        </View>
                    )}
                    {unreadCount > 0 && (
                        <View style={styles.unreadBadge}>
                            <Text style={styles.unreadText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                        </View>
                    )}
                </View>
                <View style={styles.chatInfo}>
                    <View style={styles.chatHeader}>
                        <Text style={[styles.chatName, unreadCount > 0 && styles.chatNameUnread]}>
                            {otherUser.name}
                        </Text>
                        <Text style={styles.chatTime}>{formatTime(item.lastMessageAt)}</Text>
                    </View>
                    <View style={styles.chatPreview}>
                        {item.listingTitle && (
                            <Text style={styles.listingTitle} numberOfLines={1}>
                                📦 {item.listingTitle}
                            </Text>
                        )}
                        <Text
                            style={[styles.lastMessage, unreadCount > 0 && styles.lastMessageUnread]}
                            numberOfLines={1}
                        >
                            {item.lastMessage || 'Start a conversation'}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderEmpty = () => {
        if (loading) return null;
        return (
            <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={64} color={colors.grayLight} />
                <Text style={styles.emptyTitle}>No messages yet</Text>
                <Text style={styles.emptyText}>
                    Start a conversation by contacting an item owner
                </Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <FlatList
                data={conversations}
                renderItem={renderConversation}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContainer}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
                }
                ListEmptyComponent={renderEmpty}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.white,
    },
    listContainer: {
        flexGrow: 1,
    },
    chatItem: {
        flexDirection: 'row',
        padding: spacing.md,
        alignItems: 'center',
    },
    avatarContainer: {
        position: 'relative',
    },
    avatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.grayLighter,
    },
    avatarPlaceholder: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: colors.primary + '20',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.primary,
    },
    unreadBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        backgroundColor: colors.error,
        width: 20,
        height: 20,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: colors.white,
    },
    unreadText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.white,
    },
    chatInfo: {
        flex: 1,
        marginLeft: spacing.md,
    },
    chatHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    chatName: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.textPrimary,
    },
    chatNameUnread: {
        fontWeight: '700',
    },
    chatTime: {
        fontSize: 12,
        color: colors.gray,
    },
    chatPreview: {
        gap: 2,
    },
    listingTitle: {
        fontSize: 12,
        color: colors.primary,
        fontWeight: '500',
    },
    lastMessage: {
        fontSize: 14,
        color: colors.gray,
    },
    lastMessageUnread: {
        color: colors.textPrimary,
        fontWeight: '500',
    },
    separator: {
        height: 1,
        backgroundColor: colors.grayLightest,
        marginLeft: 80,
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
        textAlign: 'center',
        paddingHorizontal: spacing.xl,
    },
});

export default ChatListScreen;
