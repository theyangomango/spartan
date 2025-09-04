import React, { useCallback, useMemo } from 'react';
import { Dimensions, FlatList, StyleSheet, View, Text, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PreviewPhoto from './PreviewPhoto';

const screenWidth = Dimensions.get('window').width;
const NUM_COLUMNS = 3;
const ITEM_SIZE = screenWidth / NUM_COLUMNS;

const PreviewPhotosModal = ({ assets, images, selectedOrderMap, toggleSelect, loadMoreAssets, loading, hasNextPage, clearSelection }) => {
    const selectedSet = useMemo(() => new Set(images), [images]);

    const renderPhoto = useCallback(({ item }) => {
        const selected = selectedSet.has(item.uri);
        const order = selected ? (selectedOrderMap.get(item.uri) || 0) : 0;
        return (
            <PreviewPhoto
                id={item.id}
                uri={item.uri}
                selected={selected}
                order={order}
                onToggle={toggleSelect}
            />
        );
    }, [selectedSet, selectedOrderMap, toggleSelect]);

    const keyExtractor = useCallback((item) => item.id, []);

    // Avoid custom getItemLayout to prevent measurement mismatches inside BottomSheet transforms.

    const onEndReached = useCallback(() => {
        if (hasNextPage && !loading) loadMoreAssets();
    }, [hasNextPage, loading, loadMoreAssets]);

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.headerTitle}>All Photos</Text>
                <View style={styles.headerRight}>
                    {images.length > 0 && (
                        <>
                            <Pressable onPress={clearSelection} hitSlop={10} style={styles.clearPill} android_disableSound>
                                <Ionicons name="close" size={14} color="#4A5568" style={{ marginRight: 6 }} />
                                <Text style={styles.clearPillText}>Clear</Text>
                            </Pressable>
                            <Text style={styles.selectionCount}>{images.length} selected</Text>
                        </>
                    )}
                </View>
            </View>
            <FlatList
                data={assets}
                renderItem={renderPhoto}
                keyExtractor={keyExtractor}
                numColumns={NUM_COLUMNS}
                extraData={images}
                initialNumToRender={90}
                maxToRenderPerBatch={90}
                updateCellsBatchingPeriod={8}
                windowSize={21}
                removeClippedSubviews={false}
                onEndReached={onEndReached}
                onEndReachedThreshold={0.5}
                ListFooterComponent={loading ? (
                    <View style={{ paddingVertical: 12 }}>
                        <ActivityIndicator color="#0699FF" />
                    </View>
                ) : null}
                style={styles.flatlist}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#f3f3f3',
        flex: 1,
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        overflow: 'hidden'
    },
    flatlist: {
        backgroundColor: '#f3f3f3',
    },
    headerRow: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#f3f3f3',
    },
    headerTitle: {
        fontFamily: 'Mulish_700Bold',
        fontSize: 16,
        color: '#333',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    clearPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#ECEFF4',
        marginRight: 10,
    },
    clearPillText: {
        fontFamily: 'Mulish_700Bold',
        fontSize: 12,
        color: '#4A5568',
    },
    selectionCount: {
        fontFamily: 'Mulish_700Bold',
        fontSize: 13,
        color: '#0699FF',
        marginLeft: 4,
    },
});

export default PreviewPhotosModal;
