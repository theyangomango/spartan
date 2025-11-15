import React, { useCallback, useRef } from 'react';
import { Dimensions, StyleSheet, View, Text, ActivityIndicator, Pressable } from 'react-native';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import PreviewPhoto from './PreviewPhoto';
import theme from '../../../theme/mfpDark';
import scaleSize from '../../../helper/scaleSize';
import { withStrongPress } from "../../../utils/haptics";

const screenWidth = Dimensions.get('window').width;
const NUM_COLUMNS = 3;
const ITEM_SIZE = screenWidth / NUM_COLUMNS;

const PreviewPhotosModal = ({ assets, images, selectedOrderMap, toggleSelect, loadMoreAssets, loading, hasNextPage, isLimited, onRequestMoreAccess }) => {
    const renderPhoto = useCallback(({ item }) => {
        const key = item.id || item.uri;
        const order = selectedOrderMap.get(key) || selectedOrderMap.get(item.uri) || 0;
        const selected = order > 0;
        const type = item.mediaType === MediaLibrary.MediaType.video ? 'video' : 'image';
        const duration = Number(item.duration) || 0;
        return (
            <PreviewPhoto
                asset={item}
                id={item.id}
                uri={item.uri}
                type={type}
                duration={duration}
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
            {isLimited && (
                <View style={styles.headerRow}>
                    <Pressable onPress={withStrongPress(onRequestMoreAccess)} hitSlop={10} style={styles.allowMorePill} android_disableSound>
                        <Ionicons name="images-outline" size={16} color={theme.accentBlue} style={{ marginRight: scaleSize(6) }} />
                        <Text style={styles.allowMoreText}>Allow More Photos</Text>
                    </Pressable>
                </View>
            )}
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
                    const itemKey = next.item?.id || next.item?.uri;
                    const prevOrder = prev.extraData?.get(itemKey) || prev.extraData?.get(next.item?.uri) || 0;
                    const nextOrder = next.extraData?.get(itemKey) || next.extraData?.get(next.item?.uri) || 0;
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
        overflow: 'hidden'
    },
    flatlist: {
        backgroundColor: theme.surface,
    },
    headerRow: {
        paddingHorizontal: scaleSize(12),
        paddingVertical: scaleSize(10),
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        backgroundColor: theme.surface,
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
});

export default PreviewPhotosModal;
