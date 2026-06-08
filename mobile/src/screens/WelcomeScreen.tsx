import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, typography } from '../theme';
import type { ThemeColors } from '../theme';

const { width, height } = Dimensions.get('window');

interface WelcomeScreenProps {
  isDarkMode: boolean;
  onLogin: () => void;
  onRegister: () => void;
}

export default function WelcomeScreen({ isDarkMode, onLogin, onRegister }: WelcomeScreenProps) {
  const c = isDarkMode ? colors.dark : colors.light;

  // Animations
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const titleY = useRef(new Animated.Value(40)).current;
  const titleOpacity = useRef(new Animated.Value(0)).current;
  const subtitleY = useRef(new Animated.Value(30)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;
  const buttonsY = useRef(new Animated.Value(50)).current;
  const buttonsOpacity = useRef(new Animated.Value(0)).current;
  const trustY = useRef(new Animated.Value(20)).current;
  const trustOpacity = useRef(new Animated.Value(0)).current;

  // Floating orb animations
  const orb1Anim = useRef(new Animated.Value(0)).current;
  const orb2Anim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Staggered entry animation
    Animated.sequence([
      Animated.parallel([
        Animated.spring(logoScale, { toValue: 1, friction: 8, tension: 40, useNativeDriver: true }),
        Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(titleY, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(titleOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(subtitleY, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(subtitleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(buttonsY, { toValue: 0, duration: 400, useNativeDriver: true }),
        Animated.timing(buttonsOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(trustY, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(trustOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
    ]).start();

    // Floating orbs
    Animated.loop(
      Animated.sequence([
        Animated.timing(orb1Anim, { toValue: 1, duration: 6000, useNativeDriver: true }),
        Animated.timing(orb1Anim, { toValue: 0, duration: 6000, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(orb2Anim, { toValue: 1, duration: 8000, useNativeDriver: true }),
        Animated.timing(orb2Anim, { toValue: 0, duration: 8000, useNativeDriver: true }),
      ])
    ).start();

    // Pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 2000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const orb1TranslateY = orb1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -20],
  });

  const orb2TranslateX = orb2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 15],
  });

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      {/* Background gradient orbs */}
      <Animated.View
        style={[
          styles.orb1,
          {
            backgroundColor: isDarkMode ? 'rgba(88,166,255,0.06)' : 'rgba(10,132,255,0.05)',
            transform: [{ translateY: orb1TranslateY }],
          },
        ]}
      />
      <Animated.View
        style={[
          styles.orb2,
          {
            backgroundColor: isDarkMode ? 'rgba(139,139,245,0.05)' : 'rgba(94,92,230,0.04)',
            transform: [{ translateX: orb2TranslateX }],
          },
        ]}
      />

      {/* Logo */}
      <Animated.View
        style={[
          styles.logoContainer,
          { opacity: logoOpacity, transform: [{ scale: logoScale }] },
        ]}
      >
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <LinearGradient
            colors={[c.gradientStart, c.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoGradient}
          >
            <Text style={styles.logoIcon}>⚕️</Text>
          </LinearGradient>
        </Animated.View>
        <View style={[styles.logoGlow, { backgroundColor: c.primary }]} />
      </Animated.View>

      {/* App name */}
      <Animated.View
        style={{ opacity: titleOpacity, transform: [{ translateY: titleY }] }}
      >
        <Text style={[styles.appName, { color: c.textPrimary }]}>
          Medi<Text style={{ color: c.primary }}>flow</Text>
        </Text>
      </Animated.View>

      {/* Main heading */}
      <Animated.View
        style={{
          opacity: titleOpacity,
          transform: [{ translateY: titleY }],
          marginTop: spacing.lg,
        }}
      >
        <Text style={[styles.title, { color: c.textPrimary }]}>
          Sağlığını{'\n'}Kontrol Altına Al
        </Text>
      </Animated.View>

      {/* Subtitle */}
      <Animated.View
        style={{
          opacity: subtitleOpacity,
          transform: [{ translateY: subtitleY }],
          marginTop: spacing.md,
        }}
      >
        <Text style={[styles.subtitle, { color: c.textSecondary }]}>
          Tüm sağlık geçmişini, ilaçlarını ve doktor{'\n'}kayıtlarını tek yerde güvenle yönet.
        </Text>
      </Animated.View>

      {/* Feature pills */}
      <Animated.View
        style={[
          styles.featurePills,
          { opacity: subtitleOpacity, transform: [{ translateY: subtitleY }] },
        ]}
      >
        {['AI Analiz', 'İlaç Takibi', 'Tahlil Okuma'].map((feature, i) => (
          <View
            key={i}
            style={[
              styles.featurePill,
              { backgroundColor: c.surfaceSecondary, borderColor: c.border },
            ]}
          >
            <Text style={[styles.featurePillDot, { color: c.primary }]}>●</Text>
            <Text style={[styles.featurePillText, { color: c.textSecondary }]}>
              {feature}
            </Text>
          </View>
        ))}
      </Animated.View>

      {/* Buttons */}
      <Animated.View
        style={[
          styles.buttonsContainer,
          { opacity: buttonsOpacity, transform: [{ translateY: buttonsY }] },
        ]}
      >
        <TouchableOpacity activeOpacity={0.8} onPress={onLogin}>
          <LinearGradient
            colors={[c.gradientStart, c.gradientEnd]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>Giriş Yap</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={onRegister}
          style={[
            styles.secondaryBtn,
            { borderColor: c.borderStrong, backgroundColor: c.surface },
          ]}
        >
          <Text style={[styles.secondaryBtnText, { color: c.primary }]}>
            Hesabın Yok mu? Kaydol
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* Trust section */}
      <Animated.View
        style={[
          styles.trustSection,
          { opacity: trustOpacity, transform: [{ translateY: trustY }] },
        ]}
      >
        <View style={[styles.trustBadge, { backgroundColor: c.surfaceSecondary }]}>
          <Text style={styles.trustIcon}>🔒</Text>
          <Text style={[styles.trustText, { color: c.textTertiary }]}>
            Verileriniz AES-256 ile şifrelenerek korunur
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  orb1: {
    position: 'absolute',
    top: -80,
    right: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
  },
  orb2: {
    position: 'absolute',
    bottom: -40,
    left: -80,
    width: 320,
    height: 320,
    borderRadius: 160,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  logoGradient: {
    width: 80,
    height: 80,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoIcon: {
    fontSize: 36,
  },
  logoGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 26,
    opacity: 0.15,
    transform: [{ scale: 1.3 }],
    zIndex: -1,
  },
  appName: {
    ...typography.h2,
    textAlign: 'center',
    fontWeight: '800',
  },
  title: {
    ...typography.displayLarge,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 24,
  },
  featurePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  featurePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  featurePillDot: {
    fontSize: 6,
    marginRight: 6,
  },
  featurePillText: {
    ...typography.caption,
    fontWeight: '500',
  },
  buttonsContainer: {
    width: '100%',
    marginTop: spacing.xxxl,
    gap: spacing.md,
  },
  primaryBtn: {
    height: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#FFFFFF',
    ...typography.button,
    fontWeight: '700',
  },
  secondaryBtn: {
    height: 56,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  secondaryBtnText: {
    ...typography.button,
    fontWeight: '600',
  },
  trustSection: {
    marginTop: spacing.xxl,
    alignItems: 'center',
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
  },
  trustIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  trustText: {
    ...typography.labelSmall,
    fontWeight: '500',
  },
});
