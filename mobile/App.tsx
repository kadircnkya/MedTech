import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { AppProvider, useAppStore } from './src/store/AppContext';
import { useTheme } from './src/hooks/useTheme';
import {
  WelcomeScreen,
  LoginScreen,
  OnboardingScreen,
  DashboardScreen,
  ScannerScreen,
  ChatScreen,
  NotificationCenterScreen,
} from './src/screens';
import PremiumProfileScreen from './src/features/profile/screens/PremiumProfileScreen';
import MedicationsScreen from './src/screens/medications/MedicationsScreen';
import MedicationDetailScreen from './src/screens/medications/MedicationDetailScreen';
import AddMedicationScreen from './src/screens/medications/AddMedicationScreen';
import { spacing, radius, typography } from './src/theme';
import {
  setupNotificationCategories,
  addNotificationResponseListener,
  ACTION_TAKEN,
  ACTION_SNOOZE,
} from './src/services/NotificationService';

// ── Tema Toggle ──
function ThemePill() {
  const { colors, isDarkMode } = useTheme();
  const { toggleTheme } = useAppStore();
  const themeAnim = React.useRef(new Animated.Value(isDarkMode ? 1 : 0)).current;

  React.useEffect(() => {
    Animated.spring(themeAnim, {
      toValue: isDarkMode ? 1 : 0,
      useNativeDriver: true,
      tension: 60,
      friction: 8,
    }).start();
  }, [isDarkMode]);

  const translateX = themeAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 26] });

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={toggleTheme}
      style={[styles.themePill, { backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
    >
      <Animated.View
        style={[styles.themeIndicator, {
          backgroundColor: isDarkMode ? '#252C35' : '#FFFFFF',
          transform: [{ translateX }],
        }]}
      />
      <View style={styles.themeIconOverlay}>
        <View style={styles.themeIconWrapper}>
          <Feather name="sun" size={13} color={!isDarkMode ? '#FF9F0A' : '#94A3B8'} />
        </View>
        <View style={styles.themeIconWrapper}>
          <Feather name="moon" size={13} color={isDarkMode ? '#58A6FF' : '#94A3B8'} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ── Tab Bar Tanımları ──
const TABS = [
  { screen: 'DASHBOARD', icon: 'grid-outline', iconActive: 'grid', label: 'Panel' },
  { screen: 'MEDICATIONS', icon: 'medkit-outline', iconActive: 'medkit', label: 'İlaçlar' },
  { screen: 'SCANNER', icon: 'scan-outline', iconActive: 'scan', label: 'Tarama' },
  { screen: 'AI_CHAT', icon: 'chatbubble-ellipses-outline', iconActive: 'chatbubble-ellipses', label: 'AI' },
  { screen: 'PROFILE', icon: 'person-outline', iconActive: 'person', label: 'Profil' },
] as const;

// Auth & tam ekran olmayan ekranlar
const AUTH_SCREENS = ['WELCOME', 'LOGIN', 'ONBOARDING'];
const FULLSCREEN_SCREENS: string[] = [];
const HIDE_HEADER_SCREENS = [...AUTH_SCREENS, 'NOTIFICATION_CENTER'];
const HIDE_TAB_SCREENS = [...AUTH_SCREENS, 'NOTIFICATION_CENTER'];

// Ekmek kırıntısı başlıkları
const SCREEN_TITLES: Record<string, string> = {
  DASHBOARD: 'Panel',
  MEDICATIONS: 'İlaç Takibi',
  ADD_MEDICATION: 'İlaç Ekle',
  MEDICATION_DETAIL: 'İlaç Detayı',
  MEDICAL_HISTORY: 'Sağlık Geçmişi',
  ADD_HEALTH_RECORD: 'Kayıt Ekle',
  LAB_RESULTS: 'Laboratuvar',
  LAB_DETAIL: 'Tahlil Detayı',
  ADD_LAB_RESULT: 'Tahlil Ekle',
  APPOINTMENTS: 'Randevular',
  ADD_APPOINTMENT: 'Randevu Ekle',
  AI_CHAT: 'MedTech AI',
  SCANNER: 'Sağlık Veri Girişi',
  PROFILE: 'Profil',
};

function AppRouter() {
  const { colors, isDarkMode } = useTheme();
  const {
    currentScreen,
    setCurrentScreen,
    toastMessage,
    showToast,
    scanHistory,
    setScanHistory,
    markDose,
    unreadNotificationCount,
  } = useAppStore();

  const [selectedScanResult, setSelectedScanResult] = useState<any>(null);

  // Notification setup & response handler
  useEffect(() => {
    setupNotificationCategories();
    const sub = addNotificationResponseListener(response => {
      const action = response.actionIdentifier;
      const data = response.notification.request.content.data as any;
      if (action === ACTION_TAKEN && data?.doseId) {
        markDose(data.doseId, 'TAKEN');
        showToast(`${data.medicationName ?? 'İlaç'} alındı olarak işaretlendi.`);
      }
    });
    return () => sub.remove();
  }, []);

  const showHeader = !HIDE_HEADER_SCREENS.includes(currentScreen as any);
  const showTabs = !HIDE_TAB_SCREENS.includes(currentScreen as any);
  const isTabScreen = TABS.some(t => t.screen === currentScreen);
  const screenTitle = SCREEN_TITLES[currentScreen] ?? 'MedTech';

  const handleBack = () => {
    // Basit geri navigasyon
    if (currentScreen === 'MEDICATION_DETAIL') { setCurrentScreen('MEDICATIONS'); return; }
    if (currentScreen === 'ADD_MEDICATION') { setCurrentScreen('MEDICATIONS'); return; }
    if (currentScreen === 'ADD_HEALTH_RECORD') { setCurrentScreen('MEDICAL_HISTORY'); return; }
    if (currentScreen === 'LAB_DETAIL') { setCurrentScreen('LAB_RESULTS'); return; }
    if (currentScreen === 'ADD_LAB_RESULT') { setCurrentScreen('LAB_RESULTS'); return; }
    if (currentScreen === 'ADD_APPOINTMENT') { setCurrentScreen('APPOINTMENTS'); return; }
    setCurrentScreen('DASHBOARD');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={['top']}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />

      {/* Floating tema toggle - auth ekranları */}
      {AUTH_SCREENS.includes(currentScreen as any) && (
        <View style={styles.floatingThemeToggle}>
          <ThemePill />
        </View>
      )}

      {/* Header */}
      {showHeader && (
        <View style={[styles.headerBar, { borderBottomColor: colors.border }]}>
          {/* Sol: Geri butonu veya marka */}
          {isTabScreen ? (
            <Text style={[styles.headerBrand, { color: colors.textPrimary }]}>
              Med<Text style={{ color: colors.primary }}>Tech</Text>
            </Text>
          ) : (
            <TouchableOpacity
              style={[styles.backBtn, { backgroundColor: colors.surfaceSecondary }]}
              onPress={handleBack}
            >
              <Ionicons name="arrow-back" size={18} color={colors.textPrimary} />
            </TouchableOpacity>
          )}

          {/* Orta: başlık (tab olmayan ekranlarda) */}
          {!isTabScreen && (
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {screenTitle}
            </Text>
          )}

          {/* Sağ: tema toggle + bildirim */}
          <View style={styles.headerRight}>
            <ThemePill />
            {isTabScreen && (
              <TouchableOpacity
                style={[styles.headerProfileBtn, { backgroundColor: colors.surfaceSecondary }]}
                onPress={() => setCurrentScreen('NOTIFICATION_CENTER')}
              >
                <Feather name="bell" size={18} color={colors.textPrimary} />
                {unreadNotificationCount > 0 && (
                  <View style={{
                    position: 'absolute', top: -2, right: -4,
                    backgroundColor: colors.error, minWidth: 14, height: 14,
                    borderRadius: 7, alignItems: 'center', justifyContent: 'center',
                    paddingHorizontal: 3, borderWidth: 1.5, borderColor: colors.background
                  }}>
                    <Text style={{ color: '#FFF', fontSize: 8, fontWeight: 'bold' }}>
                      {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Ekran İçeriği */}
      <View style={styles.content}>
        {currentScreen === 'WELCOME' && (
          <WelcomeScreen
            isDarkMode={isDarkMode}
            onLogin={() => setCurrentScreen('LOGIN')}
            onRegister={() => setCurrentScreen('ONBOARDING')}
          />
        )}
        {currentScreen === 'LOGIN' && (
          <LoginScreen
            isDarkMode={isDarkMode}
            onLogin={() => setCurrentScreen('DASHBOARD')}
            onRegister={() => setCurrentScreen('ONBOARDING')}
            onBack={() => setCurrentScreen('WELCOME')}
          />
        )}
        {currentScreen === 'ONBOARDING' && (
          <OnboardingScreen
            isDarkMode={isDarkMode}
            onBack={() => setCurrentScreen('WELCOME')}
            onComplete={() => {
              showToast('Profiliniz başarıyla oluşturuldu!');
              setCurrentScreen('DASHBOARD');
            }}
          />
        )}

        {currentScreen === 'DASHBOARD' && <DashboardScreen />}
        {currentScreen === 'MEDICATIONS' && <MedicationsScreen />}
        {currentScreen === 'MEDICATION_DETAIL' && <MedicationDetailScreen />}
        {currentScreen === 'ADD_MEDICATION' && <AddMedicationScreen />}

        {currentScreen === 'AI_CHAT' && <ChatScreen />}
        {currentScreen === 'PROFILE' && <PremiumProfileScreen />}
        {currentScreen === 'SCANNER' && <ScannerScreen />}
        {currentScreen === 'NOTIFICATION_CENTER' && <NotificationCenterScreen />}

        {/* Faz 4-6'da eklenecek ekranlar için placeholder */}
        {(currentScreen === 'LAB_RESULTS' ||
          currentScreen === 'LAB_DETAIL' ||
          currentScreen === 'ADD_LAB_RESULT' ||
          currentScreen === 'ADD_HEALTH_RECORD' ||
          currentScreen === 'APPOINTMENTS' ||
          currentScreen === 'ADD_APPOINTMENT') && (
          <View style={styles.placeholder}>
            <Ionicons name="construct-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.placeholderTitle, { color: colors.textPrimary }]}>
              {SCREEN_TITLES[currentScreen]}
            </Text>
            <Text style={[styles.placeholderSub, { color: colors.textSecondary }]}>
              Bu ekran yakında eklenecek.
            </Text>
          </View>
        )}
      </View>

      {/* Tab Bar */}
      {showTabs && (
        <View style={[styles.tabBar, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
          {TABS.map(tab => {
            const isActive = currentScreen === tab.screen;
            return (
              <TouchableOpacity
                key={tab.screen}
                style={styles.tabItem}
                onPress={() => setCurrentScreen(tab.screen as any)}
              >
                <Ionicons
                  name={(isActive ? tab.iconActive : tab.icon) as any}
                  size={22}
                  color={isActive ? colors.primary : colors.textTertiary}
                />
                <Text style={[styles.tabLabel, { color: isActive ? colors.primary : colors.textTertiary }]}>
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Toast */}
      {toastMessage ? (
        <View style={[styles.toast, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{toastMessage}</Text>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <AppRouter />
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { flex: 1 },
  floatingThemeToggle: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.xl,
    zIndex: 999,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  headerBrand: {
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  headerTitle: {
    ...typography.button,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  } as any,
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  headerProfileBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themePill: {
    width: 60,
    height: 32,
    borderRadius: 16,
    padding: 3,
    position: 'relative',
    justifyContent: 'center',
    borderWidth: 1,
  },
  themeIndicator: {
    position: 'absolute',
    left: 3,
    top: 2,
    width: 26,
    height: 26,
    borderRadius: 13,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  themeIconOverlay: {
    position: 'absolute',
    left: 0, right: 0, top: 0, bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  themeIconWrapper: {
    width: 22, height: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    height: 72,
    borderTopWidth: 1,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    gap: 3,
  },
  tabLabel: {
    ...typography.labelSmall,
    fontSize: 10,
    fontWeight: '600',
  } as any,
  toast: {
    position: 'absolute',
    bottom: 88,
    left: spacing.xl,
    right: spacing.xl,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xxl,
  },
  placeholderTitle: {
    ...typography.h3,
    fontWeight: '700',
  } as any,
  placeholderSub: {
    ...typography.body,
    textAlign: 'center',
  } as any,
});
