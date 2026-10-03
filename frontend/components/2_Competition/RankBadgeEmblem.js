import React, { memo, useMemo } from "react";
import Svg, { Circle, Defs, G, Line, LinearGradient, Path, Polygon, RadialGradient, Stop } from "react-native-svg";

// Drawn in a 150x120 box, centred on (75, 60). The extra width leaves room for the level V wings.
const VIEW_WIDTH = 150;
const VIEW_HEIGHT = 120;
const CENTER_X = VIEW_WIDTH / 2;
const CENTER = VIEW_HEIGHT / 2;

// The emblem renders wider than its `size` (its height) by this ratio.
export const RANK_BADGE_ASPECT_RATIO = VIEW_WIDTH / VIEW_HEIGHT;

const hexPoints = (radius) =>
    Array.from({ length: 6 })
        .map((_, index) => {
            const angle = (Math.PI / 180) * (60 * index - 90);
            return `${(CENTER_X + radius * Math.cos(angle)).toFixed(2)},${(CENTER + radius * Math.sin(angle)).toFixed(2)}`;
        })
        .join(" ");

const RIM_HEX = hexPoints(41);
const OUTLINE_HEX = hexPoints(49);
const FACE_HEX = hexPoints(32);
const RING_HEX = hexPoints(25);

// Upper half of the face, used as a soft highlight.
const SHEEN_PATH = (() => {
    const [top, upperRight, , , , upperLeft] = FACE_HEX.split(" ");
    return `M ${upperLeft} L ${top} L ${upperRight} Q ${CENTER_X},${CENTER - 4} ${upperLeft} Z`;
})();

const RAY_ANGLES = Array.from({ length: 12 }).map((_, index) => 30 * index - 75);

const WING_FEATHERS = [
    "M 38 46 C 26 44 14 36 8 22 C 22 26 32 34 40 42 Z",
    "M 36 56 C 22 56 10 50 2 38 C 16 40 28 46 38 52 Z",
    "M 36 66 C 23 68 11 64 3 54 C 16 55 27 58 37 62 Z",
    "M 38 76 C 27 80 16 78 8 70 C 19 70 29 71 39 72 Z",
];

// Each level reads differently at a glance: the medal grows, the glow brightens, and new parts appear.
const MEDAL_SCALE = [0.74, 0.82, 0.88, 0.94, 0.94];
const GLOW_OPACITY = [0.22, 0.32, 0.42, 0.52, 0.64];
const GEM_SCALE = [0.5, 0.66, 0.8, 0.92, 1];

const sparklePath = (x, y, size) =>
    `M ${x} ${y - size} Q ${x} ${y} ${x + size} ${y} Q ${x} ${y} ${x} ${y + size} Q ${x} ${y} ${x - size} ${y} Q ${x} ${y} ${x} ${y - size} Z`;

/**
 * Rank emblem for the rank cards: a hexagonal medal with a faceted gem.
 * Level I is a small matte medal; II is polished with an engraved ring; III adds rays;
 * IV adds an outer outline and sparkles; V adds wings and a crown sparkle.
 */
