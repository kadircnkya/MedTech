import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, typography } from '../theme';

interface LoginScreenProps {
  isDarkMode: boolean;
  onLogin: () => void;
  onRegister?: () => void;
  onBack: () => void;
}

export default function LoginScreen({ isDarkMode, onLogin, onRegister, onBack }: LoginScreenProps) {
  const c = isDarkMode ? colors.dark : colors.light;
  const [email, setEmail] = useState('demo@mediflow.com');
  const [password, setPassword] = useState('123456');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const validateAndLogin = () => {
    if (!email.includes('@') || !email.includes('.')) {
      setEmailError('Geçerli bir e-posta adresi giriniz.');
      return;
    }
    setEmailError('');
    onLogin();
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: c.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back button */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <TouchableOpacity
            onPress={onBack}
            style={[styles.backBtn, { backgroundColor: c.surface, borderColor: c.border }]}
          >
            <Text style={[styles.backBtnText, { color: c.textPrimary }]}>← Geri</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Header */}
        <Animated.View
          style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <View style={[styles.miniLogo, { backgroundColor: c.primaryLight }]}>
            <Text style={styles.miniLogoText}>⚕️</Text>
          </View>
          <Text style={[styles.title, { color: c.textPrimary }]}>Tekrar Hoş Geldin</Text>
          <Text style={[styles.subtitle, { color: c.textSecondary }]}>
            Mediflow hesabına giriş yaparak sağlık verilerine güvenle eriş.
          </Text>
        </Animated.View>

        {/* Form Card */}
        <Animated.View
          style={[
            styles.formCard,
            {
              backgroundColor: c.surface,
              borderColor: c.border,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={[styles.label, { color: c.textSecondary }]}>E-Posta Adresi</Text>
          <View
            style={[
              styles.inputContainer,
              {
                backgroundColor: c.surfaceSecondary,
                borderColor: emailError ? c.error : c.border,
              },
            ]}
          >
            <Text style={styles.inputIcon}>📧</Text>
            <TextInput
              style={[styles.input, { color: c.textPrimary }]}
              placeholder="kullanici@mediflow.com"
              placeholderTextColor={c.textTertiary}
              value={email}
              onChangeText={(t) => { setEmail(t); setEmailError(''); }}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>
          {emailError ? (
            <Text style={[styles.errorText, { color: c.error }]}>⚠️ {emailError}</Text>
          ) : null}

          <Text style={[styles.label, { color: c.textSecondary, marginTop: spacing.lg }]}>
            Şifre
          </Text>
          <View
            style={[
              styles.inputContainer,
              { backgroundColor: c.surfaceSecondary, borderColor: c.border },
            ]}
          >
            <Text style={styles.inputIcon}>🔑</Text>
            <TextInput
              style={[styles.input, { color: c.textPrimary }]}
              placeholder="••••••••"
              placeholderTextColor={c.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Text style={[styles.showBtn, { color: c.primary }]}>
                {showPassword ? 'Gizle' : 'Göster'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.forgotBtn}>
            <Text style={[styles.forgotText, { color: c.primary }]}>Şifremi Unuttum</Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.8} onPress={validateAndLogin} style={{ marginTop: spacing.xl }}>
            <LinearGradient
              colors={[c.gradientStart, c.gradientEnd]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.loginBtn}
            >
              <Text style={styles.loginBtnText}>Giriş Yap</Text>
            </LinearGradient>
          </TouchableOpacity>

          {onRegister && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onRegister}
              style={[
                styles.registerBtn,
                { borderColor: c.borderStrong, backgroundColor: c.surface },
              ]}
            >
              <Text style={[styles.registerBtnText, { color: c.primary }]}>
                Hesabın Yok mu? Kaydol
              </Text>
            </TouchableOpacity>
          )}

          <View style={styles.demoNotice}>
            <View style={[styles.demoChip, { backgroundColor: c.primaryLight }]}>
              <Text style={[styles.demoText, { color: c.primary }]}>
                Demo kimlik bilgileri otomatik doldurulmuştur
              </Text>
            </View>
          </View>
        </Animated.View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.huge,
    paddingBottom: spacing.xxxl,
  },
  backBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    marginBottom: spacing.xxxl,
  },
  backBtnText: {
    ...typography.buttonSmall,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxxl,
  },
  miniLogo: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  miniLogoText: { fontSize: 28 },
  title: {
    ...typography.h1,
    textAlign: 'center',
    fontWeight: '800',
  },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
    marginTop: spacing.sm,
    lineHeight: 22,
    paddingHorizontal: spacing.xl,
  },
  formCard: {
    borderRadius: radius.xxl,
    padding: spacing.xxl,
    borderWidth: 1,
  },
  label: {
    ...typography.label,
    marginBottom: spacing.sm,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    height: 52,
  },
  inputIcon: {
    fontSize: 16,
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    ...typography.body,
    height: '100%',
  },
  showBtn: {
    ...typography.buttonSmall,
    paddingHorizontal: spacing.sm,
  },
  errorText: {
    ...typography.caption,
    marginTop: spacing.xs,
    fontWeight: '500',
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: spacing.md,
  },
  forgotText: {
    ...typography.buttonSmall,
  },
  loginBtn: {
    height: 54,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginBtnText: {
    color: '#FFFFFF',
    ...typography.button,
    fontWeight: '700',
  },
  registerBtn: {
    height: 54,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    marginTop: spacing.md,
  },
  registerBtnText: {
    ...typography.button,
    fontWeight: '600',
  },
  demoNotice: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  demoChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
  },
  demoText: {
    ...typography.labelSmall,
    fontWeight: '500',
  },
});
