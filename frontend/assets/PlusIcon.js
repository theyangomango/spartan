import React from 'react';
import Svg, { Path } from 'react-native-svg';

const PlusIcon = ({ size = 24, color = '#000000ff' }) => (
    <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
    >
        <Path
            d="M6 12h12M12 18V6"
            stroke={color}
            strokeWidth={1.9}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

export default PlusIcon;
