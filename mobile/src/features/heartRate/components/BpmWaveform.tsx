import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface BpmWaveformProps {
  points: number[];
  width?: number;
  height?: number;
  color?: string;
}

export default function BpmWaveform({
  points,
  width = Dimensions.get('window').width - 48,
  height = 80,
  color = '#FF3B30',
}: BpmWaveformProps) {
  const getSvgPath = (): string => {
    if (points.length === 0) return '';

    const maxVal = Math.max(...points, 1);
    const minVal = Math.min(...points, 0);
    const range = maxVal - minVal || 1;

    const xStep = width / (points.length - 1 || 1);

    return points
      .map((val, index) => {
        const x = index * xStep;
        // Normalize points to fit perfect heights
        const y = height - ((val - minVal) / range) * (height - 10) - 5;
        return `${index === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
      })
      .join(' ');
  };

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        <Path
          d={getSvgPath()}
          fill="none"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
});
