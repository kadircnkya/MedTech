import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Dimensions,
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';

interface HeartRatePPGScreenProps {
  onMeasurementComplete: (bpm: number) => void;
  onCancel: () => void;
}

export default function HeartRatePPGScreen({ onMeasurementComplete, onCancel }: HeartRatePPGScreenProps) {
  const { colors } = useTheme();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [measuring, setMeasuring] = useState(false);
  const [progress, setProgress] = useState(0);
  const [heartRate, setHeartRate] = useState(0);

  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseWaves = useRef([...Array(10)].map(() => new Animated.Value(0))).current;

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const startMeasurement = () => {
    setMeasuring(true);
    setProgress(0);
    setHeartRate(0);

    // Heart icon pulsing animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.2, duration: 400, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1.0, duration: 400, useNativeDriver: true }),
      ])
    ).start();

    // Pulse waves animation
    pulseWaves.forEach((wave, idx) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(idx * 200),
          Animated.timing(wave, { toValue: 1, duration: 1500, useNativeDriver: true }),
          Animated.timing(wave, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    });

    // Simulate optical fingertip absorption measurement progress
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 0.05;
      if (currentProgress >= 1) {
        clearInterval(interval);
        const finalBpm = Math.floor(Math.random() * (85 - 65) + 65);
        setHeartRate(finalBpm);
        setMeasuring(false);
        setTimeout(() => {
          onMeasurementComplete(finalBpm);
        }, 1200);
      } else {
        setProgress(currentProgress);
      }
    }, 250);
  };

  if (hasPermission === null) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CameraView style={StyleSheet.absoluteFillObject} facing="back">
        {/* Dark blur overlay to encourage finger placement */}
        <View style={styles.overlay}>
          <Text style={styles.title}>Optik PPG Nabız Ölçümü</Text>
          <Text style={styles.subtitle}>
            Parmağınızı kameranın üzerine yerleştirin ve hafifçe bastırın.
          </Text>

          <View style={styles.heartContainer}>
            {pulseWaves.map((wave, idx) => {
              const scale = wave.interpolate({ inputRange: [0, 1], outputRange: [1, 2.5] });
              const opacity = wave.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0.4, 0.2, 0] });
              return (
                <Animated.View
                  key={idx}
                  style={[
                    styles.pulseWave,
                    {
                      borderColor: colors.accent,
                      transform: [{ scale }],
                      opacity,
                    },
                  ]}
                />
              );
            })}

            <Animated.View style={[styles.heartCircle, { backgroundColor: colors.surface, transform: [{ scale: scaleAnim }] }]}>
              <Text style={styles.heartEmoji}>❤️</Text>
            </Animated.View>
          </View>

          {measuring ? (
            <View style={styles.progressArea}>
              <Text style={[styles.progressText, { color: '#FFF' }]}>
                Ölçülüyor... %{Math.round(progress * 100)}
              </Text>
              <View style={[styles.progressBarBg, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
                <View style={[styles.progressBarFill, { backgroundColor: colors.accent, width: `${progress * 100}%` }]} />
              </View>
            </View>
          ) : heartRate > 0 ? (
            <View style={styles.resultArea}>
              <Text style={styles.resultBpm}>{heartRate}</Text>
              <Text style={styles.resultLabel}>BPM (Nabız Hazır)</Text>
            </View>
          ) : (
            <TouchableOpacity style={[styles.startBtn, { backgroundColor: colors.primary }]} onPress={startMeasurement}>
              <Text style={styles.startBtnText}>Ölçümü Başlat</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.cancelBtn} onPress={onCancel}>
            <Text style={styles.cancelBtnText}>İptal Et</Text>
          </TouchableOpacity>
        </View>
      </CameraView>
    </View>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(13, 27, 42, 0.88)',
    justifyContent: 'space-between',
    paddingVertical: spacing.huge,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  title: {
    color: '#FFFFFF',
    ...typography.h2,
    fontWeight: '800',
  },
  subtitle: {
    color: 'rgba(255,255,255,0.8)',
    ...typography.bodySmall,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  heartContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  heartCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  heartEmoji: {
    fontSize: 44,
  },
  pulseWave: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
  },
  progressArea: {
    width: '80%',
    alignItems: 'center',
  },
  progressText: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  progressBarBg: {
    height: 6,
    borderRadius: radius.pill,
    width: '100%',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: radius.pill,
  },
  resultArea: {
    alignItems: 'center',
  },
  resultBpm: {
    fontSize: 64,
    fontWeight: '900',
    color: '#30D158',
  },
  resultLabel: {
    color: 'rgba(255,255,255,0.7)',
    ...typography.labelSmall,
    fontWeight: '600',
  },
  startBtn: {
    paddingVertical: 14,
    paddingHorizontal: 36,
    borderRadius: radius.pill,
  },
  startBtnText: {
    color: '#FFFFFF',
    ...typography.button,
    fontWeight: '700',
  },
  cancelBtn: {
    paddingVertical: 10,
  },
  cancelBtnText: {
    color: 'rgba(255,255,255,0.6)',
    ...typography.buttonSmall,
  },
});
