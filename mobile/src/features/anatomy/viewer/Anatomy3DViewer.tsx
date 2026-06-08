import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, PanResponder, Text, TouchableOpacity, Animated, Easing } from 'react-native';
import Svg, { Path, Circle, G, Defs, RadialGradient, Stop, Line, Rect } from 'react-native-svg';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useTheme } from '../../../hooks/useTheme';
import { spacing, radius, typography } from '../../../theme';
import { hapticService } from '../../heartRate/haptics/HapticService';
import { AnatomyMarker } from '../types';

let GLView: any = null;
let THREE: any = null;
try {
  GLView = require('expo-gl').GLView;
  THREE = require('three');
} catch (e) {
  // WebGL fallback
}

interface Anatomy3DViewerProps {
  markers: AnatomyMarker[];
  onSelectMarker: (marker: AnatomyMarker) => void;
}

export default function Anatomy3DViewer({
  markers,
  onSelectMarker,
}: Anatomy3DViewerProps) {
  const { colors, isDarkMode } = useTheme();

  // States
  const [glSupported, setGlSupported] = useState(false);
  const [orientation, setOrientation] = useState<'ANTERIOR' | 'POSTERIOR'>('ANTERIOR');
  const [vectorZoom, setVectorZoom] = useState(1.1);

  // Unified Multi-Layer Animations
  const breathingAnim = useRef(new Animated.Value(0)).current; // Normal chest expansion (breathing loop)
  const scanAnim = useRef(new Animated.Value(0)).current;      // Continuous laser sweep
  const pulseAnim = useRef(new Animated.Value(0.4)).current;    // Rhythmic heart beat pulse
  const particlesAnim = useRef(new Animated.Value(0)).current;  // Upward particle drift

  // ThreeJS references
  const rotationY = useRef(0);
  const rotationX = useRef(0);
  const zoomFactor = useRef(1.2);
  const glRef = useRef<any>(null);
  const bodyGroupRef = useRef<any | null>(null);
  const markersGroupRef = useRef<any | null>(null);

  // Gesture Controls
  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (evt, gestureState) => {
      rotationY.current += gestureState.vx * 0.08;
      rotationX.current = Math.max(-0.6, Math.min(0.6, rotationX.current + gestureState.vy * 0.04));
      
      if (bodyGroupRef.current) {
        bodyGroupRef.current.rotation.y = rotationY.current;
        bodyGroupRef.current.rotation.x = rotationX.current;
      }
      if (markersGroupRef.current) {
        markersGroupRef.current.rotation.y = rotationY.current;
        markersGroupRef.current.rotation.x = rotationX.current;
      }
    },
    onPanResponderRelease: (evt, gestureState) => {
      if (Math.abs(gestureState.dx) > 30) {
        setOrientation(prev => prev === 'ANTERIOR' ? 'POSTERIOR' : 'ANTERIOR');
        hapticService.triggerHeartbeat();
      }
    }
  });

  const handleZoomIn = () => {
    setVectorZoom(prev => Math.min(1.4, prev + 0.1));
    zoomFactor.current = Math.min(2.5, zoomFactor.current + 0.25);
  };

  const handleZoomOut = () => {
    setVectorZoom(prev => Math.max(0.8, prev - 0.1));
    zoomFactor.current = Math.max(0.6, zoomFactor.current - 0.25);
  };

  // Wire up the dynamic animation cycles
  useEffect(() => {
    if (GLView && THREE) {
      setGlSupported(true);
    }

    // 1. Organic Breathing Loop (4 seconds slow duration)
    Animated.loop(
      Animated.sequence([
        Animated.timing(breathingAnim, {
          toValue: 1.0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breathingAnim, {
          toValue: 0.0,
          duration: 2200,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // 2. High-Frequency Cardiovascular Heart Beat Pulse (75 BPM)
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 180, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.85, duration: 120, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 150, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 350, useNativeDriver: true }),
      ])
    ).start();

    // 3. Upward Particle Flow Drift
    Animated.loop(
      Animated.timing(particlesAnim, {
        toValue: 1.0,
        duration: 4800,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // 4. Laser Scanline
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanAnim, { toValue: 1.0, duration: 3600, useNativeDriver: true }),
        Animated.timing(scanAnim, { toValue: 0.0, duration: 3600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // WebGL Cinematic 3D Shader Generator
  const onContextCreate = async (gl: any) => {
    glRef.current = gl;
    const { drawingBufferWidth: width, drawingBufferHeight: height } = gl;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(isDarkMode ? '#05080E' : '#F8FAFC');

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({
      canvas: {
        width,
        height,
        style: {},
        addEventListener: (() => {}) as any,
        removeEventListener: (() => {}) as any,
        clientHeight: height,
      } as any,
      context: gl,
      antialias: true,
    });
    renderer.setSize(width, height);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambientLight);

    const blueRimLight = new THREE.PointLight(0x06B6D4, 2.5, 20); // Sci-Fi Cyan
    blueRimLight.position.set(-5, 3, 5);
    scene.add(blueRimLight);

    const redRimLight = new THREE.PointLight(0xFF7A00, 2.0, 20);  // Warm capillary orange
    redRimLight.position.set(5, -3, 3);
    scene.add(redRimLight);

    const bodyGroup = new THREE.Group();
    scene.add(bodyGroup);
    bodyGroupRef.current = bodyGroup;

    const markersGroup = new THREE.Group();
    scene.add(markersGroup);
    markersGroupRef.current = markersGroup;

    // A. 3D Procedural Point-Cloud Silhouette
    const pointsGeom = new THREE.BufferGeometry();
    const particleCount = 600;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const u = Math.random() * 2 - 1;
      const r = Math.sqrt(1 - u * u) * (Math.random() * 0.18 + 0.45);
      positions[i * 3] = r * Math.cos(theta);
      positions[i * 3 + 1] = u * 1.7 + 0.45;
      positions[i * 3 + 2] = r * Math.sin(theta);
    }
    pointsGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pointsMat = new THREE.PointsMaterial({
      color: 0x06B6D4,
      size: 0.045,
      transparent: true,
      opacity: 0.65,
    });
    const pointCloud = new THREE.Points(pointsGeom, pointsMat);
    bodyGroup.add(pointCloud);

    // B. Inner Glowing Capillaries (Vascular Orange Lines)
    const capMat = new THREE.MeshBasicMaterial({
      color: 0xFF5500,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
    });
    const capGeom = new THREE.CylinderGeometry(0.32, 0.18, 1.3, 8);
    const capMesh = new THREE.Mesh(capGeom, capMat);
    capMesh.position.y = 0.5;
    bodyGroup.add(capMesh);

    // C. Glowing Heart Core Sphere
    const heartCoreGeom = new THREE.SphereGeometry(0.18, 16, 16);
    const heartCoreMat = new THREE.MeshBasicMaterial({
      color: 0xFF2A00,
      transparent: true,
      opacity: 0.88,
    });
    const heartCore = new THREE.Mesh(heartCoreGeom, heartCoreMat);
    heartCore.position.set(-0.12, 0.7, 0.2);
    bodyGroup.add(heartCore);

    // D. Laser Scanner ring
    const laserGeom = new THREE.RingGeometry(0.75, 0.77, 24);
    const laserMat = new THREE.MeshBasicMaterial({
      color: 0x00FF66,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.85,
    });
    const laserRing = new THREE.Mesh(laserGeom, laserMat);
    laserRing.rotation.x = Math.PI / 2;
    bodyGroup.add(laserRing);

    // Diagnostic targets
    markers.forEach((mark) => {
      const targetGeom = new THREE.SphereGeometry(0.1, 16, 16);
      const targetMat = new THREE.MeshBasicMaterial({
        color: 0xFF3B30,
        transparent: true,
        opacity: 0.9,
      });
      const targetMesh = new THREE.Mesh(targetGeom, targetMat);
      targetMesh.position.set(mark.position.x, mark.position.y, mark.position.z);
      markersGroup.add(targetMesh);
    });

    // 60 FPS Render Loop
    const animate = () => {
      requestAnimationFrame(animate);

      const time = Date.now() * 0.002;
      camera.position.z = 5 / zoomFactor.current;

      // 1. Breathing Expansion simulation in 3D
      const breathScale = 1.0 + Math.sin(time) * 0.025;
      bodyGroup.scale.set(breathScale, 1.0 + Math.sin(time) * 0.015, breathScale);
      
      // 2. Heart Beat pulse scale
      const heartPulse = 1.0 + Math.sin(time * 6.5) * 0.18;
      heartCore.scale.set(heartPulse, heartPulse, heartPulse);

      // 3. Sliding Laser Ring
      laserRing.position.y = 0.5 + Math.sin(time * 1.5) * 0.8;

      // 4. Node glow loops
      markersGroup.children.forEach((child: any) => {
        const pulse = 1.0 + Math.sin(time * 4.5) * 0.15;
        child.scale.set(pulse, pulse, pulse);
      });

      renderer.render(scene, camera);
      gl.endFrameEXP();
    };

    animate();
  };

  // Render high fidelity AI Medical HUD blueprint for Expo compatibility
  const renderVectorFallback = () => {
    // A. Interpolate slow, organic breathing (idle scaling & swaying)
    const breathScaleX = breathingAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1.0, 1.03],
    });
    const breathScaleY = breathingAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [1.0, 1.018],
    });
    const breathingY = breathingAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [0, -2.5],
    });

    // B. Laser scanning lines interpolation
    const laserTranslateY = scanAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [20, 360],
    });

    // C. Heart Beat Pulsing scale (rhythmic cardio pulse)
    const heartPulseScale = pulseAnim.interpolate({
      inputRange: [0.4, 1.15],
      outputRange: [0.8, 1.25],
    });

    // D. Floating particles drift animations (Native Driver support via transform translateY)
    const particleDrift1 = particlesAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [120, 20],
    });
    const particleDrift2 = particlesAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [130, 30],
    });
    const particleDrift3 = particlesAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [110, 10],
    });

    return (
      <View style={styles.vectorContainer} {...panResponder.panHandlers}>
        {/* Holographic Radar Backdrop Grid */}
        <View style={styles.gridOverlay} pointerEvents="none">
          <View style={styles.gridLineHorizontal} />
          <View style={styles.gridLineVertical} />
        </View>

        {/* Cinematic Scanning Laser bar with intense CSS green glow */}
        <Animated.View 
          style={[
            styles.laserBar, 
            { 
              transform: [{ translateY: laserTranslateY }] 
            }
          ]} 
        />

        {/* Interactive Holographic Medical HUD details */}
        <View style={styles.hudScope} pointerEvents="none">
          {/* Circular Scope frame */}
          <View style={styles.scopeBorder} />
          <View style={[styles.scopeTicks, { borderColor: 'rgba(6, 182, 212, 0.06)' }]} />
        </View>

        {/* Live Energy Data Flow Overlay (Simulating particles flowing up the spine) */}
        <View style={styles.particleEngine} pointerEvents="none">
          <Animated.View style={[styles.particleNode, { transform: [{ translateY: particleDrift1 }], left: 104, opacity: 0.8 }]} />
          <Animated.View style={[styles.particleNode, { transform: [{ translateY: particleDrift2 }], left: 114, opacity: 0.4 }]} />
          <Animated.View style={[styles.particleNode, { transform: [{ translateY: particleDrift3 }], left: 96, opacity: 0.9 }]} />
          <Animated.View style={[styles.particleNode, { transform: [{ translateY: particleDrift1 }], left: 118, opacity: 0.5 }]} />
        </View>

        {/* Breathing animated wrap */}
        <Animated.View 
          style={{ 
            transform: [
              { scaleX: breathScaleX }, 
              { scaleY: breathScaleY },
              { translateY: breathingY },
              { scale: vectorZoom }
            ], 
            width: 220, 
            height: 290, 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}
        >
          <Svg width="220" height="290" viewBox="0 0 100 120">
            <Defs>
              <RadialGradient id="pulseGlow" cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0%" stopColor="#FF3B30" stopOpacity="1" />
                <Stop offset="100%" stopColor="#FF3B30" stopOpacity="0" />
              </RadialGradient>
              <RadialGradient id="heartGlow" cx="50%" cy="50%" rx="50%" ry="50%">
                <Stop offset="0%" stopColor="#FF1E00" stopOpacity="0.95" />
                <Stop offset="100%" stopColor="#FF1E00" stopOpacity="0" />
              </RadialGradient>
            </Defs>

            {/* Fütüristik e-Nabız 3D Network Pusula Halkaları */}
            <Circle cx="50" cy="60" r="46" fill="none" stroke="rgba(6, 182, 212, 0.1)" strokeWidth="0.5" strokeDasharray="3,3" />
            <Circle cx="50" cy="60" r="42" fill="none" stroke="rgba(6, 182, 212, 0.04)" strokeWidth="0.8" />

            {/* UNIFIED MULTI-LAYER X-RAY ANATOMICAL NETWORKS */}
            <G opacity="0.92">
              
              {/* 1. BLUE FRESNEL OUTLINE BOUNDS */}
              <Path 
                d="M 36 32 L 39 72 L 61 72 L 64 32 Z" 
                fill="none" 
                stroke="rgba(6, 182, 212, 0.45)" 
                strokeWidth="1.2" 
                strokeDasharray="4,4" 
              />
              <Circle cx="50" cy="18" r="8.2" fill="none" stroke="rgba(6, 182, 212, 0.55)" strokeWidth="1" />

              {/* 2. SKELETAL VERTEBRAE SPINE NODES (Translucent white backbone visible) */}
              <Path d="M 50 28 L 50 72" stroke="rgba(255,255,255,0.22)" strokeWidth="1.5" strokeDasharray="2,2" />
              <Rect x="48.5" y="34" width="3" height="1.8" rx="0.5" fill="rgba(255,255,255,0.4)" />
              <Rect x="48.2" y="39" width="3.6" height="1.8" rx="0.5" fill="rgba(255,255,255,0.4)" />
              <Rect x="48" y="44" width="4" height="1.8" rx="0.5" fill="rgba(255,255,255,0.4)" />
              <Rect x="48.2" y="49" width="3.6" height="1.8" rx="0.5" fill="rgba(255,255,255,0.4)" />
              <Rect x="48.5" y="54" width="3" height="1.8" rx="0.5" fill="rgba(255,255,255,0.4)" />

              {/* 3. NEON ORANGE CARDIOVASCULAR ARTERY BRANCHINGS (Always visible capillary grid) */}
              <Path d="M 50 32 L 50 70" stroke="#FF7A00" strokeWidth="1.8" />
              <Path d="M 50 42 Q 38 45 32 58" fill="none" stroke="#FF7A00" strokeWidth="0.8" opacity="0.8" />
              <Path d="M 50 42 Q 62 45 68 58" fill="none" stroke="#FF7A00" strokeWidth="0.8" opacity="0.8" />
              <Path d="M 50 52 Q 41 55 36 68" fill="none" stroke="#FF7A00" strokeWidth="0.6" opacity="0.75" />
              <Path d="M 50 52 Q 59 55 64 68" fill="none" stroke="#FF7A00" strokeWidth="0.6" opacity="0.75" />

              {/* 4. VOLUMETRIC GREEN ORGAN SHADOWS (Pulsing lungs space) */}
              <Circle cx="42" cy="38" r="4.2" fill="#10B981" opacity="0.22" />
              <Circle cx="58" cy="38" r="4.2" fill="#10B981" opacity="0.22" />

              {/* 5. ACTIVE HIGH-FREQUENCY PULSING HEART NODE (Simulating living organic beat) */}
              <Animated.View style={{ transform: [{ scale: heartPulseScale }] }}>
                <Circle cx="46.5" cy="42" r="5" fill="url(#heartGlow)" />
                <Circle cx="46.5" cy="42" r="2" fill="#FF1E00" opacity="0.9" />
              </Animated.View>

              {/* LIMB NETWORKS */}
              {/* Arms */}
              <Line x1="34" y1="32" x2="28" y2="62" stroke="rgba(6, 182, 212, 0.35)" strokeWidth="1" />
              <Circle cx="28" cy="62" r="1.5" fill="#06B6D4" />
              {/* Legs */}
              <Line x1="41" y1="72" x2="37" y2="108" stroke="rgba(6, 182, 212, 0.35)" strokeWidth="1.2" />
              <Line x1="59" y1="72" x2="63" y2="108" stroke="rgba(6, 182, 212, 0.35)" strokeWidth="1.2" />
              <Circle cx="37" cy="108" r="1.5" fill="#06B6D4" />
              <Circle cx="63" cy="108" r="1.5" fill="#06B6D4" />

            </G>

            {/* Glowing Radar Pulse Diagnostic Target Nodes */}
            {markers.map((mark) => {
              let cx = 50;
              let cy = 60;
              
              if (mark.bodyPart === 'HEAD') { cx = 50; cy = 18; }
              else if (mark.bodyPart === 'CHEST') { cx = 50; cy = 46; }
              else if (mark.bodyPart === 'BACK') { cx = 50; cy = 54; }
              else if (mark.bodyPart === 'KNEE') { cx = 39; cy = 90; }

              // View filtering flip
              if (mark.bodyPart === 'BACK' && orientation === 'ANTERIOR') return null;
              if (mark.bodyPart === 'CHEST' && orientation === 'POSTERIOR') return null;

              return (
                <G key={mark.id}>
                  {/* Outer sonar radar lines yayılan veri hissi */}
                  <Circle cx={cx} cy={cy} r="8.5" fill="none" stroke="rgba(255, 59, 48, 0.2)" strokeWidth="0.5" />
                  <Circle cx={cx} cy={cy} r="6.5" fill="url(#pulseGlow)" />
                  <Circle
                    cx={cx}
                    cy={cy}
                    r="3.0"
                    fill="#FF3B30"
                    onPress={() => {
                      onSelectMarker(mark);
                      hapticService.triggerHeartbeat();
                    }}
                  />
                </G>
              );
            })}
          </Svg>
        </Animated.View>

        {/* Swipe axis visual HUD */}
        <TouchableOpacity 
          style={[styles.flipBtn, { backgroundColor: colors.surfaceSecondary }]} 
          onPress={() => {
            setOrientation(prev => prev === 'ANTERIOR' ? 'POSTERIOR' : 'ANTERIOR');
            hapticService.triggerHeartbeat();
          }}
        >
          <Ionicons name="sync" size={13} color={colors.textPrimary} />
          <Text style={[styles.flipBtnText, { color: colors.textPrimary }]}>Modeli Çevir</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#05070D' : '#F8FAFC', borderColor: colors.border }]}>
      
      {/* Dynamic 3D Engine Switcher */}
      {glSupported && GLView ? (
        <GLView style={styles.glView} onContextCreate={onContextCreate} />
      ) : (
        renderVectorFallback()
      )}

      {/* Futuristic Floating HUD Scope Telemetry */}
      <View style={styles.hudOverlay} pointerEvents="none">
        <View style={styles.scannerBadge}>
          <Text style={styles.scannerBadgeText}>AI TARGET TRACKING: ACTIVE</Text>
        </View>
        <Text style={[styles.hudLabel, { color: '#06B6D4', marginTop: 6 }]}>COGNITIVE BIOMEDICAL RADAR</Text>
        <Text style={[styles.hudSub, { color: colors.textSecondary }]}>
          {orientation === 'ANTERIOR' ? 'ANTERIOR VIEW (RESPIRATION: 18 BPM)' : 'POSTERIOR VIEW (TELEMETRY: ESTABLISHED)'}
        </Text>
      </View>

      {/* Telemetry data side values (Tony Stark style metrics) */}
      <View style={styles.metricsBox} pointerEvents="none">
        <Text style={styles.metricText}>SYS: ONLINE</Text>
        <Text style={styles.metricText}>BPM: 72 (PULSING)</Text>
        <Text style={styles.metricText}>SCANNER: 360°</Text>
      </View>

      {/* Grid Scale Controls */}
      <View style={styles.zoomControls}>
        <TouchableOpacity style={[styles.zoomBtn, { backgroundColor: colors.surfaceSecondary }]} onPress={handleZoomIn}>
          <Feather name="plus" size={14} color={colors.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity style={[styles.zoomBtn, { backgroundColor: colors.surfaceSecondary, marginTop: spacing.sm }]} onPress={handleZoomOut}>
          <Feather name="minus" size={14} color={colors.textPrimary} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 400,
    borderRadius: radius.xxl,
    borderWidth: 1,
    overflow: 'hidden',
    position: 'relative',
    marginVertical: spacing.md,
  },
  glView: {
    flex: 1,
  },
  vectorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  laserBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2.2,
    backgroundColor: '#00FF66',
    zIndex: 12,
    shadowColor: '#00FF66',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.95,
    shadowRadius: 8,
    elevation: 6,
    opacity: 0.9,
  },
  hudScope: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scopeBorder: {
    width: 250,
    height: 250,
    borderRadius: 125,
    borderWidth: 0.5,
    borderColor: 'rgba(6, 182, 212, 0.08)',
    position: 'absolute',
  },
  scopeTicks: {
    width: 270,
    height: 270,
    borderRadius: 135,
    borderWidth: 1,
    borderStyle: 'dashed',
    position: 'absolute',
  },
  particleEngine: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    zIndex: 8,
  },
  particleNode: {
    position: 'absolute',
    width: 2.5,
    height: 2.5,
    borderRadius: 1.25,
    backgroundColor: '#06B6D4',
    shadowColor: '#06B6D4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 2,
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.1,
  },
  gridLineHorizontal: {
    width: '100%',
    height: 1,
    backgroundColor: '#06B6D4',
    position: 'absolute',
  },
  gridLineVertical: {
    width: 1,
    height: '100%',
    backgroundColor: '#06B6D4',
    position: 'absolute',
  },
  hudOverlay: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
  },
  scannerBadge: {
    backgroundColor: 'rgba(6, 182, 212, 0.12)',
    borderRadius: radius.sm,
    paddingVertical: 2,
    paddingHorizontal: 8,
    alignSelf: 'flex-start',
  },
  scannerBadgeText: {
    color: '#06B6D4',
    fontSize: 7,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  hudLabel: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
  },
  hudSub: {
    fontSize: 8,
    fontWeight: '600',
    marginTop: 2,
  },
  metricsBox: {
    position: 'absolute',
    bottom: spacing.md,
    left: spacing.md,
    gap: 3,
  },
  metricText: {
    color: 'rgba(6, 182, 212, 0.55)',
    fontSize: 7,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  zoomControls: {
    position: 'absolute',
    bottom: spacing.md,
    right: spacing.md,
  },
  zoomBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flipBtn: {
    position: 'absolute',
    bottom: spacing.md,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
  },
  flipBtnText: {
    fontSize: 9,
    fontWeight: '700',
  },
});
