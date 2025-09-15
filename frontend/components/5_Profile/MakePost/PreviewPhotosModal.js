import React, { useCallback, useRef } from 'react';
import { Dimensions, StyleSheet, View, Text, ActivityIndicator, Pressable } from 'react-native';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import PreviewPhoto from './PreviewPhoto';
import theme from '../../../theme/mfpDark';
import scaleSize from '../../../helper/scaleSize';

const screenWidth = Dimensions.get('window').width;
const NUM_COLUMNS = 3;
const ITEM_SIZE = screenWidth / NUM_COLUMNS;

const PreviewPhotosModal = ({ assets, images, selectedOrderMap, toggleSelect, loadMoreAssets, loading, hasNextPage, clearSelection, isLimited, onRequestMoreAccess }) => {
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
    // Remove getItemLayout for multi-column stability; RN can measure accurately here.

    const onEndReached = useCallback(() => {
        if (hasNextPage && !loading) loadMoreAssets();
    }, [hasNextPage, loading, loadMoreAssets]);

    const handleScroll = useCallback(({ nativeEvent }) => {
        const { contentSize, layoutMeasurement, contentOffset } = nativeEvent;
        const distanceFromBottom = contentSize.height - (layoutMeasurement.height + contentOffset.y);
        if (distanceFromBottom < ITEM_SIZE * 3) {
            if (hasNextPage && !loading) {
                loadMoreAssets();
            }
        }
    }, [hasNextPage, loading, loadMoreAssets]);

    // Ensure the grid fills the viewport when expanded (even if onEndReached doesn't fire)
    const listHeightRef = useRef(0);
    const contentHeightRef = useRef(0);
    const ensureFilled = useCallback(() => {
        if (hasNextPage && !loading) {
            const deficit = listHeightRef.current + ITEM_SIZE * 2 - contentHeightRef.current;
            if (deficit > 0) {
                loadMoreAssets();
            }
        }
    }, [hasNextPage, loading, loadMoreAssets]);

    return (
        <View style={styles.container}>
            <View style={styles.headerRow}>
                <Text style={styles.headerTitle}>All Photos</Text>
                <View style={styles.headerRight}>
                    {isLimited && (
                        <Pressable onPress={onRequestMoreAccess} hitSlop={10} style={styles.allowMorePill} android_disableSound>
                            <Ionicons name="images-outline" size={14} color={theme.accentBlue} style={{ marginRight: scaleSize(6) }} />
                            <Text style={styles.allowMoreText}>Allow More Photos</Text>
                        </Pressable>
                    )}
                    {images.length > 0 && (
                        <>
                            <Pressable onPress={clearSelection} hitSlop={10} style={styles.clearPill} android_disableSound>
                                <Ionicons name="close" size={14} color={theme.textSecondary} style={{ marginRight: scaleSize(6) }} />
                                <Text style={styles.clearPillText}>Clear</Text>
                            </Pressable>
                            <Text style={styles.selectionCount}>{images.length} selected</Text>
                        </>
                    )}
                </View>
            </View>
            <BottomSheetFlatList
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
                shouldItemUpdate={(prev, next) => {
                    const uri = next.item?.uri;
                    const prevOrder = prev.extraData?.get(uri) || 0;
                    const nextOrder = next.extraData?.get(uri) || 0;
                    return prevOrder !== nextOrder;
                }}
                onEndReached={onEndReached}
                onEndReachedThreshold={0.5}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                onLayout={(e) => {
                    listHeightRef.current = e.nativeEvent.layout.height;
                    ensureFilled();
                }}
                onContentSizeChange={(_, h) => {
                    contentHeightRef.current = h;
                    ensureFilled();
                }}
                ListFooterComponent={loading ? (
                    <View style={{ paddingVertical: scaleSize(12) }}>
                        <ActivityIndicator color={theme.primary} />
                    </View>
                ) : null}
                style={styles.flatlist}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: theme.surface,
        flex: 1,
        borderTopLeftRadius: scaleSize(25),
        borderTopRightRadius: scaleSize(25),
        overflow: 'hidden'
    },
    flatlist: {
        backgroundColor: theme.surface,
    },
    headerRow: {
        paddingHorizontal: scaleSize(12),
        paddingVertical: scaleSize(10),
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: theme.surface,
    },
    headerTitle: {
        fontFamily: 'Mulish_700Bold',
        fontSize: scaleSize(16),
        color: theme.textPrimary,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    allowMorePill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scaleSize(10),
        height: scaleSize(28),
        borderRadius: scaleSize(14),
        backgroundColor: theme.field,
        marginRight: scaleSize(10),
        borderWidth: scaleSize(1),
        borderColor: theme.accentBlue,
    },
    allowMoreText: {
        fontFamily: 'Mulish_700Bold',
        fontSize: scaleSize(12),
        color: theme.accentBlue,
    },
    clearPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scaleSize(10),
        height: scaleSize(28),
        borderRadius: scaleSize(14),
        backgroundColor: theme.field,
        marginRight: scaleSize(10),
    },
    clearPillText: {
        fontFamily: 'Mulish_700Bold',
        fontSize: scaleSize(12),
        color: theme.textPrimary,
    },
    selectionCount: {
        fontFamily: 'Mulish_700Bold',
        fontSize: scaleSize(13),
        color: theme.primary,
        marginLeft: scaleSize(4),
    },
});

export default PreviewPhotosModal;
