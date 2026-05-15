/**
 * TrimiTLogoMark — vector mark for small UI (map pins, badges).
 * Simplified from assets/logo.png (T + comb crossbar).
 */

import React from 'react';
import Svg, { Path, G } from 'react-native-svg';

interface TrimiTLogoMarkProps {
  size?: number;
  /** Primary fill for the mark (default brand orange). */
  color?: string;
}

export const TrimiTLogoMark: React.FC<TrimiTLogoMarkProps> = ({
  size = 24,
  color = '#9A3412',
}) => (
  <Svg width={size} height={size} viewBox="0 0 48 48" fill="none">
    <G fill={color}>
      {/* Comb crossbar (left teeth) */}
      <Path d="M8 10h14v3H8v-3zm0 5h2v2H8v-2zm3 0h2v2h-2v-2zm3 0h2v2h-2v-2zm3 0h2v2h-2v-2zm3 0h2v2h-2v-2z" />
      {/* Comb crossbar (right teeth) */}
      <Path d="M26 10h14v3H26v-3zm0 5h2v2h-2v-2zm3 0h2v2h-2v-2zm3 0h2v2h-2v-2zm3 0h2v2h-2v-2zm3 0h2v2h-2v-2z" />
      {/* Left stem */}
      <Path d="M18 16h5v14l-2 4h-3l2-4V16z" />
      {/* Right stem (longer, pointed) */}
      <Path d="M25 16h6v20l-3 6h-4l3-6V16zm2 4h2v10h-2V20z" />
    </G>
  </Svg>
);

export default TrimiTLogoMark;
