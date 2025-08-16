// components/FoodSearchOverlay.js
import React, { useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    Pressable,
    Modal,
    KeyboardAvoidingView,
    Platform,
    FlatList,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
// NOTE: path is relative to /components since this file lives in /components
import SearchResultCard from './SearchResultCard';

export default function FoodSearchOverlay({
    visible,
    activeMeal,
    searchQuery,
    setSearchQuery,
    searchResults,
    onClose,
    COLORS, // <- pass the same COLORS object from the parent
}) {
    const styles = useMemo(() => makeStyles(COLORS), [COLORS]);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={onClose}
        >
            <View style={styles.overlayContainer}>
                {/* Overlay Header */}
                <View style={styles.overlayHeader}>
                    <Pressable onPress={onClose} hitSlop={10}>
                        <Ionicons name="chevron-back" size={26} color={COLORS.textPrimary} />
                    </Pressable>
                    <Text style={styles.overlayTitle}>
                        {activeMeal ? `Add to ${activeMeal}` : 'Add food'}
                    </Text>
                    <View style={{ width: 26 }} />
                </View>

                {/* Search Bar (only visible in overlay) */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchBox}>
                        <Ionicons name="search" size={18} color="#999" style={{ marginRight: 10 }} />
                        <TextInput
                            autoFocus
                            placeholder="Search for a food..."
                            placeholderTextColor="#999"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            style={styles.searchInput}
                            returnKeyType="search"
                        />
                        {searchQuery?.length > 0 && (
                            <Pressable onPress={() => setSearchQuery('')}>
                                <Ionicons name="close-circle" size={20} color="#999" style={{ marginRight: 5 }} />
                            </Pressable>
                        )}
                    </View>
                </View>

                {/* Results */}
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <FlatList
                        contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 24 }}
                        data={searchResults}
                        keyExtractor={(item) => String(item.food_id)}
                        keyboardShouldPersistTaps="handled"
                        renderItem={({ item }) => <SearchResultCard item={item} />}
                        ListEmptyComponent={
                            <Text style={styles.emptyText}>
                                {searchQuery ? 'Searching…' : 'Start typing to search foods'}
                            </Text>
                        }
                    />
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

const makeStyles = (COLORS) =>
    StyleSheet.create({
        overlayContainer: { flex: 1, backgroundColor: COLORS.background },
        overlayHeader: {
            paddingTop: 56,
            paddingBottom: 12,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: COLORS.background,
        },
        overlayTitle: {
            fontSize: 18,
            color: COLORS.textPrimary,
            fontFamily: 'Outfit_600SemiBold', // ← unchanged
        },
        searchContainer: { paddingHorizontal: 18, marginBottom: 20 },
        searchBox: {
            backgroundColor: '#fff',
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: 20,
            paddingHorizontal: 14,
            paddingVertical: 13,
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowOffset: { width: 0, height: 1 },
            shadowRadius: 3,
            elevation: 2,
        },
        searchInput: {
            flex: 1,
            fontFamily: 'Outfit_400Regular', // ← unchanged
            fontSize: 15,
            color: COLORS.textPrimary,
            paddingVertical: 0,
        },
        emptyText: {
            textAlign: 'center',
            marginTop: 24,
            color: COLORS.textSecondary,
            fontFamily: 'Outfit_400Regular', // ← unchanged
        },
    });
