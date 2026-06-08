import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop, Line } from 'react-native-svg';
import { useTheme } from '../../../hooks/useTheme';
import { HeartRateRecord } from '../types';

interface PulseTrendChartProps {
  data: HeartRateRecord[];
  width?: number;
  height?: number;
}

export default function PulseTrendChart({
  data,
  width = Dimensions.get('window').width - 48,
  height = 140,
}: PulseTrendChartProps) {
  const { colors } = useTheme();

  // Reverse list to show chronological left-to-right timeline
  const chartData = [...data].reverse().slice(-5);

  if (chartData.length < 2) return null;

  const minBpm = Math.min(...chartData.map(d => d.bpm)) - 5;
  const maxBpm = Math.max(...chartData.map(d => d.bpm)) + 5;
  const bpmRange = maxBpm - minBpm || 1;

  const padding = 20;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const xStep = chartWidth / (chartData.length - 1 || 1);

  // Compute point coordinates
  const points = chartData.map((d, index) => {
    const x = padding + index * xStep;
    const y = padding + chartHeight - ((d.bpm - minBpm) / bpmRange) * chartHeight;
    return { x, y, bpm: d.bpm };
  });

  // SVG Line path
  const linePath = points
    .map((p, index) => `${index === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  // Gradient area path
  const areaPath = `
    ${linePath} 
    L ${points[points.length - 1].x.toFixed(1)} ${(height - padding).toFixed(1)} 
    L ${points[0].x.toFixed(1)} ${(height - padding).toFixed(1)} 
    Z
  `;

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor="#FF3B30" stopOpacity="0.25" />
            <Stop offset="100%" stopColor="#FF3B30" stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        {/* Dynamic baseline grids */}
        <Line
          x1={padding}
          y1={padding + chartHeight / 2}
          x2={width - padding}
          y2={padding + chartHeight / 2}
          stroke={colors.border}
          strokeWidth={1}
          strokeDasharray="4,4"
        />

        {/* Gradient fill area */}
        <Path d={areaPath} fill="url(#chartGrad)" />

        {/* Spark line curve */}
        <Path
          d={linePath}
          fill="none"
          stroke="#FF3B30"
          strokeWidth={3}
          strokeLinecap="round"
        />

        {/* Data point glowing rings */}
        {points.map((p, idx) => (
          <React.Fragment key={idx}>
            <Circle
              cx={p.x}
              cy={p.y}
              r={7}
              fill="rgba(255, 59, 48, 0.2)"
            />
            <Circle
              cx={p.x}
              cy={p.y}
              r={4}
              fill="#FF3B30"
            />
          </React.Fragment>
        ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
