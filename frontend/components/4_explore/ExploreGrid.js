
/**
 * Renders a 2-row grid of 6 posts with one large preview 
 * and two small previews in the first row, followed by three 
 * equally sized previews in the second row.
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';

export default function ExploreGrid({ posts, index, renderPostPreview }) {
    // Return nothing if there are fewer than 6 posts
    if (posts.length < 6) return null;

    const isEven = index % 2 === 0;
    const largePreview = renderPostPreview(posts[0], true);

    return (
        <View style={styles.gridContainer}>
            <View style={styles.gridRow}>
                {isEven ? (
                    <>
                        <View style={styles.gridItemLarge}>{largePreview}</View>
                        <View style={styles.gridColumn}>
                            <View style={styles.gridItemSmall}>{renderPostPreview(posts[1])}</View>
                            <View style={styles.gridItemSmall}>{renderPostPreview(posts[2])}</View>
                        </View>
                    </>
                ) : (
                    <>
                        <View style={styles.gridColumn}>
                            <View style={styles.gridItemSmall}>{renderPostPreview(posts[1])}</View>
                            <View style={styles.gridItemSmall}>{renderPostPreview(posts[2])}</View>
                        </View>
                        <View style={styles.gridItemLarge}>{largePreview}</View>
                    </>
                )}
            </View>

            <View style={styles.gridRow}>
                <View style={styles.gridItem}>{renderPostPreview(posts[3])}</View>
                <View style={styles.gridItem}>{renderPostPreview(posts[4])}</View>
                <View style={styles.gridItem}>{renderPostPreview(posts[5])}</View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    gridContainer: {
        // Add any margins or padding if necessary
    },
    gridRow: {
        flexDirection: 'row',
        flexWrap: 'nowrap',
    },
    gridColumn: {
        flexDirection: 'column',
        flexWrap: 'nowrap',
        width: '33.33%',
    },
    gridItemLarge: {
        width: '66.66%',
        aspectRatio: 1,
    },
    gridItemSmall: {
        width: '100%',
        aspectRatio: 1,
    },
    gridItem: {
        width: '33.33%',
        aspectRatio: 1,
    },
});
