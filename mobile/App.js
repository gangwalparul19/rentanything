// RentAnything Mobile App - Simple Version
import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

// Firebase
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, onAuthStateChanged, signInAnonymously } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyAn4tsCwVcjziA81sSNz5_GG7GW2a5-0B0",
  authDomain: "rent-anything-shop.firebaseapp.com",
  projectId: "rent-anything-shop",
  storageBucket: "rent-anything-shop.firebasestorage.app",
  messagingSenderId: "453157285688",
  appId: "1:453157285688:web:27a1a725acb45a6dd99bcd",
  measurementId: "G-VNG1BQ39DG"
};

// Initialize Firebase
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}
const auth = getAuth(app);
const db = getFirestore(app);

// Colors
const colors = {
  primary: '#4F46E5',
  white: '#FFFFFF',
  background: '#F8FAFC',
  gray: '#64748B',
  grayLight: '#94A3B8',
  grayLighter: '#E2E8F0',
  textPrimary: '#1E293B',
  error: '#EF4444',
};

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// ============ LOGIN SCREEN ============
const LoginScreen = () => {
  const [loading, setLoading] = useState(false);

  const handleGuestLogin = async () => {
    setLoading(true);
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', 'Could not sign in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.loginScreen}>
      <View style={styles.loginHeader}>
        <View style={styles.logoContainer}>
          <Ionicons name="cube-outline" size={60} color={colors.primary} />
        </View>
        <Text style={styles.appName}>RentAnything</Text>
        <Text style={styles.tagline}>Don't Buy. Just Rent.</Text>
      </View>

      <View style={styles.loginContent}>
        <Text style={styles.welcomeText}>Welcome!</Text>
        <Text style={styles.loginSubtext}>
          Sign in to start renting from your neighbors
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleGuestLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <>
              <Ionicons name="enter-outline" size={22} color={colors.white} />
              <Text style={styles.primaryButtonText}>Enter App</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.noteText}>
          Note: Google Sign-In requires additional setup.
          Using guest mode for now.
        </Text>
      </View>

      <Text style={styles.termsText}>
        By continuing, you agree to our Terms of Service
      </Text>
    </View>
  );
};

