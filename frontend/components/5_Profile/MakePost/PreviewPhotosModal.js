import React, { useCallback, useRef } from 'react';
import { Dimensions, StyleSheet, View, Text, ActivityIndicator, Pressable } from 'react-native';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import PreviewPhoto from './PreviewPhoto';
import theme from '../../../theme/mfpDark';
import scaleSize from '../../../helper/scaleSize';
import { withStrongPress } from "../../../utils/haptics";

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
                <View style={styles.headerLeft}>
                    {isLimited && (
                        <Pressable onPress={withStrongPress(onRequestMoreAccess)} hitSlop={10} style={styles.allowMorePill} android_disableSound>
                            <Ionicons name="images-outline" size={16} color={theme.accentBlue} style={{ marginRight: scaleSize(6) }} />
                            <Text style={styles.allowMoreText}>Allow More Photos</Text>
                        </Pressable>
                    )}
                    {images.length > 0 && (
                        <Pressable onPress={withStrongPress(clearSelection)} hitSlop={10} style={styles.clearPill} android_disableSound>
                            <Ionicons name="close" size={16} color={theme.textSecondary} style={{ marginRight: scaleSize(6) }} />
                            <Text style={styles.clearPillText}>Clear</Text>
                        </Pressable>
                    )}
                </View>
                <View style={styles.headerRight}>
                    {images.length > 0 && (
                        <View style={styles.selectionPill}>
                            <Text style={styles.selectionPillText}>{images.length} selected</Text>
                        </View>
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
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        flexShrink: 0,
    },
    allowMorePill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scaleSize(14),
        height: scaleSize(36),
        borderRadius: scaleSize(18),
        backgroundColor: theme.field,
        marginRight: scaleSize(12),
        borderWidth: scaleSize(1),
        borderColor: theme.accentBlue,
    },
    allowMoreText: {
        fontFamily: 'Mulish_700Bold',
        fontSize: scaleSize(13),
        color: theme.accentBlue,
    },
    clearPill: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scaleSize(14),
        height: scaleSize(36),
        borderRadius: scaleSize(18),
        backgroundColor: theme.field,
        borderWidth: scaleSize(1),
        borderColor: theme.primaryHairline,
    },
    clearPillText: {
        fontFamily: 'Mulish_700Bold',
        fontSize: scaleSize(14),
        color: theme.textPrimary,
    },
    selectionPill: {
        backgroundColor: theme.primary,
        borderRadius: scaleSize(18),
        paddingHorizontal: scaleSize(16),
        paddingVertical: scaleSize(9),
    },
    selectionPillText: {
        fontFamily: 'Mulish_700Bold',
        fontSize: scaleSize(14),
        color: '#fff',
    },
});

export default PreviewPhotosModal;
