import React, {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useRef,
    useState,
} from 'react';
import { FlatList, Pressable, View, Dimensions } from 'react-native';
import FastImage from 'react-native-fast-image';
import Video from 'react-native-video';

const { width: W } = Dimensions.get('window');

const ImageSlide = React.memo(({ uri, style }) => (
    <View style={{ width: W, height: style?.height || 0, overflow: 'hidden' }}>
        <FastImage
            source={{ uri, priority: FastImage.priority.normal, cache: FastImage.cacheControl.immutable }}
            style={style}
            resizeMode={FastImage.resizeMode.cover}
        />
    </View>
));

const VideoSlide = React.memo(({ uri, style, paused, isActive }) => (
    <View style={{ width: W, height: style?.height || 0, overflow: 'hidden' }}>
        <Video
            source={typeof uri === 'string' && uri.startsWith('http') ? { uri } : uri}
            style={style}
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
));

const SPEED_THRESHOLD = 420; // px/s

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
    const panStartOffsetRef = useRef(0);
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
            panStartOffsetRef.current = currentOffsetXRef.current || (currentIndex * W);
            return true;
        },
        hSwipeUpdate: (dx) => {
            if (!extDragActiveRef.current) return;
            const maxOffset = Math.max(0, (mediaList.length - 1) * W);
            let target = (panStartOffsetRef.current || 0) - (dx || 0);
            if (target < 0) target = 0;
            if (target > maxOffset) target = maxOffset;
            flatListRef.current?.scrollToOffset({ offset: target, animated: false });
        },
        hSwipeEnd: (dx, vx) => {
            if (!extDragActiveRef.current) return;
            extDragActiveRef.current = false;
            const start = panStartOffsetRef.current || 0;
            const current = currentOffsetXRef.current ?? start - (dx || 0);
            const rawIndex = current / W;
            let targetIndex = Math.round(rawIndex);
            if (typeof vx === 'number' && Math.abs(vx) > SPEED_THRESHOLD) {
                targetIndex = vx < 0 ? Math.ceil(rawIndex) : Math.floor(rawIndex);
            }
            if (targetIndex < 0) targetIndex = 0;
            if (targetIndex > mediaList.length - 1) targetIndex = mediaList.length - 1;
            currentOffsetXRef.current = targetIndex * W;
            updateIndex(targetIndex);
            flatListRef.current?.scrollToIndex({ index: targetIndex, animated: true });
        },
    }), [isFocused, mediaList.length, currentIndex, updateIndex]);

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

        if (item.type === 'video') {
            return (
                <Pressable onPress={handlePress}>
                    <VideoSlide uri={item.uri} style={imageStyle} paused={actuallyPaused} isActive={!actuallyPaused} />
                </Pressable>
            );
        }

        return (
            <Pressable onPress={handlePress}>
                <ImageSlide uri={item.uri} style={imageStyle} />
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
