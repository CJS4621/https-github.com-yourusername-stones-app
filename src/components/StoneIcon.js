import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';
 
export default function StoneIcon({ size = 32, color = '#C8952A', lightColor = '#F5DFA0' }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      {/* Irregular stone shape - wider at bottom, pointed top-left */}
      <Path
        d="M50 8 C62 6 78 14 86 28 C94 42 92 62 80 74 C68 86 46 90 30 82 C14 74 8 56 12 40 C16 24 30 10 50 8Z"
        fill={color}
      />
      {/* Crack/vein line across middle */}
      <Path
        d="M28 40 C40 32 60 35 72 44"
        fill="none"
        stroke={lightColor}
        strokeWidth="2"
        strokeLinecap="round"
        opacity={0.55}
      />
      {/* Small secondary crack */}
      <Path
        d="M36 55 C44 50 54 52 60 58"
        fill="none"
        stroke={lightColor}
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity={0.35}
      />
      {/* Highlight spot top-right */}
      <Circle cx="68" cy="24" r="5" fill={lightColor} opacity={0.4} />
    </Svg>
  );
}