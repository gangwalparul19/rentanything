// Register Screen
import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import colors from '../../styles/colors';
import { spacing, borderRadius } from '../../styles/common';

const RegisterScreen = ({ navigation }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [acceptTerms, setAcceptTerms] = useState(false);

    const handleRegister = async () => {
        // Validation
        if (!name || !email || !password || !confirmPassword) {
            Alert.alert('Error', 'Please fill in all required fields');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }
        if (password.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }
        if (!acceptTerms) {
            Alert.alert('Error', 'Please accept the Terms of Service');
            return;
        }

        setLoading(true);
        try {
            // Create user with Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // Update display name
            await updateProfile(user, { displayName: name });

            // Create user document in Firestore
            await setDoc(doc(db, 'users', user.uid), {
                name,
                email,
                phone: phone || '',
                photoURL: null,
                createdAt: serverTimestamp(),
                isVerified: false,
                society: 'Megapolis',
                building: '',
                flat: '',
                bio: '',
                role: 'user',
            });

            // Navigation handled by AppNavigator on auth state change
        } catch (error) {
            let message = 'Registration failed. Please try again.';
            if (error.code === 'auth/email-already-in-use') {
                message = 'An account with this email already exists.';
            } else if (error.code === 'auth/invalid-email') {
                message = 'Invalid email address.';
            } else if (error.code === 'auth/weak-password') {
                message = 'Password is too weak.';
            }
            Alert.alert('Registration Error', message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.title}>Create Account</Text>
                    <Text style={styles.subtitle}>Join the RentAnything community</Text>
                </View>

                {/* Registration Form */}
                <View style={styles.form}>
                    {/* Name Input */}
                    <View style={styles.inputContainer}>
                        <Ionicons name="person-outline" size={20} color={colors.gray} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Full Name *"
                            placeholderTextColor={colors.grayLight}
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                        />
                    </View>

                    {/* Email Input */}
                    <View style={styles.inputContainer}>
                        <Ionicons name="mail-outline" size={20} color={colors.gray} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Email address *"
                            placeholderTextColor={colors.grayLight}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    {/* Phone Input */}
                    <View style={styles.inputContainer}>
                        <Ionicons name="call-outline" size={20} color={colors.gray} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Phone Number (optional)"
                            placeholderTextColor={colors.grayLight}
                            value={phone}
                            onChangeText={setPhone}
                            keyboardType="phone-pad"
                        />
                    </View>

                    {/* Password Input */}
                    <View style={styles.inputContainer}>
                        <Ionicons name="lock-closed-outline" size={20} color={colors.gray} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Password *"
                            placeholderTextColor={colors.grayLight}
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry={!showPassword}
                        />
                        <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
                            <Ionicons
                                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                                size={20}
                                color={colors.gray}
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Confirm Password Input */}
                    <View style={styles.inputContainer}>
                        <Ionicons name="lock-closed-outline" size={20} color={colors.gray} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Confirm Password *"
                            placeholderTextColor={colors.grayLight}
                            value={confirmPassword}
                            onChangeText={setConfirmPassword}
                            secureTextEntry={!showPassword}
                        />
                    </View>

                    {/* Terms Checkbox */}
                    <TouchableOpacity
                        style={styles.termsContainer}
                        onPress={() => setAcceptTerms(!acceptTerms)}
                    >
                        <View style={[styles.checkbox, acceptTerms && styles.checkboxChecked]}>
                            {acceptTerms && <Ionicons name="checkmark" size={16} color={colors.white} />}
                        </View>
                        <Text style={styles.termsText}>
                            I agree to the <Text style={styles.termsLink}>Terms of Service</Text> and{' '}
                            <Text style={styles.termsLink}>Privacy Policy</Text>
                        </Text>
                    </TouchableOpacity>

                    {/* Register Button */}
                    <TouchableOpacity
                        style={[styles.registerButton, loading && styles.registerButtonDisabled]}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={colors.white} />
                        ) : (
                            <Text style={styles.registerButtonText}>Create Account</Text>
                        )}
                    </TouchableOpacity>

                    {/* Divider */}
                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>OR</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    {/* Google Sign Up */}
                    <TouchableOpacity style={styles.googleButton}>
                        <Ionicons name="logo-google" size={20} color={colors.textPrimary} />
                        <Text style={styles.googleButtonText}>Sign up with Google</Text>
                    </TouchableOpacity>
                </View>

                {/* Login Link */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Already have an account? </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                        <Text style={styles.loginLink}>Login</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        flexGrow: 1,
        padding: spacing.lg,
        paddingTop: spacing.xl + 20,
    },
    header: {
        marginBottom: spacing.lg,
    },
    backButton: {
        marginBottom: spacing.md,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.textPrimary,
        marginBottom: spacing.xs,
    },
    subtitle: {
        fontSize: 16,
        color: colors.gray,
    },
    form: {
        backgroundColor: colors.white,
        borderRadius: borderRadius.xl,
        padding: spacing.lg,
        marginBottom: spacing.lg,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.grayLightest,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.grayLighter,
    },
    inputIcon: {
        marginRight: spacing.sm,
    },
    input: {
        flex: 1,
        paddingVertical: spacing.md,
        fontSize: 16,
        color: colors.textPrimary,
    },
    termsContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: spacing.lg,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: colors.grayLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.sm,
        marginTop: 2,
    },
    checkboxChecked: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    termsText: {
        flex: 1,
        fontSize: 14,
        color: colors.gray,
        lineHeight: 20,
    },
    termsLink: {
        color: colors.primary,
        fontWeight: '500',
    },
    registerButton: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.md,
        paddingVertical: spacing.md,
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    registerButtonDisabled: {
        opacity: 0.7,
    },
    registerButtonText: {
        color: colors.white,
        fontSize: 16,
        fontWeight: '600',
    },
    divider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.grayLighter,
    },
    dividerText: {
        color: colors.gray,
        marginHorizontal: spacing.md,
        fontSize: 14,
    },
    googleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.white,
        borderRadius: borderRadius.md,
        paddingVertical: spacing.md,
        borderWidth: 1,
        borderColor: colors.grayLighter,
    },
    googleButtonText: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '500',
        marginLeft: spacing.sm,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    footerText: {
        color: colors.gray,
        fontSize: 14,
    },
    loginLink: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '600',
    },
});

export default RegisterScreen;
