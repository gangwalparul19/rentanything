// Chat Screen - Conversation view
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import colors from '../../styles/colors';
import { spacing, borderRadius } from '../../styles/common';

const ChatScreen = ({ route }) => {
    const { chatId } = route.params;
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const flatListRef = useRef();

    useEffect(() => {
        const q = query(collection(db, 'chats', chatId, 'messages'), orderBy('createdAt', 'asc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, [chatId]);

    const sendMessage = async () => {
        if (!inputText.trim()) return;
        const text = inputText;
        setInputText('');

        try {
            await addDoc(collection(db, 'chats', chatId, 'messages'), {
                text,
                senderId: user.uid,
                createdAt: serverTimestamp(),
            });
            await updateDoc(doc(db, 'chats', chatId), { lastMessage: text, lastMessageAt: serverTimestamp() });
        } catch (error) { console.error('Error:', error); }
    };

    const renderMessage = ({ item }) => {
        const isMe = item.senderId === user?.uid;
        return (
            <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
                <Text style={[styles.messageText, isMe && styles.myMessageText]}>{item.text}</Text>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={90}>
            <FlatList
                ref={flatListRef}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.messagesList}
                onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            />
            <View style={styles.inputContainer}>
                <TextInput style={styles.input} placeholder="Type a message..." value={inputText} onChangeText={setInputText} multiline />
                <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} disabled={!inputText.trim()}>
                    <Ionicons name="send" size={22} color={inputText.trim() ? colors.primary : colors.grayLight} />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.grayLightest },
    messagesList: { padding: spacing.md, paddingBottom: spacing.lg },
    messageBubble: { maxWidth: '80%', padding: spacing.sm, paddingHorizontal: spacing.md, borderRadius: borderRadius.lg, marginBottom: spacing.sm },
    myMessage: { alignSelf: 'flex-end', backgroundColor: colors.primary, borderBottomRightRadius: 4 },
    theirMessage: { alignSelf: 'flex-start', backgroundColor: colors.white, borderBottomLeftRadius: 4 },
    messageText: { fontSize: 15, color: colors.textPrimary, lineHeight: 20 },
    myMessageText: { color: colors.white },
    inputContainer: { flexDirection: 'row', alignItems: 'flex-end', padding: spacing.sm, backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.grayLighter },
    input: { flex: 1, backgroundColor: colors.grayLightest, borderRadius: borderRadius.lg, paddingHorizontal: spacing.md, paddingVertical: spacing.sm, fontSize: 15, maxHeight: 100 },
    sendBtn: { padding: spacing.sm, marginLeft: spacing.xs },
});

export default ChatScreen;
