import React, {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from 'react';
import { FlatList, Pressable, View, Dimensions, StyleSheet } from 'react-native';
import FastImage from 'react-native-fast-image';
import CroppedVideo from '../../common/CroppedVideo';

const { width: W } = Dimensions.get('window');

const flattenStyle = (style) => {
    if (Array.isArray(style)) return StyleSheet.flatten(style);
    return style || {};
};

const ImageSlide = React.memo(({ uri, style }) => {
    const flattened = flattenStyle(style);
    const height = flattened?.height || 0;
    return (
        <View style={{ width: W, height, overflow: 'hidden' }}>
            <FastImage
                source={{ uri, priority: FastImage.priority.normal, cache: FastImage.cacheControl.immutable }}
                style={flattened}
                resizeMode={FastImage.resizeMode.cover}
            />
        </View>
    );
});

const VideoSlide = React.memo(({ uri, style, paused, isActive, cropRect }) => {
    const flattened = flattenStyle(style);
    const height = flattened?.height || 0;
    return (
        <View style={{ width: W, height, overflow: 'hidden' }}>
            <CroppedVideo
                source={typeof uri === 'string' && uri.startsWith('http') ? { uri } : uri}
                style={flattened}
                cropRect={cropRect}
                resizeMode="cover"
                paused={!isActive || paused}
                repeat
                muted={false}
                volume={1.0}
                ignoreSilentSwitch="ignore"
                playInBackground={false}
                playWhenInactive={false}
                controls={false}
            />
        </View>
    );
});

const PostMediaCarousel = forwardRef(function PostMediaCarousel({
    mediaList,
    currentIndex,
    onIndexChange,
    isFocused,
    isAnyPostFocused,
    shouldPlay,
    onRequestFocus,
    galleryStyle,
    imageStyle,
}, ref) {
    const flatListRef = useRef(null);
    const [pausedList, setPausedList] = useState(() => mediaList.map(() => false));
    const currentOffsetXRef = useRef(currentIndex * W);
    const extDragActiveRef = useRef(false);
    const lastReportedIndexRef = useRef(currentIndex || 0);

    useEffect(() => {
        setPausedList((prev) => mediaList.map((_, i) => prev[i] ?? false));
    }, [mediaList.length]);

    useEffect(() => {
        currentOffsetXRef.current = currentIndex * W;
        lastReportedIndexRef.current = currentIndex;
    }, [currentIndex]);

    const togglePauseAtIndex = useCallback((idx) => {
        setPausedList((prev) => prev.map((v, i) => (i === idx ? !v : v)));
    }, []);

    const updateIndex = useCallback((nextIndex) => {
        if (typeof nextIndex !== 'number') return;
        if (nextIndex === lastReportedIndexRef.current) return;
        lastReportedIndexRef.current = nextIndex;
        onIndexChange(nextIndex);
    }, [onIndexChange]);

    const handleScroll = useCallback((event) => {
        const offsetX = event.nativeEvent.contentOffset.x;
        currentOffsetXRef.current = offsetX;
        const next = Math.round(offsetX / W);
        updateIndex(next);
    }, [updateIndex]);

    const handleScrollSettled = useCallback((event) => {
        const offsetX = event?.nativeEvent?.contentOffset?.x ?? currentOffsetXRef.current;
        currentOffsetXRef.current = offsetX;
        const next = Math.round(offsetX / W);
        updateIndex(next);
    }, [updateIndex]);

    useImperativeHandle(ref, () => ({
        hSwipeBegin: () => {
            if (!isFocused) return false;
            extDragActiveRef.current = true;
            return true;
        },
        hSwipeUpdate: () => {},
        hSwipeEnd: () => {
            if (!extDragActiveRef.current) return;
            extDragActiveRef.current = false;
        },
    }), [isFocused]);

    const keyExtractor = useCallback((item, idx) => `${item.uri || ''}${idx}`, []);

    const getItemLayout = useCallback((_, index) => ({ length: W, offset: W * index, index }), []);

    const renderItem = useCallback(({ item, index: slideIndex }) => {
        const handlePress = (event) => {
            const x = event.nativeEvent.locationX;
            if (x <= W * 0.1 || x >= W * 0.9) return;

            if (isFocused && item.type === 'video' && slideIndex === currentIndex) {
                togglePauseAtIndex(slideIndex);
                return;
            }

            if (!isAnyPostFocused) {
                onRequestFocus(true);
            }
        };

        const isCurrentSlide = slideIndex === currentIndex;
        const allowAutoplay = isAnyPostFocused ? isFocused : !!shouldPlay;
        const meetsRule = allowAutoplay && isCurrentSlide && item.type === 'video';
        const isManuallyPaused = pausedList[slideIndex];
        const actuallyPaused = !meetsRule || isManuallyPaused;

        const aspectRatio = Number(item?.aspectRatio);
        const resolvedAspect = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 1;
        const slideHeight = W / resolvedAspect;
        const combinedStyle = [imageStyle, { height: slideHeight }];

        if (item.type === 'video') {
            return (
                <Pressable onPress={handlePress}>
                    <VideoSlide
                        uri={item.uri}
                        style={combinedStyle}
                        paused={actuallyPaused}
                        isActive={!actuallyPaused}
                        cropRect={item.cropRect}
                    />
                </Pressable>
            );
        }

        return (
            <Pressable onPress={handlePress}>
                <ImageSlide uri={item.uri} style={combinedStyle} />
            </Pressable>
        );
    }, [
        currentIndex,
        imageStyle,
        isAnyPostFocused,
        isFocused,
        onRequestFocus,
        pausedList,
        shouldPlay,
        togglePauseAtIndex,
    ]);

    return (
        <FlatList
            ref={flatListRef}
            data={mediaList}
            horizontal
            pagingEnabled
            bounces={false}
            overScrollMode="never"
            scrollEnabled={!isAnyPostFocused || isFocused}
            snapToInterval={W}
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            keyExtractor={keyExtractor}
            getItemLayout={getItemLayout}
            style={galleryStyle}
            renderItem={renderItem}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onMomentumScrollEnd={handleScrollSettled}
            onScrollEndDrag={handleScrollSettled}
        />
    );
});

export default React.memo(PostMediaCarousel);