// ============ HOME SCREEN ============
const HomeScreen = () => (
  <ScrollView style={styles.screen} contentContainerStyle={styles.homeContent}>
    <View style={styles.heroSection}>
      <Text style={styles.heroTitle}>
        Don't Buy. <Text style={styles.heroHighlight}>Just Rent.</Text>
      </Text>
      <Text style={styles.heroSubtitle}>
        The trusted rental marketplace for Hinjewadi
      </Text>
    </View>

    <View style={styles.quickActions}>
      <TouchableOpacity style={styles.actionCard}>
        <Ionicons name="cube-outline" size={32} color={colors.primary} />
        <Text style={styles.actionTitle}>Browse Items</Text>
        <Text style={styles.actionSubtitle}>Party, Electronics, Kids</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.actionCard}>
        <Ionicons name="business-outline" size={32} color={colors.primary} />
        <Text style={styles.actionTitle}>Properties</Text>
        <Text style={styles.actionSubtitle}>Rent, Flatmates</Text>
      </TouchableOpacity>
    </View>

    <Text style={styles.sectionTitle}>Categories</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      {['🎉 Party', '👶 Kids', '📱 Electronics', '🏠 Home', '⚽ Sports', '📚 Books'].map((cat, i) => (
        <TouchableOpacity key={i} style={styles.categoryChip}>
          <Text style={styles.categoryText}>{cat}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>

    <Text style={[styles.sectionTitle, { marginTop: 24 }]}>How It Works</Text>
    <View style={styles.stepsRow}>
      <View style={styles.stepItem}>
        <View style={styles.stepIcon}>
          <Ionicons name="search" size={24} color={colors.primary} />
        </View>
        <Text style={styles.stepLabel}>Find</Text>
      </View>
      <Ionicons name="arrow-forward" size={16} color={colors.grayLight} />
      <View style={styles.stepItem}>
        <View style={styles.stepIcon}>
          <Ionicons name="calendar" size={24} color={colors.primary} />
        </View>
        <Text style={styles.stepLabel}>Book</Text>
      </View>
      <Ionicons name="arrow-forward" size={16} color={colors.grayLight} />
      <View style={styles.stepItem}>
        <View style={styles.stepIcon}>
          <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
        </View>
        <Text style={styles.stepLabel}>Collect</Text>
      </View>
    </View>
  </ScrollView>
);

// ============ OTHER SCREENS ============
const SearchScreen = () => (
  <View style={styles.centerScreen}>
    <Ionicons name="search" size={64} color={colors.grayLight} />
    <Text style={styles.placeholderTitle}>Browse Items</Text>
    <Text style={styles.placeholderText}>Coming soon!</Text>
  </View>
);

const PropertiesScreen = () => (
  <View style={styles.centerScreen}>
    <Ionicons name="business-outline" size={64} color={colors.grayLight} />
    <Text style={styles.placeholderTitle}>Properties</Text>
    <Text style={styles.placeholderText}>Coming soon!</Text>
  </View>
);

const MessagesScreen = () => (
  <View style={styles.centerScreen}>
    <Ionicons name="chatbubbles-outline" size={64} color={colors.grayLight} />
    <Text style={styles.placeholderTitle}>Messages</Text>
    <Text style={styles.placeholderText}>Coming soon!</Text>
  </View>
);

const ProfileScreen = () => {
  const handleSignOut = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <ScrollView style={styles.screen}>
      <View style={styles.profileHeader}>
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="person" size={40} color={colors.primary} />
        </View>
        <Text style={styles.profileName}>Guest User</Text>
        <Text style={styles.profileEmail}>Browsing as guest</Text>
      </View>

      <View style={styles.menuSection}>
        {[
          { icon: 'cube-outline', label: 'My Listings' },
          { icon: 'calendar-outline', label: 'My Bookings' },
          { icon: 'heart-outline', label: 'Wishlist' },
          { icon: 'settings-outline', label: 'Settings' },
        ].map((item, i) => (
          <TouchableOpacity key={i} style={styles.menuItem}>
            <Ionicons name={item.icon} size={22} color={colors.primary} />
            <Text style={styles.menuLabel}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.grayLight} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Ionicons name="log-out-outline" size={22} color={colors.error} />
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

// ============ TAB NAVIGATOR ============
const TabNavigator = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      tabBarIcon: ({ focused, color, size }) => {
        let iconName;
        switch (route.name) {
          case 'Home': iconName = focused ? 'home' : 'home-outline'; break;
          case 'Search': iconName = focused ? 'search' : 'search-outline'; break;
          case 'Properties': iconName = focused ? 'business' : 'business-outline'; break;
          case 'Messages': iconName = focused ? 'chatbubbles' : 'chatbubbles-outline'; break;
          case 'Profile': iconName = focused ? 'person' : 'person-outline'; break;
          default: iconName = 'ellipse';
        }
        return <Ionicons name={iconName} size={size} color={color} />;
      },
      tabBarActiveTintColor: colors.primary,
      tabBarInactiveTintColor: colors.gray,
      tabBarStyle: { paddingBottom: 5, height: 60 },
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} options={{ title: 'RentAnything' }} />
    <Tab.Screen name="Search" component={SearchScreen} options={{ title: 'Browse' }} />
    <Tab.Screen name="Properties" component={PropertiesScreen} />
    <Tab.Screen name="Messages" component={MessagesScreen} />
    <Tab.Screen name="Profile" component={ProfileScreen} />
  </Tab.Navigator>
);

// ============ MAIN APP ============
export default function App() {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setInitializing(false);
    });

    // Timeout fallback
    const timeout = setTimeout(() => setInitializing(false), 5000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  if (initializing) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            <Stack.Screen name="Main" component={TabNavigator} />
          ) : (
            <Stack.Screen name="Login" component={LoginScreen} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

// ============ STYLES ============
const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 16,
    color: colors.gray,
  },

  // Login
  loginScreen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    justifyContent: 'space-between',
  },
  loginHeader: {
    alignItems: 'center',
    marginTop: 80,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
  },
  tagline: {
    fontSize: 16,
    color: colors.gray,
  },
  loginContent: {
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  loginSubtext: {
    fontSize: 16,
    color: colors.gray,
    marginBottom: 32,
    textAlign: 'center',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
  noteText: {
    fontSize: 12,
    color: colors.grayLight,
    marginTop: 16,
    textAlign: 'center',
  },
  termsText: {
    fontSize: 12,
    color: colors.grayLight,
    textAlign: 'center',
  },

  // Screens
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  placeholderTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 16,
  },
  placeholderText: {
    fontSize: 14,
    color: colors.gray,
    marginTop: 8,
  },

  // Home
  homeContent: {
    padding: 16,
    paddingBottom: 32,
  },
  heroSection: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.white,
  },
  heroHighlight: {
    color: '#FCD34D',
  },
  heroSubtitle: {
    fontSize: 14,
    color: colors.white + 'CC',
    marginTop: 8,
  },
  quickActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  actionCard: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
    marginTop: 8,
  },
  actionSubtitle: {
    fontSize: 11,
    color: colors.gray,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
  },
  categoryChip: {
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.grayLighter,
  },
  categoryText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  stepsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 20,
  },
  stepItem: {
    alignItems: 'center',
    marginHorizontal: 16,
  },
  stepIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: colors.textPrimary,
  },

  // Profile
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: colors.white,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  profileEmail: {
    fontSize: 14,
    color: colors.gray,
  },
  menuSection: {
    backgroundColor: colors.white,
    margin: 16,
    borderRadius: 12,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.grayLighter,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    marginLeft: 12,
  },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: colors.error + '10',
    borderRadius: 12,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.error,
    marginLeft: 8,
  },
});
