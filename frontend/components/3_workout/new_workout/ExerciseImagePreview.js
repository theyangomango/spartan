import React from 'react';
import { Image, StyleSheet, View } from 'react-native';

const ExerciseImagePreview = ({ exercise }) => {
    let source;
    switch (exercise) {
        case 'standing-tricep-extention-dumbell':
            source = require('../../../assets/exercises/standing-tricep-extention-dumbbell/large.png');
            break;
        case 'standing-preacher-curl-dumbell':
            source = require('../../../assets/exercises/standing-preacher-curl-dumbbell/large.png');
            break;
        case 'squat-dumbell':
            source = require('../../../assets/exercises/squat-dumbbell/large.png');
            break;
        case 'shrug-dumbell':
            source = require('../../../assets/exercises/shrug-dumbbell/large.png');
            break;
        case 'lateral-raise-dumbell':
            source = require('../../../assets/exercises/lateral-raise-dumbbell/large.png');
            break;
        case 'incline-bench-press-dumbell':
            source = require('../../../assets/exercises/incline-bench-press-dumbbell/large.png');
            break;
        case 'front-raise-dumbell':
            source = require('../../../assets/exercises/front-raise-dumbbell/large.png');
            break;
        case 'chest-fly-dumbell':
            source = require('../../../assets/exercises/chest-fly-dumbbell/large.png');
            break;
        case 'bicep-curl-dumbell':
            source = require('../../../assets/exercises/bicep-curl-dumbbell/large.png');
            break;
        case 'bench-press-dumbell':
            source = require('../../../assets/exercises/bench-press-dumbbell/large.png');
            break;
    }

    return (
        <View style={[styles.imageContainer]}>
            <Image source={source} style={styles.image} />
        </View>
    );
}

const styles = StyleSheet.create({
    imageContainer: {
        width: 65,
        height: 65,
        overflow: 'hidden',
    },
    image: {
        width: 130,
        height: 130,
        resizeMode: 'cover',
        transform: [
            { scale: 1 },
            { translateX: -70.5 },
            { translateY: -20.5 }
        ],
    },
});

export default ExerciseImagePreview;
