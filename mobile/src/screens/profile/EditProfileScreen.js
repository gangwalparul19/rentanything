// Edit Profile Screen
import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useAuth } from '../../context/AuthContext';
import colors from '../../styles/colors';
import { spacing, borderRadius } from '../../styles/common';

const EditProfileScreen = ({ navigation }) => {
    const { user, userProfile, refreshProfile } = useAuth();
    const [name, setName] = useState(userProfile?.name || '');
    const [phone, setPhone] = useState(userProfile?.phone || '');
    const [society, setSociety] = useState(userProfile?.society || '');
    const [building, setBuilding] = useState(userProfile?.building || '');
    const [flat, setFlat] = useState(userProfile?.flat || '');
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        try {
            await updateDoc(doc(db, 'users', user.uid), { name, phone, society, building, flat });
            await refreshProfile();
            Alert.alert('Success', 'Profile updated!', [{ text: 'OK', onPress: () => navigation.goBack() }]);
        } catch (error) { Alert.alert('Error', 'Failed to update profile'); }
        finally { setLoading(false); }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.avatarSection}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{name?.charAt(0) || '?'}</Text></View>
                <TouchableOpacity style={styles.changePhotoBtn}><Text style={styles.changePhotoText}>Change Photo</Text></TouchableOpacity>
            </View>
            <View style={styles.form}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your name" />
                <Text style={styles.label}>Phone Number</Text>
                <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="Phone" keyboardType="phone-pad" />
                <Text style={styles.label}>Society</Text>
                <TextInput style={styles.input} value={society} onChangeText={setSociety} placeholder="e.g. Megapolis" />
                <Text style={styles.label}>Building</Text>
                <TextInput style={styles.input} value={building} onChangeText={setBuilding} placeholder="e.g. Splendour" />
                <Text style={styles.label}>Flat No</Text>
                <TextInput style={styles.input} value={flat} onChangeText={setFlat} placeholder="e.g. A-101" />
                <TouchableOpacity style={[styles.saveBtn, loading && styles.saveBtnDisabled]} onPress={handleSave} disabled={loading}>
                    <Text style={styles.saveBtnText}>{loading ? 'Saving...' : 'Save Changes'}</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    avatarSection: { alignItems: 'center', paddingVertical: spacing.xl, backgroundColor: colors.white },
    avatar: { width: 100, height: 100, borderRadius: 50, backgroundColor: colors.primary + '20', justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontSize: 40, fontWeight: '600', color: colors.primary },
    changePhotoBtn: { marginTop: spacing.md },
    changePhotoText: { color: colors.primary, fontWeight: '600' },
    form: { padding: spacing.lg },
    label: { fontSize: 14, fontWeight: '600', color: colors.textPrimary, marginBottom: spacing.xs, marginTop: spacing.md },
    input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.grayLighter, borderRadius: borderRadius.md, padding: spacing.md, fontSize: 16 },
    saveBtn: { backgroundColor: colors.primary, padding: spacing.md, borderRadius: borderRadius.md, alignItems: 'center', marginTop: spacing.xl },
    saveBtnDisabled: { opacity: 0.7 },
    saveBtnText: { color: colors.white, fontSize: 16, fontWeight: '600' },
});

export default EditProfileScreen;
