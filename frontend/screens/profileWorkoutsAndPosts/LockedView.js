// Placeholder shown by the ProfileWorkoutsAndPosts screen when the viewer may not see the profile's content.
import React from "react";
import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import scaleSize from "../../helper/scaleSize";
import styles from "./ProfileWorkoutsAndPosts.styles";

const LockedView = ({ subtitle }) => (
    <View style={styles.lockedContainer}>
        <View style={styles.lockedIconWrap}>
            <Ionicons name="lock-closed" size={scaleSize(42)} color="#A5B4FC" />
        </View>
        <Text style={styles.lockedTitle}>This account is private</Text>
        <Text style={styles.lockedSubtitle}>
            {subtitle || 'Follow to see their workouts and posts.'}
        </Text>
    </View>
);

export default LockedView;
