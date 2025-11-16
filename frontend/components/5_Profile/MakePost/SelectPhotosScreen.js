import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, Image, SafeAreaView, useWindowDimensions, Platform, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import Gallery from 'react-native-awesome-gallery';
import PreviewPhotosBottomSheet from './PreviewPhotosBottomSheet';
import ImageCropperModal from './ImageCropperModal';
import theme from '../../../theme/mfpDark';
import scaleSize from '../../../helper/scaleSize';
import { withStrongPress } from "../../../utils/haptics";
import * as VideoThumbnails from 'expo-video-thumbnails';
import CroppedVideo from '../../common/CroppedVideo';

const scaledSize = (size) => scaleSize(size);
const FEED_ASPECT_RATIO = 1; // square crop across selection & preview
const MEDIA_TYPES = [MediaLibrary.MediaType.photo, MediaLibrary.MediaType.video];

const normalizeSelectionEntry = (entry, index = 0) => {
    if (!entry) return null;
    if (typeof entry === 'string') {
        return {
            assetId: null,
            originalUri: entry,
            uri: entry,
            previewUri: entry,
            localUri: entry.startsWith('file://') ? entry : null,
            type: 'image',
            duration: 0,
            cropRect: null,
        };
    }
    if (typeof entry === 'object') {
        const uri = entry.uri || entry.url || entry.image || entry.path || null;
        if (!uri) return null;
        const type = entry.type === 'video' ? 'video' : 'image';
        const originalUri = entry.originalUri || uri;
        const previewUri = entry.previewUri || uri;
        const localUri = entry.localUri || (uri.startsWith('file://') ? uri : null);
        const assetId = entry.assetId || entry.id || `initial-${index}-${originalUri}`;
        return {
            assetId,
            originalUri,
            uri,
            previewUri,
            localUri,
            type,
            duration: Number(entry.duration) || 0,
            cropRect: entry.cropRect || null,
        };
    }
    return null;
};

const normalizeInitialSelection = (list) => {
    if (!Array.isArray(list)) return [];
    const seen = new Set();
    const normalized = [];
    list.forEach((entry, idx) => {
        const item = normalizeSelectionEntry(entry, idx);
        if (!item) return;
        const key = item.assetId || item.originalUri || item.uri || `index-${idx}`;
        if (seen.has(key)) return;
        seen.add(key);
        normalized.push(item);
    });
    return normalized;
};

