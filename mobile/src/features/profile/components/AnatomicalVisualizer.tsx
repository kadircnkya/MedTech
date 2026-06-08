import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, PanResponder, Animated } from 'react-native';
import Svg, { Path, Circle, G, Defs, RadialGradient, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../../hooks/useTheme';
import { spacing, radius, typography } from '../../../theme';
import { BodySystemView, BodyOrientation, MedicalCondition } from '../types';

interface AnatomicalVisualizerProps {
  systemView: BodySystemView;
  conditions: MedicalCondition[];
  onSelectCondition: (condition: MedicalCondition) => void;
}

export default function AnatomicalVisualizer({
  systemView,
  conditions,
  onSelectCondition,
}: AnatomicalVisualizerProps) {
  const { colors, isDarkMode } = useTheme();
  
  // States
  const [orientation, setOrientation] = useState<BodyOrientation>('ANTERIOR');
  const [pulsingAnim] = useState(new Animated.Value(0.4));

  // Pulse animation loop for active medical markers
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulsingAnim, { toValue: 1.0, duration: 900, useNativeDriver: true }),
        Animated.timing(pulsingAnim, { toValue: 0.4, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Gesture mapping: Dragging left/right flips anatomical view (3D rotation simulation)
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderRelease: (evt, gestureState) => {
      if (Math.abs(gestureState.dx) > 40) {
        setOrientation(prev => prev === 'ANTERIOR' ? 'POSTERIOR' : 'ANTERIOR');
      }
    }
  });

  const getSystemColor = () => {
    switch (systemView) {
      case 'MUSCLE': return '#E11D48'; // Rosy red muscular
      case 'SKELETON': return '#E2E8F0'; // Clinical bone bone-white
      case 'ORGAN': return '#3B82F6'; // Futuristic medical blue
      default: return '#1E293B'; // Slate normal
    }
  };

  const currentSystemColor = getSystemColor();

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#0F172A' : '#F8FAFC' }]} {...panResponder.panHandlers}>
      {/* Sci-fi Medical HUD overlays */}
      <View style={styles.hudOverlay}>
        <View style={styles.hudBadge}>
          <Text style={styles.hudText}>SİSTEM: {systemView}</Text>
        </View>
        <View style={styles.hudBadge}>
          <Text style={styles.hudText}>AÇI: {orientation === 'ANTERIOR' ? 'ÖN (ANTERIOR)' : 'ARKA (POSTERIOR)'}</Text>
        </View>
      </View>

      {/* Futuristic Medical Rotating SVG Model Grid */}
      <View style={styles.svgContainer}>
        <Svg width="220" height="280" viewBox="0 0 100 120">
          <Defs>
            <RadialGradient id="glowFilter" cx="50%" cy="50%" rx="50%" ry="50%">
              <Stop offset="0%" stopColor="#FF3B30" stopOpacity="1" />
              <Stop offset="100%" stopColor="#FF3B30" stopOpacity="0" />
            </RadialGradient>
          </Defs>

          {/* Sci-fi Scanner Circle Background */}
          <Circle cx="50" cy="60" r="46" fill="none" stroke="rgba(59, 130, 246, 0.1)" strokeWidth="0.5" strokeDasharray="3,3" />
          <Circle cx="50" cy="60" r="42" fill="none" stroke="rgba(59, 130, 246, 0.05)" strokeWidth="1" />

          <G opacity="0.85">
            {/* Elegant high fidelity anatomical outline paths */}
            {/* Head */}
            <Circle cx="50" cy="18" r="8" fill="none" stroke={currentSystemColor} strokeWidth="1.5" />
            
            {/* Neck */}
            <Path d="M 48 26 L 48 30 L 52 30 L 52 26 Z" fill="none" stroke={currentSystemColor} strokeWidth="1.2" />

            {/* Shoulders */}
            <Path d="M 36 34 L 64 34" stroke={currentSystemColor} strokeWidth="2" strokeLinecap="round" />

            {/* Torso / Rib Cage */}
            <Path d="M 38 34 L 40 70 L 60 70 L 62 34 Z" fill="none" stroke={currentSystemColor} strokeWidth="1.5" />
            {systemView === 'ORGAN' && (
              <>
                <Circle cx="46" cy="46" r="3.5" fill="#EF4444" opacity="0.7" /> {/* Lungs/Heart */}
                <Circle cx="54" cy="46" r="3.5" fill="#EF4444" opacity="0.7" />
                <Path d="M 44 56 Q 50 52 56 56" fill="none" stroke="#22C55E" strokeWidth="1.5" /> {/* Organs */}
              </>
            )}

            {/* Arms */}
            <Path d="M 36 34 L 30 65" stroke={currentSystemColor} strokeWidth="1.5" strokeLinecap="round" />
            <Path d="M 64 34 L 70 65" stroke={currentSystemColor} strokeWidth="1.5" strokeLinecap="round" />

            {/* Spine (Only visible in Skeleton or Posterior view) */}
            {(systemView === 'SKELETON' || orientation === 'POSTERIOR') && (
              <Path d="M 50 30 L 50 70" stroke={isDarkMode ? '#FFF' : '#334155'} strokeWidth="1" strokeDasharray="2,2" />
            )}

            {/* Legs */}
            <Path d="M 42 70 L 38 108" fill="none" stroke={currentSystemColor} strokeWidth="1.8" strokeLinecap="round" />
            <Path d="M 58 70 L 62 108" fill="none" stroke={currentSystemColor} strokeWidth="1.8" strokeLinecap="round" />
          </G>

          {/* Interactive Medical Markers (Only loaded on respective viewpoints) */}
          {conditions.map((cond) => {
            let cx = 50;
            let cy = 60;
            
            // Map body coordinates based on anterior/posterior viewpoint
            if (cond.bodyPart === 'HEAD') { cx = 50; cy = 18; }
            else if (cond.bodyPart === 'CHEST') { cx = 50; cy = 46; }
            else if (cond.bodyPart === 'BACK') { cx = 50; cy = 56; }
            else if (cond.bodyPart === 'KNEE') { cx = 39; cy = 90; }

            // Filter markers depending on view orientation (e.g. back fıtığı is posterior)
            if (cond.bodyPart === 'BACK' && orientation === 'ANTERIOR') return null;
            if (cond.bodyPart === 'CHEST' && orientation === 'POSTERIOR') return null;

            return (
              <G key={cond.id}>
                {/* Glowing Pulse Rings */}
                <Circle cx={cx} cy={cy} r="6" fill="url(#glowFilter)" />
                <Animated.View>
                  <Circle
                    cx={cx}
                    cy={cy}
                    r="2.5"
                    fill="#FF3B30"
                    onPress={() => onSelectCondition(cond)}
                  />
                </Animated.View>
              </G>
            );
          })}
        </Svg>
      </View>

      {/* Manual flip controls */}
      <TouchableOpacity 
        style={[styles.flipBtn, { backgroundColor: colors.surfaceSecondary }]} 
        onPress={() => setOrientation(prev => prev === 'ANTERIOR' ? 'POSTERIOR' : 'ANTERIOR')}
      >
        <Ionicons name="sync" size={14} color={colors.textPrimary} />
        <Text style={[styles.flipBtnText, { color: colors.textPrimary }]}>Modeli Çevir</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 310,
    borderRadius: radius.xxl,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.08)',
    position: 'relative',
    marginVertical: spacing.md,
  },
  hudOverlay: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  hudBadge: {
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: radius.sm,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  hudText: {
    color: '#3B82F6',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  svgContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipBtn: {
    position: 'absolute',
    bottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
  },
  flipBtnText: {
    fontSize: 10,
    fontWeight: '700',
  },
});
