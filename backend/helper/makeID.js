import uuid from 'react-native-uuid';

export default function makeID() {
    return uuid.v4();
}