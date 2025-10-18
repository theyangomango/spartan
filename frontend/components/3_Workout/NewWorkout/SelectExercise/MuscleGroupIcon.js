import React, { useMemo } from "react";
import Svg, { Path, Defs, ClipPath, G } from "react-native-svg";

const VIEWBOX = "-23 -23 46 46";
const BASE_FILL = "#EEF1F7";
const OUTLINE = "#3F4A6D";
const HIGHLIGHT_FILL_ACTIVE = "#4FAEFF";
const HIGHLIGHT_FILL_DIMMED = "#243B57";
const HIGHLIGHT_STROKE = "#7EC6FF";
const BASE_STROKE_WIDTH = 2.4;
const LINE_STROKE_WIDTH = 1.3;
const DETAIL_STROKE = "#4B5776";
const SCALE_X = 0.33;
const SCALE_Y = 0.142;
const TRANSLATE_Y = -136;

const FRONT_SILHOUETTE_PATH =
    "M 0 -48 C -18 -48 -28 -32 -28 -16 C -28 -4 -24 6 -18 12 C -34 34 -46 54 -42 74 C -38 102 -38 128 -32 154 C -40 190 -36 220 -28 248 C -22 268 -14 292 -6 306 C -4 310 -2 312 0 312 C 2 312 4 310 6 306 C 14 292 22 268 28 248 C 36 220 40 190 32 154 C 38 128 38 102 42 74 C 46 54 34 34 18 12 C 24 6 28 -4 28 -16 C 28 -32 18 -48 0 -48 Z";

const FRONT_LINE_PATHS = [
    "M 0 -22 C -16 -18 -30 -4 -36 16",
    "M 0 -22 C 16 -18 30 -4 36 16",
    "M -40 26 C -26 18 -12 20 0 24",
    "M 40 26 C 26 18 12 20 0 24",
    "M -32 12 C -38 36 -36 58 -32 82",
    "M 32 12 C 38 36 36 58 32 82",
    "M -30 82 C -28 112 -22 140 -18 166",
    "M 30 82 C 28 112 22 140 18 166",
    "M -18 166 C -26 196 -22 224 -16 246",
    "M 18 166 C 26 196 22 224 16 246",
    "M -20 210 C -16 232 -12 260 -8 286",
    "M 20 210 C 16 232 12 260 8 286",
    "M 0 26 L 0 188",
    "M -16 46 C -6 42 6 42 16 46",
    "M -14 72 C -6 68 6 68 14 72",
    "M -12 100 C -6 96 6 96 12 100",
    "M -10 128 C -5 124 5 124 10 128",
    "M -18 154 C -10 146 -4 144 0 144",
    "M 18 154 C 10 146 4 144 0 144",
    "M -12 182 C -8 204 -6 230 -4 252",
    "M 12 182 C 8 204 6 230 4 252",
    "M -6 208 C -4 228 -4 252 -4 276",
    "M 6 208 C 4 228 4 252 4 276",
];

const BACK_SILHOUETTE_PATH = FRONT_SILHOUETTE_PATH;

const BACK_LINE_PATHS = [
    "M 0 -26 L -30 18 L -12 58",
    "M 0 -26 L 30 18 L 12 58",
    "M -34 20 C -40 42 -36 66 -30 88",
    "M 34 20 C 40 42 36 66 30 88",
    "M -30 88 C -32 116 -28 140 -22 166",
    "M 30 88 C 32 116 28 140 22 166",
    "M -22 166 C -32 192 -26 214 -18 236",
    "M 22 166 C 32 192 26 214 18 236",
    "M -18 196 C -16 224 -12 248 -8 274",
    "M 18 196 C 16 224 12 248 8 274",
    "M -18 150 C -26 162 -30 176 -28 194 C -26 212 -20 226 -12 236 C -8 242 -4 244 0 244",
    "M 18 150 C 26 162 30 176 28 194 C 26 212 20 226 12 236 C 8 242 4 244 0 244",
    "M -10 110 C -4 130 -4 150 -6 168",
    "M 10 110 C 4 130 4 150 6 168",
    "M -12 64 C -20 92 -20 118 -14 144",
    "M 12 64 C 20 92 20 118 14 144",
    "M -24 44 C -32 60 -32 78 -28 94",
    "M 24 44 C 32 60 32 78 28 94",
    "M -12 232 C -10 258 -8 284 -6 304",
    "M 12 232 C 10 258 8 284 6 304",
    "M -20 22 C -18 32 -16 42 -14 52",
    "M 20 22 C 18 32 16 42 14 52",
];

