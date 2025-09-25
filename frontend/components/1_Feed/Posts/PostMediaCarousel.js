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
    const dragStateRef = useRef({ active: false, startOffset: 0, startIndex: 0 });
    const maxOffsetRef = useRef(Math.max(0, (mediaList.length - 1) * W));

    useEffect(() => {
        setPausedList((prev) => mediaList.map((_, i) => prev[i] ?? false));
    }, [mediaList.length]);

    useEffect(() => {
        currentOffsetXRef.current = currentIndex * W;
        lastReportedIndexRef.current = currentIndex;
    }, [currentIndex]);

    useEffect(() => {
        maxOffsetRef.current = Math.max(0, (mediaList.length - 1) * W);
    }, [mediaList.length]);

    useEffect(() => {
        if (!isFocused) {
            dragStateRef.current.active = false;
        }
    }, [isFocused]);

    const scrollToOffsetImmediate = useCallback((offset) => {
        const list = flatListRef.current;
        if (!list) return;
        const maxOffset = maxOffsetRef.current;
        const clamped = Math.max(0, Math.min(maxOffset, offset));
        try {
            list.scrollToOffset({ offset: clamped, animated: false });
        } catch { }
        currentOffsetXRef.current = clamped;
    }, []);

    const animateToIndex = useCallback((index) => {
        const list = flatListRef.current;
        if (!list) return;
        const maxIndex = Math.max(0, mediaList.length - 1);
        const safeIndex = Math.max(0, Math.min(maxIndex, Math.round(index)));
        const targetOffset = safeIndex * W;
        currentOffsetXRef.current = targetOffset;
        lastReportedIndexRef.current = safeIndex;
        try {
            list.scrollToOffset({ offset: targetOffset, animated: true });
        } catch { }
        onIndexChange(safeIndex);
    }, [mediaList.length, onIndexChange]);

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
            if (!isFocused || mediaList.length <= 1) return false;
            extDragActiveRef.current = true;
            dragStateRef.current = {
                active: true,
                startOffset: currentOffsetXRef.current,
                startIndex: lastReportedIndexRef.current,
            };
            return true;
        },
        hSwipeUpdate: (dx = 0) => {
            if (!dragStateRef.current.active) return;
            const startOffset = dragStateRef.current.startOffset || 0;
            const nextOffset = startOffset - dx;
            scrollToOffsetImmediate(nextOffset);
        },
        hSwipeEnd: (dx = 0, vx = 0) => {
            if (!dragStateRef.current.active) return;
            const startOffset = dragStateRef.current.startOffset || 0;
            const rawOffset = startOffset - dx;
            const delta = -dx;
            const velocityX = vx || 0;

            let targetIndex = Math.round(rawOffset / W);

            const velocityThreshold = 350;
            if (Math.abs(velocityX) > velocityThreshold) {
                targetIndex = velocityX > 0
                    ? Math.floor(rawOffset / W)
                    : Math.ceil(rawOffset / W);
            } else {
                const distanceThreshold = W * 0.35;
                if (delta > distanceThreshold) {
                    targetIndex = Math.ceil(rawOffset / W);
                } else if (delta < -distanceThreshold) {
                    targetIndex = Math.floor(rawOffset / W);
                }
            }

            dragStateRef.current = { active: false, startOffset: 0, startIndex: 0 };
            extDragActiveRef.current = false;
            animateToIndex(targetIndex);
        },
    }), [
        animateToIndex,
        isFocused,
        mediaList.length,
        scrollToOffsetImmediate,
    ]);

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