function RankBadgeEmblem({ rankTheme, stage = 1, size = 104 }) {
    const colors = useMemo(() => {
        const [rimLight, rimMid] = rankTheme.badgeOuterGradient || [];
        return {
            rimLight: rimLight || "#fff5cc",
            rimMid: rimMid || "#f3cf57",
            core: rankTheme.badgeCoreColor || "#f4d85c",
            shadow: rankTheme.badgeCoreShadowColor || "#c7850a",
            gemLight: rankTheme.badgeGemColor || "#fff7d6",
            gemDeep: rankTheme.badgeGemInnerColor || "#f1c752",
            glow: (rankTheme.gradientColors || [])[1] || rankTheme.badgeCoreColor || "#f8d548",
        };
    }, [rankTheme]);

    const level = Math.min(Math.max(Math.round(stage) || 1, 1), 5);
    const medalScale = MEDAL_SCALE[level - 1];
    const glowOpacity = GLOW_OPACITY[level - 1];
    const gemScale = GEM_SCALE[level - 1];
    const rimFill = level >= 2 ? "url(#emblemRim)" : "url(#emblemRimMatte)";
    const rayReach = level >= 4 ? 57 : 53;
    const gemHalfWidth = 13 * gemScale;
    const gemTop = CENTER - 17 * gemScale;
    const gemBottom = CENTER + 19 * gemScale;
    const gemGirdle = CENTER - 3 * gemScale;
    const gemTopPoint = `${CENTER_X},${gemTop}`;
    const gemBottomPoint = `${CENTER_X},${gemBottom}`;
    const gemLeftPoint = `${CENTER_X - gemHalfWidth},${gemGirdle}`;
    const gemRightPoint = `${CENTER_X + gemHalfWidth},${gemGirdle}`;
    const gemCenterPoint = `${CENTER_X},${gemGirdle}`;

    return (
        <Svg width={size * RANK_BADGE_ASPECT_RATIO} height={size} viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}>
            <Defs>
                <RadialGradient id="emblemGlow" cx="50%" cy="50%" r="50%">
                    <Stop offset="0" stopColor={colors.glow} stopOpacity={glowOpacity} />
                    <Stop offset="0.6" stopColor={colors.glow} stopOpacity={glowOpacity * 0.3} />
                    <Stop offset="1" stopColor={colors.glow} stopOpacity="0" />
                </RadialGradient>
                <LinearGradient id="emblemRim" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor={colors.rimLight} />
                    <Stop offset="0.5" stopColor={colors.rimMid} />
                    <Stop offset="1" stopColor={colors.shadow} />
                </LinearGradient>
                <LinearGradient id="emblemRimMatte" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0" stopColor={colors.rimMid} />
                    <Stop offset="1" stopColor={colors.shadow} />
                </LinearGradient>
                <LinearGradient id="emblemFace" x1="0" y1="0" x2="0.6" y2="1">
                    <Stop offset="0" stopColor={colors.core} />
                    <Stop offset="1" stopColor={colors.shadow} />
                </LinearGradient>
            </Defs>

            <Circle cx={CENTER_X} cy={CENTER} r={CENTER} fill="url(#emblemGlow)" />

            {level >= 3 &&
                RAY_ANGLES.map((angle, index) => {
                    const reach = index % 2 === 0 ? rayReach : rayReach - 4;
                    const radians = (Math.PI / 180) * angle;
                    const cos = Math.cos(radians);
                    const sin = Math.sin(radians);
                    return (
                        <Line
                            key={angle}
                            x1={CENTER_X + 43 * cos}
                            y1={CENTER + 43 * sin}
                            x2={CENTER_X + reach * cos}
                            y2={CENTER + reach * sin}
                            stroke={colors.rimLight}
                            strokeOpacity={0.7}
                            strokeWidth={2.4}
                            strokeLinecap="round"
                        />
                    );
                })}

            {level >= 5 && (
                <>
                    <G>
                        {WING_FEATHERS.map((d) => (
                            <Path key={d} d={d} fill="url(#emblemRim)" stroke={colors.rimLight} strokeWidth={0.6} />
                        ))}
                    </G>
                    <G transform={`translate(${VIEW_WIDTH}, 0) scale(-1, 1)`}>
                        {WING_FEATHERS.map((d) => (
                            <Path key={d} d={d} fill="url(#emblemRim)" stroke={colors.rimLight} strokeWidth={0.6} />
                        ))}
                    </G>
                </>
            )}

            {level >= 4 && (
                <Polygon
                    points={OUTLINE_HEX}
                    fill="none"
                    stroke={colors.rimLight}
                    strokeOpacity={0.75}
                    strokeWidth={1.8}
                    strokeLinejoin="round"
                />
            )}

            <G transform={`translate(${CENTER_X}, ${CENTER}) scale(${medalScale}) translate(${-CENTER_X}, ${-CENTER})`}>
                {/* Rim: the wide round-joined stroke softens the hexagon's corners. */}
                <Polygon points={RIM_HEX} fill={rimFill} stroke={rimFill} strokeWidth={7} strokeLinejoin="round" />
                <Polygon
                    points={FACE_HEX}
                    fill="url(#emblemFace)"
                    stroke="url(#emblemFace)"
                    strokeWidth={5}
                    strokeLinejoin="round"
                />
                {level >= 2 && <Path d={SHEEN_PATH} fill="#ffffff" fillOpacity={0.18} />}
                {level >= 2 && (
                    <Polygon
                        points={RING_HEX}
                        fill="none"
                        stroke={colors.gemLight}
                        strokeOpacity={0.55}
                        strokeWidth={1.4}
                        strokeLinejoin="round"
                    />
                )}
            </G>

            {level >= 4 && (
                <>
                    <Path d={sparklePath(CENTER_X + 44, 16, 7)} fill={colors.gemLight} />
                    <Path d={sparklePath(CENTER_X - 44, 102, 5)} fill={colors.gemLight} fillOpacity={0.85} />
                </>
            )}
            {level >= 5 && <Path d={sparklePath(CENTER_X, 7, 7)} fill={colors.gemLight} />}

            {/* Faceted gem */}
            <Polygon points={`${gemTopPoint} ${gemLeftPoint} ${gemCenterPoint}`} fill={colors.gemLight} />
            <Polygon points={`${gemTopPoint} ${gemRightPoint} ${gemCenterPoint}`} fill={colors.gemLight} fillOpacity={0.72} />
            <Polygon points={`${gemLeftPoint} ${gemBottomPoint} ${gemCenterPoint}`} fill={colors.gemDeep} />
            <Polygon points={`${gemRightPoint} ${gemBottomPoint} ${gemCenterPoint}`} fill={colors.gemDeep} fillOpacity={0.68} />
            <Polygon
                points={`${gemTopPoint} ${gemRightPoint} ${gemBottomPoint} ${gemLeftPoint}`}
                fill="none"
                stroke="#ffffff"
                strokeOpacity={0.55}
                strokeWidth={0.8}
                strokeLinejoin="round"
            />
        </Svg>
    );
}

export default memo(RankBadgeEmblem);
