import React from 'react';
import { StyleSheet, View } from 'react-native';

/**
 * Renders a 2-column staggered grid of 6 posts with vertical images.
 * Each column contains 3 posts with slightly varied aspect ratios to create a staggered effect.
 */
export default function ExploreGrid({ posts, renderPostPreview }) {
    // Return nothing if there are fewer than 6 posts
    if (!posts || posts.length < 6) return null;

    // Split the posts into two columns
    const leftColumnPosts = posts.slice(0, 3);
    const rightColumnPosts = posts.slice(3, 6);

    /**
     * Generates a slightly varied aspect ratio for vertical images.
     * Ensures aspect ratios are greater than 1 to maintain vertical orientation.
     * Variations are deterministic based on the post index to maintain consistency.
     */
    const getAspectRatio = (idx) => {
        const baseRatio = 1.2; // Base aspect ratio for vertical images
        const variation = (idx % 3) * 0.1; // Creates variations: 0, 0.1, 0.2
        return baseRatio + variation;
    };

    return (
        <View style={styles.gridContainer}>
            {/* Left Column */}
            <View style={styles.column}>
                {leftColumnPosts.map((post, idx) => (
                    <View
                        key={`left-${idx}`}
                        style={[
                            styles.gridItem,
                            { aspectRatio: getAspectRatio(idx) },
                        ]}
                    >
                        {renderPostPreview(post)}
                    </View>
                ))}
            </View>

            {/* Right Column */}
            <View style={styles.column}>
                {rightColumnPosts.map((post, idx) => (
                    <View
                        key={`right-${idx}`}
                        style={[
                            styles.gridItem,
                            { aspectRatio: getAspectRatio(idx + 3) },
                        ]}
                    >
                        {renderPostPreview(post)}
                    </View>
                ))}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    gridContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        // Optional: Add padding or margin as needed
        padding: 4,
    },
    column: {
        flex: 1,
        flexDirection: 'column',
        marginHorizontal: 2, // Spacing between columns
    },
    gridItem: {
        marginBottom: 4, // Spacing between items
        width: '100%', // Ensure the item takes full width of the column
        // aspectRatio is set dynamically to create vertical and staggered effect
    },
});
