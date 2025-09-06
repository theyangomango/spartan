import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, Image, Dimensions, SafeAreaView } from 'react-native';
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import * as MediaLibrary from 'expo-media-library';
import Gallery from 'react-native-awesome-gallery';
import PreviewPhotosBottomSheet from './PreviewPhotosBottomSheet';
import ImageCropperModal from './ImageCropperModal';

const screenHeight = Dimensions.get('window').height;
const scale = screenHeight / 844; // Scaling based on iPhone 13 screen height

const scaledSize = (size) => Math.round(size * scale);

export default function SelectPhotosScreen({ navigation, route }) {
    const [assets, setAssets] = useState([]);
    const [images, setImages] = useState([]); // selected URIs, ordered
    const [loading, setLoading] = useState(false);
    const [endCursor, setEndCursor] = useState(null);
    const [hasNextPage, setHasNextPage] = useState(true);
    const [permissionResponse, requestPermission] = MediaLibrary.usePermissions();
    const fetchingRef = useRef(false);
    const [activeIndex, setActiveIndex] = useState(0);
    const [cropVisible, setCropVisible] = useState(false);
    const [cropUri, setCropUri] = useState(null);
    const [cropIndex, setCropIndex] = useState(-1);
    const [croppedMap, setCroppedMap] = useState({}); // { [originalUri]: croppedUri }

    useEffect(() => {
        getInitialAssets();
    }, []);

    const getInitialAssets = useCallback(async () => {
        setLoading(true);
        try {
            if (!permissionResponse || permissionResponse.status !== 'granted') {
                await requestPermission();
            }
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
        try { navigation.navigate('Profile'); }
        catch { try { navigation.goBack(); } catch {} }
    }

    function next() {
        if (images.length === 0) return;
        const finalImages = images.map((u) => (croppedMap?.[u] || u));
        navigation.navigate('PostOptions', {
            userData: global.userData,
            images: finalImages,
            workout: (('workout' in route.params) ? route.params.workout : null)
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

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header_ctnr}>
                <TouchableOpacity onPress={goBack}>
                    <View style={styles.close_icon_ctnr}>
                        <Ionicons name='close' size={scaledSize(23)} color={'#aaa'} />
                    </View>
                </TouchableOpacity>
                <View style={styles.header_text_ctnr}>
                    <Text style={styles.title_text}>New Post</Text>
                </View>
                <TouchableOpacity onPress={next}>
                    <View style={styles.next_icon_ctnr}>
                        <FontAwesome6 name='chevron-right' size={scaledSize(17)} color={images.length > 0 ? '#0699FF' : '#aaa'} />
                    </View>
                </TouchableOpacity>
            </View>

            <View style={styles.preview_ctnr}>
                {selectedImages.length > 0 ? (
                    <Gallery
                        data={selectedImages}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={({ item, setImageDimensions }) => (
                            <Image
                                source={{ uri: item.uri }}
                                style={{ width: '100%', aspectRatio: 0.8, borderTopLeftRadius: 35, borderTopRightRadius: 35 }}
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
                ) : assets.length > 0 ? (
                    <Image
                        source={{ uri: assets[0].uri }}
                        style={{ width: '100%', aspectRatio: 0.8, borderTopLeftRadius: 35, borderTopRightRadius: 35 }}
                    />
                ) : null}

                {selectedImages.length > 0 && (
                    <TouchableOpacity style={styles.crop_btn} onPress={openCropper}>
                        <Ionicons name='crop' size={scaledSize(20)} color={'#fff'} />
                        <Text style={styles.crop_btn_text}>Crop</Text>
                    </TouchableOpacity>
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
                clearSelection={() => setImages([])}
            />

            <ImageCropperModal
                visible={cropVisible}
                uri={cropUri}
                aspectRatio={0.8}
                onCancel={() => { setCropVisible(false); setCropUri(null); }}
                onDone={onCropDone}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f3f3f3'
    },
    header_ctnr: {
        alignItems: 'center',
        paddingHorizontal: scaledSize(5),
        paddingTop: scaledSize(5),
        paddingBottom: scaledSize(15),
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: '#f3f3f3'
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
        fontSize: scaledSize(16),
    },
    preview_ctnr: {
        width: '100%',
        aspectRatio: 0.8,
        backgroundColor: '#fff',
        borderTopLeftRadius: 35,
        borderTopRightRadius: 35,
        overflow: 'hidden'
    },
    preview_image: {
        flex: 1
    },
    crop_btn: {
        position: 'absolute',
        right: scaledSize(14),
        top: scaledSize(14),
        paddingHorizontal: scaledSize(10),
        paddingVertical: scaledSize(6),
        borderRadius: scaledSize(12),
        backgroundColor: 'rgba(0,0,0,0.45)',
        flexDirection: 'row',
        alignItems: 'center',
    },
    crop_btn_text: {
        color: '#fff',
        marginLeft: scaledSize(8),
        fontFamily: 'Outfit_600SemiBold',
        fontSize: scaledSize(12),
    }
});
