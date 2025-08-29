import React, { createContext, useContext, useMemo, useRef, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, runOnJS } from 'react-native-reanimated';

const AnimStackCtx = createContext(null);

export function useAnimStack() {
    const ctx = useContext(AnimStackCtx);
    if (!ctx) throw new Error('useAnimStack must be used inside <AnimStackProvider/>');
    return ctx;
}

export function AnimStackProvider({ children }) {
    const [stack, setStack] = useState([]); // array of { key, Component, props, options }
    const closersRef = useRef(new Map());   // key -> closeFn

    const api = useMemo(() => ({
        push: (Component, props = {}, options = {}) => {
            const key = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
            const normalized = {
                from: options.from ?? 'right',   // 'left' | 'right' | 'none'
                out: options.out ?? 'right',     // 'left' | 'right' | 'none'
                durationIn: options.durationIn ?? 260,
                durationOut: options.durationOut ?? 180,
            };
            setStack(prev => [...prev, { key, Component, props, options: normalized }]);
            return key;
        },
        pop: (opts = {}) => {
            setStack(prev => {
                if (prev.length === 0) return prev;
                const top = prev[prev.length - 1];
                const fn = closersRef.current.get(top.key);
                if (fn) fn(opts.animated !== false); // default animated = true
                return prev;
            });
        },
        clear: () => {
            setStack([]);
            closersRef.current.clear();
        },
        size: stack.length,
    }), [stack.length]);

    return (
        <AnimStackCtx.Provider value={api}>
            <View style={{ flex: 1 }}>
                {children}
                {stack.map((entry, i) => (
                    <OverlayScreen
                        key={entry.key}
                        entry={entry}
                        zIndex={1000 + i}
                        onExited={() => {
                            closersRef.current.delete(entry.key);
                            setStack(prev => prev.filter(x => x.key !== entry.key));
                        }}
                        registerCloser={(fn) => closersRef.current.set(entry.key, fn)}
                    />
                ))}
            </View>
        </AnimStackCtx.Provider>
    );
}

function OverlayScreen({ entry, zIndex, onExited, registerCloser }) {
    const { width } = Dimensions.get('window');
    const { Component, props, options } = entry;

    const startX =
        options.from === 'left' ? -width : options.from === 'right' ? width : 0;
    const endX = 0;
    const outX =
        options.out === 'left' ? -width : options.out === 'right' ? width : 0;

    const x = useSharedValue(startX);

    React.useEffect(() => {
        x.value = withTiming(endX, { duration: options.durationIn });
        registerCloser((animated = true) => {
            if (!animated || options.out === 'none') {
                runOnJS(onExited)();
                return;
            }
            x.value = withTiming(outX, { duration: options.durationOut }, (finished) => {
                if (finished) runOnJS(onExited)();
            });
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const style = useAnimatedStyle(() => ({
        transform: [{ translateX: x.value }],
    }));

    return (
        <Animated.View style={[StyleSheet.absoluteFill, style, { zIndex, backgroundColor: '#fff' }]}>
            <Component {...props} />
        </Animated.View>
    );
}
