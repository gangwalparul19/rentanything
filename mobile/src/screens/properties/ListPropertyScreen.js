// List Property Screen - Placeholder
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../../styles/colors';
import { spacing } from '../../styles/common';

const ListPropertyScreen = () => (
    <View style={styles.container}>
        <Ionicons name="construct-outline" size={64} color={colors.grayLight} />
        <Text style={styles.title}>Coming Soon</Text>
        <Text style={styles.text}>Property listing feature is being built</Text>
    </View>
);

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background, padding: spacing.lg },
    title: { fontSize: 20, fontWeight: '600', color: colors.textPrimary, marginTop: spacing.md },
    text: { fontSize: 14, color: colors.gray, marginTop: spacing.xs },
});

export default ListPropertyScreen;