const FRONT_SEGMENTS = {
    chest: (props) => (
        <G {...props}>
            <Path d="M -20 -12 C -16 -20 -8 -22 0 -20 C 8 -22 16 -20 20 -12 C 18 -6 10 0 0 2 C -10 0 -18 -6 -20 -12 Z" />
        </G>
    ),
    core: (props) => (
        <G {...props}>
            <Path d="M -8 14 C -6 40 -6 94 -8 110 C -4 114 4 114 8 110 C 6 94 6 40 8 14 C 4 10 -4 10 -8 14 Z" />
            <Path d="M -4 44 C -4 58 -4 72 -4 84 C -2 86 2 86 4 84 C 4 72 4 58 4 44 C 2 42 -2 42 -4 44 Z" />
        </G>
    ),
    hips: (props) => (
        <G {...props}>
            <Path d="M -12 94 C -10 88 -4 86 0 86 C 4 86 10 88 12 94 C 8 102 4 108 0 108 C -4 108 -8 102 -12 94 Z" />
        </G>
    ),
    leftShoulder: (props) => (
        <G {...props}>
            <Path d="M -30 -18 C -26 -26 -16 -28 -10 -22 C -6 -16 -8 -8 -14 -4 C -20 -4 -26 -8 -30 -18 Z" />
        </G>
    ),
    rightShoulder: (props) => (
        <G {...props}>
            <Path d="M 30 -18 C 26 -26 16 -28 10 -22 C 6 -16 8 -8 14 -4 C 20 -4 26 -8 30 -18 Z" />
        </G>
    ),
    leftArm: (props) => (
        <G {...props}>
            <Path d="M -34 -4 C -40 42 -36 108 -30 162 C -26 176 -18 178 -16 166 C -12 120 -10 66 -10 18 L -10 -4 Z" />
        </G>
    ),
    rightArm: (props) => (
        <G {...props}>
            <Path d="M 34 -4 C 40 42 36 108 30 162 C 26 176 18 178 16 166 C 12 120 10 66 10 18 L 10 -4 Z" />
        </G>
    ),
    leftLeg: (props) => (
        <G {...props}>
            <Path d="M -18 120 C -22 166 -22 226 -16 284 C -14 294 -10 294 -8 284 C -4 230 -4 166 -2 120 Z" />
        </G>
    ),
    rightLeg: (props) => (
        <G {...props}>
            <Path d="M 18 120 C 22 166 22 226 16 284 C 14 294 10 294 8 284 C 4 230 4 166 2 120 Z" />
        </G>
    ),
};

