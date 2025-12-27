// Login Screen
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
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../config/firebase';
import colors from '../../styles/colors';
import { spacing, borderRadius } from '../../styles/common';

const LoginScreen = ({ navigation }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }

        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // Navigation handled by AppNavigator on auth state change
        } catch (error) {
            let message = 'Login failed. Please try again.';
            if (error.code === 'auth/invalid-email') {
                message = 'Invalid email address.';
            } else if (error.code === 'auth/user-not-found') {
                message = 'No account found with this email.';
            } else if (error.code === 'auth/wrong-password') {
                message = 'Incorrect password.';
            }
            Alert.alert('Login Error', message);
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
                {/* Logo / Header */}
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <Ionicons name="cube-outline" size={50} color={colors.primary} />
                    </View>
                    <Text style={styles.title}>RentAnything</Text>
                    <Text style={styles.subtitle}>Don't Buy. Just Rent.</Text>
                </View>

                {/* Login Form */}
                <View style={styles.form}>
                    <Text style={styles.formTitle}>Welcome Back</Text>

                    {/* Email Input */}
                    <View style={styles.inputContainer}>
                        <Ionicons name="mail-outline" size={20} color={colors.gray} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Email address"
                            placeholderTextColor={colors.grayLight}
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    {/* Password Input */}
                    <View style={styles.inputContainer}>
                        <Ionicons name="lock-closed-outline" size={20} color={colors.gray} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="Password"
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

                    {/* Forgot Password */}
                    <TouchableOpacity style={styles.forgotPassword}>
                        <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
                    </TouchableOpacity>

                    {/* Login Button */}
                    <TouchableOpacity
                        style={[styles.loginButton, loading && styles.loginButtonDisabled]}
                        onPress={handleLogin}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={colors.white} />
                        ) : (
                            <Text style={styles.loginButtonText}>Login</Text>
                        )}
                    </TouchableOpacity>

                    {/* Divider */}
                    <View style={styles.divider}>
                        <View style={styles.dividerLine} />
                        <Text style={styles.dividerText}>OR</Text>
                        <View style={styles.dividerLine} />
                    </View>

                    {/* Google Sign In */}
                    <TouchableOpacity style={styles.googleButton}>
                        <Ionicons name="logo-google" size={20} color={colors.textPrimary} />
                        <Text style={styles.googleButtonText}>Continue with Google</Text>
                    </TouchableOpacity>
                </View>

                {/* Register Link */}
                <View style={styles.footer}>
                    <Text style={styles.footerText}>Don't have an account? </Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                        <Text style={styles.registerLink}>Register</Text>
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
        justifyContent: 'center',
        padding: spacing.lg,
    },
    header: {
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    logoContainer: {
        width: 80,
        height: 80,
        borderRadius: 20,
        backgroundColor: colors.primaryLight + '20',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.primary,
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
    formTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: spacing.lg,
        textAlign: 'center',
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
    forgotPassword: {
        alignSelf: 'flex-end',
        marginBottom: spacing.lg,
    },
    forgotPasswordText: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '500',
    },
    loginButton: {
        backgroundColor: colors.primary,
        borderRadius: borderRadius.md,
        paddingVertical: spacing.md,
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    loginButtonDisabled: {
        opacity: 0.7,
    },
    loginButtonText: {
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
    registerLink: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '600',
    },
});

export default LoginScreen;
