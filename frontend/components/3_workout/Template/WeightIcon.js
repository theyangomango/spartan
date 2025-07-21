import React from "react";
import Svg, { Path } from "react-native-svg";

export default function WeightIcon(props) {
  return (
    <Svg
      viewBox="0 0 24 24"
      fill="none"
      {...props}
    >
      <Path
        d="M17.18 18c2.4 0 3-1.35 3-3V9c0-1.65-.6-3-3-3s-3 1.35-3 3v6c0 1.65.6 3 3 3ZM6.82 18c-2.4 0-3-1.35-3-3V9c0-1.65.6-3 3-3s3 1.35 3 3v6c0 1.65-.6 3-3 3ZM9.82 12h4.36M22.5 14.5v-5M1.5 14.5v-5"
        stroke="#888"
        strokeWidth={2.1}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
