// Main App Navigator - handles auth flow and main navigation
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../context/AuthContext';
import { ActivityIndicator, View } from 'react-native';
import colors from '../styles/colors';

// Navigators
import AuthNavigator from './AuthNavigator';
import TabNavigator from './TabNavigator';

// Detail Screens
import ListingDetailsScreen from '../screens/listings/ListingDetailsScreen';
import PropertyDetailsScreen from '../screens/properties/PropertyDetailsScreen';
import CreateListingScreen from '../screens/listings/CreateListingScreen';
import ListPropertyScreen from '../screens/properties/ListPropertyScreen';
import ChatScreen from '../screens/chat/ChatScreen';
import EditProfileScreen from '../screens/profile/EditProfileScreen';
import MyListingsScreen from '../screens/listings/MyListingsScreen';
import MyBookingsScreen from '../screens/bookings/MyBookingsScreen';
import WishlistScreen from '../screens/wishlist/WishlistScreen';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
    const { user, initializing } = useAuth();

    // Show loading spinner while checking auth state
    if (initializing) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{
                    headerStyle: {
                        backgroundColor: colors.white,
                    },
                    headerTintColor: colors.primary,
                    headerTitleStyle: {
                        fontWeight: '600',
                    },
                    headerShadowVisible: false,
                }}
            >
                {user ? (
                    // Authenticated screens
                    <>
                        <Stack.Screen
                            name="MainTabs"
                            component={TabNavigator}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="ListingDetails"
                            component={ListingDetailsScreen}
                            options={{ title: 'Item Details' }}
                        />
                        <Stack.Screen
                            name="PropertyDetails"
                            component={PropertyDetailsScreen}
                            options={{ title: 'Property Details' }}
                        />
                        <Stack.Screen
                            name="CreateListing"
                            component={CreateListingScreen}
                            options={{ title: 'Create Listing' }}
                        />
                        <Stack.Screen
                            name="ListProperty"
                            component={ListPropertyScreen}
                            options={{ title: 'List Property' }}
                        />
                        <Stack.Screen
                            name="Chat"
                            component={ChatScreen}
                            options={({ route }) => ({ title: route.params?.userName || 'Chat' })}
                        />
                        <Stack.Screen
                            name="EditProfile"
                            component={EditProfileScreen}
                            options={{ title: 'Edit Profile' }}
                        />
                        <Stack.Screen
                            name="MyListings"
                            component={MyListingsScreen}
                            options={{ title: 'My Listings' }}
                        />
                        <Stack.Screen
                            name="MyBookings"
                            component={MyBookingsScreen}
                            options={{ title: 'My Bookings' }}
                        />
                        <Stack.Screen
                            name="Wishlist"
                            component={WishlistScreen}
                            options={{ title: 'Wishlist' }}
                        />
                    </>
                ) : (
                    // Auth screens
                    <Stack.Screen
                        name="Auth"
                        component={AuthNavigator}
                        options={{ headerShown: false }}
                    />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default AppNavigator;