const BACK_SEGMENTS = {
    upperBack: (props) => (
        <G {...props}>
            <Path d="M -26 -20 L -16 4 L 16 4 L 26 -20 C 20 -30 -20 -30 -26 -20 Z" />
        </G>
    ),
    midBack: (props) => (
        <G {...props}>
            <Path d="M -10 6 C -8 24 -8 60 -10 84 C -4 92 4 92 10 84 C 8 60 8 24 10 6 C 6 2 -6 2 -10 6 Z" />
        </G>
    ),
    glutes: (props) => (
        <G {...props}>
            <Path d="M -16 96 C -12 90 -6 86 0 86 C 6 86 12 90 16 96 C 10 108 4 114 0 114 C -4 114 -10 108 -16 96 Z" />
        </G>
    ),
    rearShoulders: (props) => (
        <G {...props}>
            <Path d="M -28 -16 C -24 -24 -16 -26 -10 -20 C -6 -14 -8 -8 -12 -4 C -18 -4 -24 -8 -28 -16 Z" />
        </G>
    ),
    rearShouldersRight: (props) => (
        <G {...props}>
            <Path d="M 28 -16 C 24 -24 16 -26 10 -20 C 6 -14 8 -8 12 -4 C 18 -4 24 -8 28 -16 Z" />
        </G>
    ),
    tricepsLeft: (props) => (
        <G {...props}>
            <Path d="M -30 -2 C -36 40 -34 102 -28 156 C -24 170 -18 172 -16 162 C -12 120 -10 64 -10 18 L -10 -2 Z" />
        </G>
    ),
    tricepsRight: (props) => (
        <G {...props}>
            <Path d="M 30 -2 C 36 40 34 102 28 156 C 24 170 18 172 16 162 C 12 120 10 64 10 18 L 10 -2 Z" />
        </G>
    ),
    hamstringsLeft: (props) => (
        <G {...props}>
            <Path d="M -18 116 C -22 162 -22 220 -16 274 C -14 286 -10 286 -8 274 C -4 222 -4 162 -2 116 Z" />
        </G>
    ),
    hamstringsRight: (props) => (
        <G {...props}>
            <Path d="M 18 116 C 22 162 22 220 16 274 C 14 286 10 286 8 274 C 4 222 4 162 2 116 Z" />
        </G>
    ),
};

const clampSegments = (segments = []) => {
    if (!Array.isArray(segments)) return [];
    return segments.filter(Boolean);
};

const getClipId = (() => {
    let counter = 0;
    return (prefix) => {
        counter += 1;
        return `${prefix}-clip-${counter}`;
    };
})();

export default function MuscleGroupIcon({ figure = "front", segments = [], dimmed = false }) {
    const highlightFill = dimmed ? HIGHLIGHT_FILL_DIMMED : HIGHLIGHT_FILL_ACTIVE;
    const highlightStroke = dimmed ? "transparent" : HIGHLIGHT_STROKE;
    const highlightOpacity = dimmed ? 0.35 : 0.82;
    const highlightSet = useMemo(() => new Set(clampSegments(segments)), [segments]);
    const shapeMap = figure === "back" ? BACK_SEGMENTS : FRONT_SEGMENTS;
    const silhouettePath = figure === "back" ? BACK_SILHOUETTE_PATH : FRONT_SILHOUETTE_PATH;
    const linePaths = figure === "back" ? BACK_LINE_PATHS : FRONT_LINE_PATHS;
    const clipId = useMemo(() => getClipId(figure), [figure]);
    const figureTransform = `scale(${SCALE_X} ${SCALE_Y}) translate(0 ${TRANSLATE_Y})`;

    return (
        <Svg viewBox={VIEWBOX} width="100%" height="100%" preserveAspectRatio="xMidYMid meet">
            <Defs>
                <ClipPath id={clipId}>
                    <Path d={silhouettePath} transform={figureTransform} />
                </ClipPath>
            </Defs>
            <Path
                d={silhouettePath}
                transform={figureTransform}
                fill={BASE_FILL}
                stroke={OUTLINE}
                strokeWidth={BASE_STROKE_WIDTH}
                strokeLinejoin="round"
            />
            <G clipPath={`url(#${clipId})`}>
                {Array.from(highlightSet).map((segment) => {
                    const SegmentShape = shapeMap[segment];
                    if (!SegmentShape) return null;
                    return (
                        <SegmentShape
                            key={segment}
                            fill={highlightFill}
                            fillOpacity={highlightOpacity}
                            stroke={highlightStroke}
                            strokeWidth={dimmed ? 0 : 0.7}
                            transform={figureTransform}
                            strokeLinejoin="round"
                            strokeLinecap="round"
                        />
                    );
                })}
            </G>
            {linePaths.map((path, index) => (
                <Path
                    key={path + index}
                    d={path}
                    transform={figureTransform}
                    fill="none"
                    stroke={DETAIL_STROKE}
                    strokeWidth={LINE_STROKE_WIDTH}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            ))}
        </Svg>
    );
}