export default function SelectPhotosScreen({ navigation, route }) {
    const initialSelection = useMemo(() => {
        const provided = route?.params?.initialImages;
        return normalizeInitialSelection(provided);
    }, [route?.params?.initialImages]);
    const [assets, setAssets] = useState([]);
    const [selectedItems, setSelectedItems] = useState(initialSelection);
    const [loading, setLoading] = useState(false);
    const [endCursor, setEndCursor] = useState(null);
    const [hasNextPage, setHasNextPage] = useState(true);
    const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();
    const [limited, setLimited] = useState(false);
    const fetchingRef = useRef(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [cropVisible, setCropVisible] = useState(false);
    const [cropUri, setCropUri] = useState(null);
    const [cropIndex, setCropIndex] = useState(-1);
    const [cropMode, setCropMode] = useState('image');
    const [isGeneratingCrop, setIsGeneratingCrop] = useState(false);
    const selectedItemsRef = useRef(selectedItems);
    const [previewMetrics, setPreviewMetrics] = useState({ top: null, bottom: null });

    const { height: windowHeight } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const headerTopPadding = useMemo(() => scaledSize(12) + (Platform.OS === 'android' ? Math.max(0, insets.top) : 0), [insets.top]);
    const headerOffset = useMemo(() => insets.top + scaledSize(12), [insets.top]);

    useEffect(() => {
        getInitialAssets();
    }, []);

    useEffect(() => {
        selectedItemsRef.current = selectedItems;
    }, [selectedItems]);

    useEffect(() => {
        setSelectedItems(initialSelection);
        setActiveIndex(0);
    }, [initialSelection]);

    useEffect(() => {
        if (!selectedItems.length) {
            setActiveIndex(0);
            return;
        }
        setActiveIndex((prev) => {
            if (prev < selectedItems.length) return prev;
            return Math.max(0, selectedItems.length - 1);
        });
    }, [selectedItems.length]);

    const getInitialAssets = useCallback(async () => {
        setLoading(true);
        try {
            if (!permissionResponse || permissionResponse.status !== 'granted') {
                await requestPermission();
            }
            // Track iOS limited access so we can prompt user to allow more photos
            try {
                const perm = await MediaLibrary.getPermissionsAsync();
                setLimited(perm?.accessPrivileges === 'limited');
            } catch {}
            const res = await MediaLibrary.getAssetsAsync({
                mediaType: MEDIA_TYPES,
                first: 120,
                sortBy: MediaLibrary.SortBy.creationTime,
            });
            setAssets(res.assets || []);
            setEndCursor(res.endCursor || null);
            setHasNextPage(!!res.hasNextPage);
        } finally {
            setLoading(false);
        }
    }, [permissionResponse, requestPermission]);

    const loadMoreAssets = useCallback(async () => {
        if (fetchingRef.current || loading || !hasNextPage) return;
        fetchingRef.current = true;
        setLoading(true);
        try {
            const res = await MediaLibrary.getAssetsAsync({
                mediaType: MEDIA_TYPES,
                first: 120,
                sortBy: MediaLibrary.SortBy.creationTime,
                after: endCursor || undefined,
            });
            if (res?.assets?.length) {
                setAssets(prev => {
                    const seen = new Set(prev.map(a => a.id));
                    const uniqueNext = res.assets.filter(a => !seen.has(a.id));
                    return uniqueNext.length ? [...prev, ...uniqueNext] : prev;
                });
            }
            setEndCursor(res.endCursor || null);
            setHasNextPage(!!res.hasNextPage);
        } finally {
            fetchingRef.current = false;
            setLoading(false);
        }
    }, [endCursor, hasNextPage, loading]);

    const prepareAssetSelection = useCallback(async (asset) => {
        if (!asset) return null;
        const type = asset.mediaType === MediaLibrary.MediaType.video ? 'video' : 'image';
        let duration = Number(asset.duration) || 0;
        let previewUri = asset.uri;
        let localUri = asset.localUri || null;

        if (!localUri) {
            try {
                const info = await MediaLibrary.getAssetInfoAsync(asset);
                if (info?.localUri) localUri = info.localUri;
                if (info?.duration && !duration) duration = Number(info.duration) || 0;
                if (info?.uri && !previewUri) previewUri = info.uri;
            } catch {}
        }

        const effectiveUri = localUri || asset.uri;

        return {
            assetId: asset.id || null,
            originalUri: asset.uri,
            uri: effectiveUri,
            previewUri: previewUri || effectiveUri,
            localUri: effectiveUri && effectiveUri.startsWith('file://') ? effectiveUri : null,
            type,
            duration,
            cropRect: asset.cropRect || null,
        };
    }, []);

    // React Native Image handles PhotoKit frontends adequately; no explicit prefetch here.

    function goBack() {
        navigation.goBack();
    }

    function next() {
        const serializedSelection = selectedItems.map((entry) => ({
            uri: entry.uri,
            previewUri: entry.previewUri,
            originalUri: entry.originalUri,
            assetId: entry.assetId,
            localUri: entry.localUri,
            type: entry.type,
            duration: entry.duration,
            cropRect: entry.cropRect || null,
        }));
        const params = { images: serializedSelection };
        if (route?.params && Object.prototype.hasOwnProperty.call(route.params, 'workout')) {
            params.workout = route.params.workout;
        }
        navigation.navigate({
            name: 'PostOptions',
            params,
            merge: true,
        });
    }

    const selectedPreviewItems = selectedItems.map((entry) => ({
        uri: entry.previewUri || entry.uri,
        playbackUri: entry.localUri || entry.uri,
        type: entry.type,
        duration: entry.duration,
        cropRect: entry.cropRect || null,
    }));

    const selectedOrderMap = useMemo(() => {
        const map = new Map();
        selectedItems.forEach((entry, idx) => {
            const order = idx + 1;
            if (entry.assetId) map.set(entry.assetId, order);
            if (entry.originalUri) map.set(entry.originalUri, order);
            map.set(entry.uri, order);
        });
        return map;
    }, [selectedItems]);

    const toggleSelect = useCallback(async (asset) => {
        if (!asset) return;
        const key = asset.id || asset.uri;
        const current = selectedItemsRef.current || [];
        const existingIdx = current.findIndex((entry) => (
            (entry.assetId && entry.assetId === key) || entry.originalUri === asset.uri
        ));
        if (existingIdx !== -1) {
            setSelectedItems((prev) => prev.filter((_, idx) => idx !== existingIdx));
            return;
        }

        try {
            const prepared = await prepareAssetSelection(asset);
            if (!prepared) return;
            setSelectedItems((prev) => {
                const already = prev.some((entry) => (
                    (entry.assetId && prepared.assetId && entry.assetId === prepared.assetId) ||
                    entry.originalUri === prepared.originalUri
                ));
                if (already) return prev;
                return [...prev, prepared];
            });
        } catch (error) {
            console.warn('[SelectPhotos] Failed to prepare media asset', error);
        }
    }, [prepareAssetSelection]);

    const clearSelection = useCallback(() => {
        setSelectedItems([]);
        setActiveIndex(0);
    }, []);

    const openCropper = useCallback(async () => {
        if (!selectedItems.length || isGeneratingCrop) return;
        const idx = Math.max(0, Math.min(activeIndex, selectedItems.length - 1));
        const entry = selectedItems[idx];
        if (!entry) return;

        if (entry.type === 'image') {
            const targetUri = entry.uri || entry.previewUri;
            if (!targetUri) return;
            setCropMode('image');
            setCropIndex(idx);
            setCropUri(targetUri);
            setCropVisible(true);
            return;
        }

        if (entry.type === 'video') {
            const baseUri = entry.localUri || entry.uri;
            if (!baseUri) return;
            setIsGeneratingCrop(true);
            try {
                const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(baseUri, { time: 0 });
                if (!thumbUri) return;
                setCropMode('video');
                setCropIndex(idx);
                setCropUri(thumbUri);
                setCropVisible(true);
            } catch (error) {
                console.warn('[SelectPhotos] Failed to create video thumbnail for cropping', error);
            } finally {
                setIsGeneratingCrop(false);
            }
        }
    }, [activeIndex, isGeneratingCrop, selectedItems]);

    const onCropDone = useCallback((payload) => {
        setCropVisible(false);
        setCropUri(null);
        if (cropIndex < 0) {
            setCropIndex(-1);
            return;
        }

        setSelectedItems((prev) => prev.map((entry, idx) => {
            if (idx !== cropIndex) return entry;
            if (!payload) return entry;

            if (entry.type === 'image') {
                const nextUri = typeof payload === 'string' ? payload : payload?.uri || entry.uri;
                if (!nextUri) return entry;
                const nextLocal = nextUri.startsWith('file://') ? nextUri : entry.localUri;
                return {
                    ...entry,
                    uri: nextUri,
                    previewUri: nextUri,
                    localUri: nextLocal,
                };
            }

            if (entry.type === 'video') {
                const rect = typeof payload === 'object' ? payload?.cropRect || null : null;
                return {
                    ...entry,
                    cropRect: rect || null,
                };
            }

            return entry;
        }));
        setCropIndex(-1);
    }, [cropIndex]);

    const collapsedSheetHeight = useMemo(() => {
        const bottom = previewMetrics.bottom;
        if (typeof bottom !== 'number' || !windowHeight) return null;
        const h = Math.max(0, windowHeight - bottom);
        return h || null;
    }, [previewMetrics.bottom, windowHeight]);

    const activeSelection = selectedItems.length
        ? selectedItems[Math.min(activeIndex, selectedItems.length - 1)]
        : null;
    const canCropActive = Boolean(activeSelection);

    return (
        <SafeAreaView style={styles.container}>
            <View style={[styles.header_ctnr, { paddingTop: headerTopPadding }]}>
                <TouchableOpacity onPress={withStrongPress(goBack)}>
                    <View style={styles.close_icon_ctnr}>
                        <Ionicons name='close' size={scaledSize(23)} color={theme.textSecondary} />
                    </View>
                </TouchableOpacity>
                <View style={styles.header_text_ctnr}>
                    <Text style={styles.title_text}>Pick Media</Text>
                </View>
                <TouchableOpacity onPress={withStrongPress(next)}>
                    <View style={styles.next_icon_ctnr}>
                        <FontAwesome6 name='chevron-right' size={scaledSize(17)} color={selectedItems.length > 0 ? theme.primary : theme.textSecondary} />
                    </View>
                </TouchableOpacity>
            </View>
            <View
                style={styles.preview_ctnr}
                onLayout={(e) => {
                    const { y = 0, height = 0 } = e.nativeEvent.layout || {};
                    setPreviewMetrics({ top: y, bottom: y + height });
                }}
            >
                {selectedPreviewItems.length > 0 ? (
                    <Gallery
                        data={selectedPreviewItems}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={({ item, setImageDimensions }) => (
                            item.type === 'video'
                                ? (
                                    <View style={styles.preview_video_ctnr}>
                                        <CroppedVideo
                                            source={{ uri: item.playbackUri || item.uri }}
                                            style={styles.preview_image}
                                            cropRect={item.cropRect}
                                            resizeMode="cover"
                                            repeat
                                            muted
                                            paused={false}
                                            onLoad={(meta) => {
                                                const { naturalSize } = meta || {};
                                                const width = Number(naturalSize?.width) || 1;
                                                const height = Number(naturalSize?.height) || 1;
                                                setImageDimensions({ width, height });
                                            }}
                                        />
                                        <View style={styles.preview_video_overlay}>
                                            <Ionicons name='play' size={scaledSize(32)} color={'#fff'} />
                                        </View>
                                    </View>
                                )
                                : (
                                    <Image
                                        source={{ uri: item.uri }}
                                        style={styles.preview_image}
                                        onLoad={(e) => {
                                            const { width, height } = e.nativeEvent.source;
                                            setImageDimensions({ width, height });
                                        }}
                                    />
                                )
                        )}
                        displayName={false}
                        showThumbs={false}
                        initialIndex={0}
                        onIndexChange={(i) => setActiveIndex(i)}
                        emptySpaceWidth={0}
                        disableVerticalSwipe
                        pinchEnabled={false}
                    />
                ) : (
                    <View style={styles.preview_placeholder}>
                        <Ionicons name='image-outline' size={scaledSize(28)} color={theme.textSecondary} />
                        <Text style={styles.preview_placeholder_text}>Pick photos or videos below to start your post</Text>
                    </View>
                )}

                {selectedPreviewItems.length > 0 && (
                    <>
                        <View style={styles.preview_action_row}>
                            <TouchableOpacity style={styles.clear_btn} onPress={withStrongPress(clearSelection)}>
                                <Ionicons name='trash-outline' size={scaledSize(18)} color={'#fff'} />
                                <Text style={styles.clear_btn_text}>Clear</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.crop_btn,
                                    (!canCropActive || isGeneratingCrop) && styles.crop_btn_disabled,
                                ]}
                                onPress={withStrongPress(openCropper)}
                                disabled={!canCropActive || isGeneratingCrop}
                            >
                                <Ionicons name='crop' size={scaledSize(20)} color={'#fff'} />
                                <Text style={styles.crop_btn_text}>Crop</Text>
                            </TouchableOpacity>
                            {isGeneratingCrop && (
                                <ActivityIndicator style={{ marginLeft: scaledSize(8) }} color="#fff" size="small" />
                            )}
                        </View>
                        <View style={styles.preview_footer_info}>
                            <Text style={styles.preview_footer_text}>{`${Math.min(selectedItems.length, activeIndex + 1)} of ${selectedItems.length}`}</Text>
                        </View>
                    </>
                )}
            </View>
            <PreviewPhotosBottomSheet
                assets={assets}
                images={selectedItems}
                selectedOrderMap={selectedOrderMap}
                toggleSelect={toggleSelect}
                loadMoreAssets={loadMoreAssets}
                loading={loading}
                hasNextPage={hasNextPage}
                isLimited={limited}
                onRequestMoreAccess={async () => {
                    try {
                        await MediaLibrary.presentLimitedLibraryPickerAsync();
                    } catch {}
                    // Re-evaluate permissions and refetch assets
                    try {
                        const perm = await MediaLibrary.getPermissionsAsync();
                        setLimited(perm?.accessPrivileges === 'limited');
                    } catch {}
                    getInitialAssets();
                }}
                collapsedHeight={collapsedSheetHeight}
            />
            <ImageCropperModal
                visible={cropVisible}
                uri={cropUri}
                aspectRatio={FEED_ASPECT_RATIO}
                mediaType={cropMode}
                anchorTop={previewMetrics.top}
                headerOffset={headerOffset}
                onCancel={() => { setCropVisible(false); setCropUri(null); setCropIndex(-1); }}
                onDone={onCropDone}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.bg
    },
    header_ctnr: {
        alignItems: 'center',
        paddingHorizontal: scaledSize(5),
        paddingBottom: scaledSize(15),
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: theme.bg
    },
    close_icon_ctnr: {
        paddingHorizontal: scaledSize(18)
    },
    header_text_ctnr: {
    },
    next_icon_ctnr: {
        paddingHorizontal: scaledSize(23)
    },
    title_text: {
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(16),
        color: theme.textPrimary,
    },
    preview_ctnr: {
        width: '100%',
        aspectRatio: FEED_ASPECT_RATIO,
        backgroundColor: theme.surface,
        overflow: 'hidden'
    },
    preview_image: {
        width: '100%',
        aspectRatio: FEED_ASPECT_RATIO
    },
    preview_video_ctnr: {
        flex: 1,
    },
    preview_video_overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.2)'
    },
    preview_placeholder: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scaledSize(24),
    },
    preview_placeholder_text: {
        marginTop: scaledSize(10),
        color: theme.textSecondary,
        fontFamily: 'Outfit_500Medium',
        fontSize: scaleSize(13),
        textAlign: 'center',
    },
    crop_btn: {
        paddingHorizontal: scaledSize(10),
        paddingVertical: scaledSize(6),
        borderRadius: scaledSize(12),
        backgroundColor: 'rgba(32,133,255,0.85)',
        flexDirection: 'row',
        alignItems: 'center',
    },
    crop_btn_disabled: {
        backgroundColor: 'rgba(110,110,110,0.6)'
    },
    crop_btn_text: {
        color: '#fff',
        marginLeft: scaledSize(8),
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(12),
    },
    clear_btn: {
        paddingHorizontal: scaledSize(10),
        paddingVertical: scaledSize(6),
        borderRadius: scaledSize(12),
        backgroundColor: 'rgba(239,68,68,0.9)',
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: scaledSize(8),
    },
    clear_btn_text: {
        color: '#fff',
        marginLeft: scaledSize(6),
        fontFamily: 'Outfit_500Medium',
        fontSize: scaleSize(12),
    },
    preview_action_row: {
        position: 'absolute',
        right: scaledSize(14),
        top: scaledSize(14),
        flexDirection: 'row',
        alignItems: 'center',
    },
    preview_footer_info: {
        position: 'absolute',
        right: scaledSize(14),
        bottom: scaledSize(14),
        paddingHorizontal: scaledSize(12),
        paddingVertical: scaledSize(6),
        borderRadius: scaledSize(12),
        backgroundColor: 'rgba(0,0,0,0.45)'
    },
    preview_footer_text: {
        color: '#fff',
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaleSize(12),
    }
});
