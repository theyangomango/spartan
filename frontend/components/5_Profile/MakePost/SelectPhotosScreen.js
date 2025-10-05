import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, Image, SafeAreaView, useWindowDimensions, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import Gallery from 'react-native-awesome-gallery';
import PreviewPhotosBottomSheet from './PreviewPhotosBottomSheet';
import ImageCropperModal from './ImageCropperModal';
import theme from '../../../theme/mfpDark';
import scaleSize from '../../../helper/scaleSize';
import { withStrongPress } from "../../../utils/haptics";

const scaledSize = (size) => scaleSize(size);
const FEED_ASPECT_RATIO = 1; // square crop across selection & preview

export default function SelectPhotosScreen({ navigation, route }) {
    const initialSelection = useMemo(() => {
        const provided = route?.params?.initialImages;
        return Array.isArray(provided) ? provided.filter(Boolean) : [];
    }, [route?.params?.initialImages]);
    const [assets, setAssets] = useState([]);
    const [images, setImages] = useState(initialSelection); // selected URIs, ordered
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
    const [croppedMap, setCroppedMap] = useState({}); // { [originalUri]: croppedUri }
    const [previewMetrics, setPreviewMetrics] = useState({ top: null, bottom: null });

    const { height: windowHeight } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const headerTopPadding = useMemo(() => scaledSize(12) + (Platform.OS === 'android' ? Math.max(0, insets.top) : 0), [insets.top]);
    const headerOffset = useMemo(() => insets.top + scaledSize(12), [insets.top]);

    useEffect(() => {
        getInitialAssets();
    }, []);

    useEffect(() => {
        setImages(initialSelection);
        setCroppedMap({});
        setActiveIndex(0);
    }, [initialSelection]);

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
                mediaType: ['photo'],
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
                mediaType: ['photo'],
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

    // React Native Image handles PhotoKit thumbnails adequately; no explicit prefetch here.

    function goBack() {
        navigation.goBack();
    }

    function next() {
        const finalImages = images.map((u) => (croppedMap?.[u] || u));
        const params = { images: finalImages };
        if (route?.params && Object.prototype.hasOwnProperty.call(route.params, 'workout')) {
            params.workout = route.params.workout;
        }
        navigation.navigate({
            name: 'PostOptions',
            params,
            merge: true,
        });
    }

    const selectedImages = images.length > 0 ? images.map((img) => ({ uri: (croppedMap?.[img] || img) })) : [];

    const selectedOrderMap = useMemo(() => {
        const map = new Map();
        images.forEach((uri, idx) => map.set(uri, idx + 1));
        return map;
    }, [images]);

    const toggleSelect = useCallback((uri) => {
        setImages(prev => {
            const idx = prev.indexOf(uri);
            if (idx === -1) return [...prev, uri];
            // remove
            const next = prev.slice();
            next.splice(idx, 1);
            // also drop any cropped mapping for this uri
            setCroppedMap((m) => {
                if (!m || !(uri in m)) return m;
                const copy = { ...m };
                delete copy[uri];
                return copy;
            });
            return next;
        });
    }, []);

    const clearSelection = useCallback(() => {
        setImages([]);
        setCroppedMap({});
        setActiveIndex(0);
    }, []);

    const openCropper = useCallback(() => {
        if (!images.length) return;
        const idx = Math.max(0, Math.min(activeIndex, images.length - 1));
        const original = images[idx];
        const u = croppedMap?.[original] || original;
        if (u) { setCropIndex(idx); setCropUri(u); setCropVisible(true); }
    }, [activeIndex, images, croppedMap]);

    const onCropDone = useCallback((newUri) => {
        setCropVisible(false);
        setCropUri(null);
        if (!newUri) return;
        setCroppedMap((m) => {
            if (cropIndex < 0 || cropIndex >= images.length) return m;
            const orig = images[cropIndex];
            return { ...(m || {}), [orig]: newUri };
        });
        setCropIndex(-1);
    }, [cropIndex, images]);

    const collapsedSheetHeight = useMemo(() => {
        const bottom = previewMetrics.bottom;
        if (typeof bottom !== 'number' || !windowHeight) return null;
        const h = Math.max(0, windowHeight - bottom);
        return h || null;
    }, [previewMetrics.bottom, windowHeight]);

    return (
        <SafeAreaView style={styles.container}>
            <View style={[styles.header_ctnr, { paddingTop: headerTopPadding }]}>
                <TouchableOpacity onPress={withStrongPress(goBack)}>
                    <View style={styles.close_icon_ctnr}>
                        <Ionicons name='close' size={scaledSize(23)} color={theme.textSecondary} />
                    </View>
                </TouchableOpacity>
                <View style={styles.header_text_ctnr}>
                    <Text style={styles.title_text}>Pick Photos</Text>
                </View>
                <TouchableOpacity onPress={withStrongPress(next)}>
                    <View style={styles.next_icon_ctnr}>
                        <FontAwesome6 name='chevron-right' size={scaledSize(17)} color={images.length > 0 ? theme.primary : theme.textSecondary} />
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
                {selectedImages.length > 0 ? (
                    <Gallery
                        data={selectedImages}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={({ item, setImageDimensions }) => (
                            <Image
                                source={{ uri: item.uri }}
                                style={styles.preview_image}
                                onLoad={(e) => {
                                    const { width, height } = e.nativeEvent.source;
                                    setImageDimensions({ width, height });
                                }}
                            />
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
                        <Text style={styles.preview_placeholder_text}>Pick photos below to start your post</Text>
                    </View>
                )}

                {selectedImages.length > 0 && (
                    <>
                        <View style={styles.preview_action_row}>
                            <TouchableOpacity style={styles.clear_btn} onPress={withStrongPress(clearSelection)}>
                                <Ionicons name='trash-outline' size={scaledSize(18)} color={'#fff'} />
                                <Text style={styles.clear_btn_text}>Clear</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.crop_btn} onPress={withStrongPress(openCropper)}>
                                <Ionicons name='crop' size={scaledSize(20)} color={'#fff'} />
                                <Text style={styles.crop_btn_text}>Crop</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.preview_footer_info}>
                            <Text style={styles.preview_footer_text}>{`${Math.min(images.length, activeIndex + 1)} of ${images.length}`}</Text>
                        </View>
                    </>
                )}
            </View>
            <PreviewPhotosBottomSheet
                assets={assets}
                images={images}
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
                anchorTop={previewMetrics.top}
                headerOffset={headerOffset}
                onCancel={() => { setCropVisible(false); setCropUri(null); }}
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
