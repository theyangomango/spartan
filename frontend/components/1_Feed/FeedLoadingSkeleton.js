import React from 'react';
import { StyleSheet, View } from 'react-native';

import theme from '../../theme/mfpDark';
import scaleSize from '../../helper/scaleSize';

const BASE_TINT = theme.fieldDeep || '#262930';
const ALT_TINT = theme.surface || '#17171c';

const FeedLoadingSkeleton = ({ count = 3 }) => (
    <View style={styles.container}>
        {Array.from({ length: count }).map((_, index) => (
            <View key={index} style={styles.card}>
                <View style={styles.header}>
                    <View style={styles.avatar} />
                    <View style={styles.meta}>
                        <View style={styles.metaLineShort} />
                        <View style={styles.metaLineLong} />
                    </View>
                </View>
                <View style={styles.media} />
                <View style={styles.footerLine} />
            </View>
        ))}
    </View>
);

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 0,
        paddingVertical: scaleSize(8),
    },
    card: {
        borderRadius: 0,
        backgroundColor: ALT_TINT,
        padding: scaleSize(16),
        marginBottom: scaleSize(14),
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: scaleSize(14),
    },
    avatar: {
        width: scaleSize(44),
        height: scaleSize(44),
        borderRadius: scaleSize(22),
        backgroundColor: BASE_TINT,
    },
    meta: {
        flex: 1,
        marginLeft: scaleSize(12),
    },
    metaLineShort: {
        width: '45%',
        height: scaleSize(10),
        borderRadius: scaleSize(6),
        backgroundColor: BASE_TINT,
        marginBottom: scaleSize(6),
    },
    metaLineLong: {
        width: '65%',
        height: scaleSize(10),
        borderRadius: scaleSize(6),
        backgroundColor: BASE_TINT,
    },
    media: {
        width: '100%',
        height: scaleSize(190),
        borderRadius: 0,
        backgroundColor: BASE_TINT,
        marginBottom: scaleSize(12),
    },
    footerLine: {
        width: '55%',
        height: scaleSize(10),
        borderRadius: scaleSize(6),
        backgroundColor: BASE_TINT,
    },
});

export default FeedLoadingSkeleton;
