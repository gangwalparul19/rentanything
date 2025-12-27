// Tab Navigator - Bottom tab navigation
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import colors from '../styles/colors';

// Tab Screens
import HomeScreen from '../screens/home/HomeScreen';
import SearchScreen from '../screens/search/SearchScreen';
import PropertiesScreen from '../screens/properties/PropertiesScreen';
import ChatListScreen from '../screens/chat/ChatListScreen';
import ProfileScreen from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator();

const TabNavigator = () => {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;

                    switch (route.name) {
                        case 'Home':
                            iconName = focused ? 'home' : 'home-outline';
                            break;
                        case 'Search':
                            iconName = focused ? 'search' : 'search-outline';
                            break;
                        case 'Properties':
                            iconName = focused ? 'business' : 'business-outline';
                            break;
                        case 'Messages':
                            iconName = focused ? 'chatbubbles' : 'chatbubbles-outline';
                            break;
                        case 'Profile':
                            iconName = focused ? 'person' : 'person-outline';
                            break;
                        default:
                            iconName = 'ellipse';
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
                tabBarActiveTintColor: colors.primary,
                tabBarInactiveTintColor: colors.gray,
                tabBarStyle: {
                    backgroundColor: colors.white,
                    borderTopColor: colors.grayLighter,
                    paddingBottom: 5,
                    paddingTop: 5,
                    height: 60,
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '500',
                },
                headerStyle: {
                    backgroundColor: colors.white,
                },
                headerTintColor: colors.textPrimary,
                headerTitleStyle: {
                    fontWeight: '600',
                },
                headerShadowVisible: false,
            })}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{ title: 'RentAnything' }}
            />
            <Tab.Screen
                name="Search"
                component={SearchScreen}
                options={{ title: 'Browse Items' }}
            />
            <Tab.Screen
                name="Properties"
                component={PropertiesScreen}
                options={{ title: 'Properties' }}
            />
            <Tab.Screen
                name="Messages"
                component={ChatListScreen}
                options={{ title: 'Messages' }}
            />
            <Tab.Screen
                name="Profile"
                component={ProfileScreen}
                options={{ title: 'Profile' }}
            />
        </Tab.Navigator>
    );
};

export default TabNavigator;
