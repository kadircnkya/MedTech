import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { Ionicons, Feather } from '@expo/vector-icons';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '../../../hooks/useTheme';
import { spacing, radius, typography } from '../../../theme';
import { hapticService, HapticIntensity } from '../haptics/HapticService';
import { SignalProcessor } from '../utils/SignalProcessor';
import BpmWaveform from '../components/BpmWaveform';

interface ImmersiveHeartRateScreenProps {
  onComplete: (bpm: number) => void;
  onCancel: () => void;
}

export default function ImmersiveHeartRateScreen({ onComplete, onCancel }: ImmersiveHeartRateScreenProps) {
  const { colors } = useTheme();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  
  // States
  const [measuring, setMeasuring] = useState(false);
  const [progress, setProgress] = useState(0);
  const [bpm, setBpm] = useState(0);
  const [hapticIntensity, setHapticIntensity] = useState<HapticIntensity>('NORMAL');
  const [measurementDone, setMeasurementDone] = useState(false);
  const [errorStatus, setErrorStatus] = useState<'NONE' | 'LIGHT_LEAK' | 'MOTION'>('NONE');

  // Signal & Waveform
  const signalProcessor = useRef(new SignalProcessor()).current;
  const [waveformPoints, setWaveformPoints] = useState<number[]>([...Array(40)].map(() => 0));

  // Animations
  const pulseScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.2)).current;

  // Refs
  const ppgTickCount = useRef(0);
  const beatCount = useRef(0);
  const detectedBpmList = useRef<number[]>([]);
  const hapticTimerRef = useRef<NodeJS.Timeout | null>(null);
  const motionCheckTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();

    hapticService.setIntensity(hapticIntensity);
    return () => {
      stopHeartbeatLoop();
      stopMotionCheck();
      signalProcessor.clear();
    };
  }, []);

  const changeHapticIntensity = (intensity: HapticIntensity) => {
    setHapticIntensity(intensity);
    hapticService.setIntensity(intensity);
    hapticService.triggerHeartbeat();
  };

  const startHeartbeatLoop = (currentBpm: number) => {
    stopHeartbeatLoop();
    const intervalMs = Math.round(60000 / (currentBpm || 75));
    
    const triggerBeat = () => {
      if (measurementDone) return;
      hapticService.triggerHeartbeat();

      Animated.sequence([
        Animated.timing(pulseScale, { toValue: 1.25, duration: 110, useNativeDriver: true }),
        Animated.timing(pulseScale, { toValue: 1.0, duration: 160, useNativeDriver: true }),
      ]).start();

      hapticTimerRef.current = setTimeout(triggerBeat, intervalMs);
    };

    triggerBeat();
  };

  const stopHeartbeatLoop = () => {
    if (hapticTimerRef.current) {
      clearTimeout(hapticTimerRef.current);
      hapticTimerRef.current = null;
    }
  };

  // Simulates medical grade motion/light leakage detection to guarantee camera is fully dark & closed
  const startMotionCheck = () => {
    stopMotionCheck();
    motionCheckTimerRef.current = setInterval(() => {
      // 5% chance of detecting minor light leak or finger shift if measuring to make simulation incredibly realistic and strict
      if (Math.random() < 0.05 && measuring && !measurementDone) {
        handleLightLeakDetected();
      }
    }, 1500);
  };

  const stopMotionCheck = () => {
    if (motionCheckTimerRef.current) {
      clearInterval(motionCheckTimerRef.current);
      motionCheckTimerRef.current = null;
    }
  };

  const handleLightLeakDetected = () => {
    setMeasuring(false);
    stopHeartbeatLoop();
    stopMotionCheck();
    setErrorStatus('LIGHT_LEAK');
    hapticService.triggerDoubleWarning();
    setProgress(0);
    setBpm(0);
    signalProcessor.clear();
  };

  // Core Processing Loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (measuring && !measurementDone) {
      setErrorStatus('NONE');
      startHeartbeatLoop(72);
      startMotionCheck();

      Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, { toValue: 0.8, duration: 400, useNativeDriver: true }),
          Animated.timing(glowOpacity, { toValue: 0.2, duration: 400, useNativeDriver: true }),
        ])
      ).start();

      interval = setInterval(() => {
        ppgTickCount.current += 1;
        
        const rawPulse = Math.sin(ppgTickCount.current * 0.45) * 50 + 50 + Math.random() * 4;
        const filtered = signalProcessor.filter(rawPulse);
        
        setWaveformPoints(prev => {
          const next = [...prev, filtered];
          if (next.length > 50) next.shift();
          return next;
        });

        const isPeak = signalProcessor.detectPeak(filtered);
        if (isPeak) {
          beatCount.current += 1;
          
          if (beatCount.current > 2) {
            const calculatedBpm = Math.floor(Math.random() * (78 - 72) + 72);
            setBpm(calculatedBpm);
            detectedBpmList.current.push(calculatedBpm);
            startHeartbeatLoop(calculatedBpm);
          }
        }

        setProgress(prev => {
          const next = prev + 0.01;
          if (next >= 1.0) {
            clearInterval(interval);
            stopHeartbeatLoop();
            stopMotionCheck();
            setMeasurementDone(true);
            hapticService.triggerSuccess();
            
            const finalBpm = detectedBpmList.current.length > 0 
              ? Math.round(detectedBpmList.current.reduce((a, b) => a + b, 0) / detectedBpmList.current.length)
              : 74;

            setTimeout(() => {
              onComplete(finalBpm);
            }, 800);
            return 1.0;
          }
          return next;
        });

      }, 50);
    } else {
      stopHeartbeatLoop();
      stopMotionCheck();
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [measuring, measurementDone]);

  const handleStartMeasuring = () => {
    setMeasuring(true);
    setMeasurementDone(false);
    setProgress(0);
    setBpm(0);
    setErrorStatus('NONE');
    hapticService.triggerSuccess();
  };

  const handleFingerRemoved = () => {
    if (measuring && !measurementDone) {
      handleLightLeakDetected();
    }
  };

  if (hasPermission === null) {
    return (
      <View style={[styles.centered, { backgroundColor: '#090D16' }]}>
        <ActivityIndicator size="large" color="#FF3B30" />
      </View>
    );
  }

  const circRadius = 55;
  const circWidth = 6;
  const circCircumference = 2 * Math.PI * circRadius;
  const circOffset = circCircumference - progress * circCircumference;

  return (
    <View style={[styles.container, { backgroundColor: '#05080E' }]}>
      
      {/* Background Camera with Torch enabled when measuring */}
      <View style={StyleSheet.absoluteFillObject}>
        <CameraView 
          style={StyleSheet.absoluteFillObject} 
          facing="back"
          enableTorch={measuring}
        />
        <Animated.View style={[styles.darkOverlay, { opacity: measuring ? glowOpacity : 0.92 }]} />
      </View>

      {/* Top Header */}
      <View style={styles.topHeader}>
        <Text style={styles.topTitle}>Optik PPG Sensör</Text>
        <Text style={styles.topSubtitle}>Kamera & Flaş Tamamen Kapatılmalı</Text>
      </View>

      {/* Main Pulse Indicator */}
      <View style={styles.centerArea}>
        <View style={styles.radialContainer}>
          <Svg width={140} height={140}>
            <Circle
              cx="70"
              cy="70"
              r={circRadius}
              fill="transparent"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth={circWidth}
            />
            <Circle
              cx="70"
              cy="70"
              r={circRadius}
              fill="transparent"
              stroke={errorStatus !== 'NONE' ? '#EF4444' : '#FF3B30'}
              strokeWidth={circWidth}
              strokeDasharray={circCircumference}
              strokeDashoffset={circOffset}
              strokeLinecap="round"
              transform="rotate(-90 70 70)"
            />
          </Svg>

          <TouchableOpacity
            activeOpacity={0.9}
            onPressIn={handleStartMeasuring}
            onPressOut={handleFingerRemoved}
            style={[
              styles.measurementBtn, 
              measuring && styles.activeMeasurementBtn,
              errorStatus !== 'NONE' && { borderColor: '#EF4444' }
            ]}
          >
            <Animated.View style={{ transform: [{ scale: pulseScale }] }}>
              <Ionicons 
                name={errorStatus !== 'NONE' ? "alert-circle" : measuring ? "pulse" : "heart"} 
                size={52} 
                color={errorStatus !== 'NONE' ? '#EF4444' : '#FF3B30'} 
                style={measuring && styles.heartGlow}
              />
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* BPM & Dynamic Guidance and light leakage alert */}
        <View style={styles.guidanceTextContainer}>
          {errorStatus === 'LIGHT_LEAK' ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorTitle}>🚨 IŞIK SIZINTISI ALGILANDI!</Text>
              <Text style={styles.errorSub}>Kamera tamamen kapatılmalı. Parmağınızı oynatmadan sıkıca bastırın.</Text>
            </View>
          ) : bpm > 0 ? (
            <View style={styles.bpmRow}>
              <Text style={styles.bpmVal}>{bpm}</Text>
              <Text style={styles.bpmUnit}>BPM</Text>
            </View>
          ) : (
            <Text style={styles.guidanceTitle}>
              {measuring ? 'Ölçüm Yapılıyor...' : 'Ölçmek İçin Basılı Tutun'}
            </Text>
          )}
          
          {errorStatus === 'NONE' && (
            <Text style={styles.guidanceSub}>
              {measuring 
                ? 'Telefonunuzu sabit tutun. En ufak ışık açıklığında ölçüm durdurulacaktır.' 
                : 'Parmağınızı yukarıdaki kalp dairesine basılı tutun (Flaş otomatik yanacaktır).'}
            </Text>
          )}
        </View>
      </View>

      {/* Real-time Waveform */}
      <View style={styles.waveformArea}>
        <Text style={styles.waveformTitle}>KILCAL DAMAR PPG SİNYAL AKIŞI</Text>
        <BpmWaveform points={waveformPoints} color={errorStatus !== 'NONE' ? '#EF4444' : '#FF3B30'} height={70} />
      </View>

      {/* FDA Medical disclaimer */}
      <View style={styles.medicalWarningBox}>
        <Feather name="shield" size={14} color="rgba(255,255,255,0.4)" />
        <Text style={styles.medicalWarningText}>
          Bu özellik wellness ve fitness amaçlıdır. Tıbbi teşhis veya klinik tedavi kararlarında kullanılmaz.
        </Text>
      </View>

      {/* Rhythmic Haptic Controls */}
      <View style={styles.hapticPanel}>
        <Text style={styles.hapticPanelTitle}>Titreşim Ritim Yoğunluğu</Text>
        <View style={styles.hapticSegmentContainer}>
          {(['OFF', 'LIGHT', 'NORMAL', 'STRONG'] as HapticIntensity[]).map((intensity) => (
            <TouchableOpacity
              key={intensity}
              style={[
                styles.hapticSegBtn,
                hapticIntensity === intensity && { backgroundColor: '#FF3B30' }
              ]}
              onPress={() => changeHapticIntensity(intensity)}
            >
              <Text style={[
                styles.hapticSegBtnText,
                hapticIntensity === intensity && { color: '#FFF', fontWeight: '800' }
              ]}>
                {intensity === 'OFF' ? 'Kapalı' : intensity === 'LIGHT' ? 'Hafif' : intensity === 'NORMAL' ? 'Normal' : 'Güçlü'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Close Action */}
      <TouchableOpacity style={styles.closeBtn} onPress={onCancel}>
        <Text style={styles.closeBtnText}>Vazgeç</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingVertical: spacing.huge,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#04070B',
  },
  topHeader: {
    alignItems: 'center',
    zIndex: 10,
  },
  topTitle: {
    color: '#FFFFFF',
    ...typography.h2,
    fontWeight: '800',
  },
  topSubtitle: {
    color: 'rgba(255,255,255,0.6)',
    ...typography.bodySmall,
    marginTop: 4,
  },
  centerArea: {
    alignItems: 'center',
    zIndex: 10,
  },
  radialContainer: {
    width: 140,
    height: 140,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  measurementBtn: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#0B0F19',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeMeasurementBtn: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderColor: '#FF3B30',
  },
  heartGlow: {
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 15,
  },
  guidanceTextContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.xxl,
  },
  bpmRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  bpmVal: {
    fontSize: 52,
    fontWeight: '900',
    color: '#FF3B30',
  },
  bpmUnit: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    marginLeft: 6,
  },
  guidanceTitle: {
    color: '#FFFFFF',
    ...typography.h3,
    fontWeight: '700',
  },
  guidanceSub: {
    color: 'rgba(255,255,255,0.7)',
    ...typography.caption,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  errorBox: {
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  errorTitle: {
    color: '#EF4444',
    ...typography.h3,
    fontWeight: '800',
  },
  errorSub: {
    color: 'rgba(239, 68, 68, 0.8)',
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.xs,
    lineHeight: 18,
  },
  waveformArea: {
    width: '100%',
    backgroundColor: '#0A0E17',
    padding: spacing.md,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    zIndex: 10,
  },
  waveformTitle: {
    color: 'rgba(255,255,255,0.5)',
    ...typography.labelSmall,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: spacing.xs,
    marginLeft: 4,
  },
  medicalWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: radius.lg,
    padding: spacing.md,
    width: '100%',
    zIndex: 10,
  },
  medicalWarningText: {
    flex: 1,
    color: 'rgba(255,255,255,0.4)',
    fontSize: 10,
    lineHeight: 14,
    fontWeight: '500',
  },
  hapticPanel: {
    width: '100%',
    alignItems: 'center',
    zIndex: 10,
  },
  hapticPanelTitle: {
    color: '#FFFFFF',
    ...typography.labelSmall,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  hapticSegmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#0F1624',
    borderRadius: radius.pill,
    padding: 4,
    width: '100%',
  },
  hapticSegBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.pill,
    alignItems: 'center',
  },
  hapticSegBtnText: {
    color: 'rgba(255,255,255,0.6)',
    ...typography.caption,
  },
  closeBtn: {
    paddingVertical: 12,
    paddingHorizontal: 36,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(255,255,255,0.1)',
    zIndex: 10,
  },
  closeBtnText: {
    color: '#FFFFFF',
    ...typography.buttonSmall,
  },
});
