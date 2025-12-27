// Create Listing Screen - Placeholder
import React, { useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    Alert,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import colors from '../../styles/colors';
import { spacing, borderRadius } from '../../styles/common';

const CreateListingScreen = ({ navigation }) => {
    const { user, userProfile } = useAuth();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('');
    const [deposit, setDeposit] = useState('');
    const [category, setCategory] = useState('');
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(false);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsMultipleSelection: true,
            quality: 0.8,
        });

        if (!result.canceled) {
            setImages([...images, ...result.assets.map(a => a.uri)]);
        }
    };

    const handleSubmit = async () => {
        if (!title || !price) {
            Alert.alert('Error', 'Please fill in required fields');
            return;
        }

        setLoading(true);
        try {
            await addDoc(collection(db, 'listings'), {
                title,
                description,
                pricePerDay: parseInt(price),
                deposit: parseInt(deposit) || 0,
                category: category || 'other',
                images: [], // Would upload to Firebase Storage first
                ownerId: user.uid,
                ownerName: userProfile?.name || user.displayName,
                status: 'active',
                createdAt: serverTimestamp(),
            });

            Alert.alert('Success', 'Listing created successfully!', [
                { text: 'OK', onPress: () => navigation.goBack() }
            ]);
        } catch (error) {
            console.error('Error creating listing:', error);
            Alert.alert('Error', 'Failed to create listing');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.form}>
                <Text style={styles.label}>Photos</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imagesRow}>
                    <TouchableOpacity style={styles.addImageBtn} onPress={pickImage}>
                        <Ionicons name="camera" size={32} color={colors.gray} />
                        <Text style={styles.addImageText}>Add Photos</Text>
                    </TouchableOpacity>
                    {images.map((uri, index) => (
                        <Image key={index} source={{ uri }} style={styles.imagePreview} />
                    ))}
                </ScrollView>

                <Text style={styles.label}>Title *</Text>
                <TextInput
                    style={styles.input}
                    placeholder="What are you renting?"
                    value={title}
                    onChangeText={setTitle}
                />

                <Text style={styles.label}>Description</Text>
                <TextInput
                    style={[styles.input, styles.textArea]}
                    placeholder="Describe your item..."
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={4}
                />

                <Text style={styles.label}>Price per day (₹) *</Text>
                <TextInput
                    style={styles.input}
                    placeholder="100"
                    value={price}
                    onChangeText={setPrice}
                    keyboardType="numeric"
                />

                <Text style={styles.label}>Security Deposit (₹)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="500"
                    value={deposit}
                    onChangeText={setDeposit}
                    keyboardType="numeric"
                />

                <TouchableOpacity
                    style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    <Text style={styles.submitBtnText}>
                        {loading ? 'Creating...' : 'Create Listing'}
                    </Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    form: { padding: spacing.lg },
    label: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.xs, marginTop: spacing.md },
    input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.grayLighter, borderRadius: borderRadius.md, padding: spacing.md, fontSize: 16 },
    textArea: { height: 100, textAlignVertical: 'top' },
    imagesRow: { flexDirection: 'row', marginBottom: spacing.md },
    addImageBtn: { width: 100, height: 100, backgroundColor: colors.grayLightest, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.grayLighter, borderStyle: 'dashed' },
    addImageText: { fontSize: 12, color: colors.gray, marginTop: 4 },
    imagePreview: { width: 100, height: 100, borderRadius: borderRadius.md, marginLeft: spacing.sm },
    submitBtn: { backgroundColor: colors.primary, padding: spacing.md, borderRadius: borderRadius.md, alignItems: 'center', marginTop: spacing.xl },
    submitBtnDisabled: { opacity: 0.7 },
    submitBtnText: { color: colors.white, fontSize: 16, fontWeight: '600' },
});

export default CreateListingScreen;
