import React, { useCallback } from 'react';
import { Dimensions, FlatList, StyleSheet, View, Text, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import PreviewPhoto from './PreviewPhoto';

const screenWidth = Dimensions.get('window').width;
const NUM_COLUMNS = 3;
const ITEM_SIZE = screenWidth / NUM_COLUMNS;

const PreviewPhotosModal = ({ assets, images, selectedOrderMap, toggleSelect, loadMoreAssets, loading, hasNextPage, clearSelection }) => {
    const renderPhoto = useCallback(({ item }) => {
        const order = selectedOrderMap.get(item.uri) || 0;
        const selected = order > 0;
        return (
            <PreviewPhoto
                id={item.id}
                uri={item.uri}
                selected={selected}
                order={order}
                onToggle={toggleSelect}
            />
        );
    }, [selectedOrderMap, toggleSelect]);

    const keyExtractor = useCallback((item) => item.id, []);
    const getItemLayout = useCallback((_, index) => {
        const row = Math.floor(index / NUM_COLUMNS);
        return { length: ITEM_SIZE, offset: row * ITEM_SIZE, index };
    }, []);

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
                extraData={selectedOrderMap}
                initialNumToRender={48}
                maxToRenderPerBatch={24}
                updateCellsBatchingPeriod={12}
                windowSize={9}
                removeClippedSubviews={false}
                getItemLayout={getItemLayout}
                shouldItemUpdate={(prev, next) => {
                    const uri = next.item?.uri;
                    const prevOrder = prev.extraData?.get(uri) || 0;
                    const nextOrder = next.extraData?.get(uri) || 0;
                    return prevOrder !== nextOrder;
                }}
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
