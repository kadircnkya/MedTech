import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useTheme } from '../../../hooks/useTheme';
import { spacing, radius, typography } from '../../../theme';
import { useAppStore } from '../../../store/AppContext';

export default function PremiumProfileScreen() {
  const { colors, isDarkMode } = useTheme();
  const { user, healthRecords, labResults, toggleTheme } = useAppStore();

  const [activeSection, setActiveSection] = useState<'ARCHIVE' | 'SETTINGS'>('ARCHIVE');

  // Completed treatments count
  const completedMedsCount = 2; // Simulated legacy treatments

  const handleLogout = () => {
    Alert.alert(
      "Güvenli Çıkış",
      "MedTech dijital sağlık kimliğinizden güvenli çıkış yapmak istediğinize emin misiniz?",
      [
        { text: "Vazgeç", style: "cancel" },
        { text: "Güvenli Çıkış Yap", style: "destructive", onPress: () => Alert.alert("Çıkış Yapıldı", "Oturum başarıyla sonlandırıldı.") }
      ]
    );
  };

  const handleDocumentOpen = (title: string) => {
    Alert.alert('Belge Açılıyor', `"${title}" adlı belge güvenli sunucumuzdan indiriliyor...`);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Tab Selectors inside Profile */}
      <View style={[styles.profileTabBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.profileTab, activeSection === 'ARCHIVE' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveSection('ARCHIVE')}
        >
          <Ionicons name="folder-open-outline" size={16} color={activeSection === 'ARCHIVE' ? colors.primary : colors.textTertiary} />
          <Text style={[styles.profileTabLabel, { color: activeSection === 'ARCHIVE' ? colors.primary : colors.textTertiary, fontWeight: activeSection === 'ARCHIVE' ? '700' : '500' }]}>
            Sağlık Arşivi
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.profileTab, activeSection === 'SETTINGS' && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          onPress={() => setActiveSection('SETTINGS')}
        >
          <Ionicons name="settings-outline" size={16} color={activeSection === 'SETTINGS' ? colors.primary : colors.textTertiary} />
          <Text style={[styles.profileTabLabel, { color: activeSection === 'SETTINGS' ? colors.primary : colors.textTertiary, fontWeight: activeSection === 'SETTINGS' ? '700' : '500' }]}>
            Ayarlar
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollInner}>
        
        {activeSection === 'ARCHIVE' ? (
          <View style={{ gap: spacing.xl }}>
            {/* 1. e-Nabiz Style ID Card */}
            <View style={styles.healthCardContainer}>
              <LinearGradient
                colors={isDarkMode ? ['#121824', '#1A2333'] : ['#0F172A', '#1E293B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientCard}
              >
                <View style={styles.idHeaderRow}>
                  <View style={styles.idBadgeLogo}>
                    <Ionicons name="shield-checkmark" size={15} color="#3B82F6" />
                    <Text style={styles.idLogoText}>SAĞLIK HAFIZASI ID</Text>
                  </View>
                  <Text style={styles.idStatus}>GÜVENLİ</Text>
                </View>

                <View style={styles.userMainRow}>
                  <View style={[styles.avatarBox, { backgroundColor: isDarkMode ? '#1E293B' : '#334155' }]}>
                    <Text style={styles.avatarText}>{user.firstName[0]}{user.lastName[0]}</Text>
                  </View>
                  <View style={styles.userInfoCol}>
                    <Text style={styles.userName}>{user.firstName} {user.lastName}</Text>
                    <Text style={styles.userMeta}>TC: 198*****482 • {user.age} Yaş</Text>
                  </View>
                </View>

                <View style={styles.idStatsRow}>
                  <View style={styles.idStatBox}>
                    <Text style={styles.idStatLabel}>KAN GRUBU</Text>
                    <Text style={styles.idStatVal}>{user.bloodType}</Text>
                  </View>
                  <View style={styles.idStatBox}>
                    <Text style={styles.idStatLabel}>ACİL KİŞİ</Text>
                    <Text style={styles.idStatVal} numberOfLines={1}>{user.emergencyContact}</Text>
                  </View>
                  <View style={styles.idStatBox}>
                    <Text style={styles.idStatLabel}>BOY / KİLO</Text>
                    <Text style={styles.idStatVal}>{user.height}cm / {user.weight}kg</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {/* 2. Hastalık Geçmişi */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="medical" size={18} color={colors.primary} />
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Hastalık Geçmişi</Text>
              </View>
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {user.diseases.map((d, index) => (
                  <View key={d} style={[styles.itemRow, index === user.diseases.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={styles.itemLeft}>
                      <View style={[styles.bullet, { backgroundColor: colors.primary }]} />
                      <Text style={[styles.itemText, { color: colors.textPrimary }]}>{d}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: `${colors.primary}1A` }]}>
                      <Text style={[styles.statusText, { color: colors.primary }]}>Kronik</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* 3. Alerjiler */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="warning" size={18} color="#FF9F0A" />
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Alerjiler</Text>
              </View>
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {user.allergies.map((a, index) => (
                  <View key={a} style={[styles.itemRow, index === user.allergies.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={styles.itemLeft}>
                      <View style={[styles.bullet, { backgroundColor: '#FF9F0A' }]} />
                      <Text style={[styles.itemText, { color: colors.textPrimary }]}>{a}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: '#FF9F0A1A' }]}>
                      <Text style={[styles.statusText, { color: '#FF9F0A' }]}>Orta Risk</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* 4. Ameliyat Geçmişi */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="git-commit-outline" size={18} color="#BF5AF2" />
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Ameliyatlar & Operasyonlar</Text>
              </View>
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {user.operations.map((o, index) => (
                  <View key={o} style={[styles.itemRow, index === user.operations.length - 1 && { borderBottomWidth: 0 }]}>
                    <View style={styles.itemLeft}>
                      <Ionicons name="checkmark-circle-outline" size={16} color="#BF5AF2" />
                      <Text style={[styles.itemText, { color: colors.textPrimary }]}>{o}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* 5. Tahlil Geçmişi (Chronological Lab Results) */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="pulse" size={18} color="#34C759" />
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Tahlil Geçmişi</Text>
              </View>
              <View style={{ gap: spacing.md }}>
                {labResults.map(lab => (
                  <View key={lab.id} style={[styles.labCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                    <View style={styles.labCardHeader}>
                      <View>
                        <Text style={[styles.labTitle, { color: colors.textPrimary }]}>{lab.title}</Text>
                        <Text style={[styles.labMeta, { color: colors.textTertiary }]}>{lab.laboratory} · {lab.date}</Text>
                      </View>
                      <View style={[styles.statusBadge, { backgroundColor: lab.status === 'ATTENTION' ? '#FF9F0A1A' : '#34C7591A' }]}>
                        <Text style={[styles.statusText, { color: lab.status === 'ATTENTION' ? '#FF9F0A' : '#34C759' }]}>
                          {lab.status === 'ATTENTION' ? 'Takip Gerekli' : 'Normal'}
                        </Text>
                      </View>
                    </View>
                    {/* Compact values lists */}
                    <View style={styles.labValRow}>
                      {lab.values.slice(0, 3).map(v => (
                        <View key={v.testName} style={[styles.labValChip, { backgroundColor: colors.surfaceSecondary }]}>
                          <Text style={[styles.labValLabel, { color: colors.textSecondary }]}>{v.testName}: </Text>
                          <Text style={[styles.labValFig, { color: v.status === 'NORMAL' ? colors.textPrimary : colors.warning }]}>{v.value}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            </View>

            {/* 6. Belgeler (Raw Scans & PDFs) */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="document-attach-outline" size={18} color={colors.textSecondary} />
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Tıbbi Belgeler & Scans</Text>
              </View>
              <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                {[
                  { title: 'Epikriz Raporu_DrFatma.pdf', size: '1.2 MB', date: '2026-05-28' },
                  { title: 'Akciger_Grafisi_SaglikKurulu.png', size: '3.4 MB', date: '2026-02-14' },
                ].map((doc, idx) => (
                  <TouchableOpacity
                    key={doc.title}
                    style={[styles.docRow, idx === 1 && { borderBottomWidth: 0 }]}
                    onPress={() => handleDocumentOpen(doc.title)}
                  >
                    <Ionicons name={doc.title.endsWith('pdf') ? 'document-outline' : 'image-outline'} size={20} color={colors.primary} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.docTitle, { color: colors.textPrimary }]} numberOfLines={1}>{doc.title}</Text>
                      <Text style={[styles.docMeta, { color: colors.textTertiary }]}>{doc.date} · {doc.size}</Text>
                    </View>
                    <Feather name="download" size={16} color={colors.textSecondary} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        ) : (
          /* Application Settings Tab */
          <View style={{ gap: spacing.lg }}>
            <View style={[styles.settingsGroupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.settingsGroupTitle, { color: colors.textTertiary }]}>Görünüm & Tema</Text>
              <TouchableOpacity style={styles.settingItem} onPress={toggleTheme}>
                <View style={styles.settingLeft}>
                  <Ionicons name="moon-outline" size={20} color={colors.primary} />
                  <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Karanlık Mod</Text>
                </View>
                <Ionicons name={isDarkMode ? 'checkbox' : 'square-outline'} size={20} color={colors.primary} />
              </TouchableOpacity>
            </View>

            <View style={[styles.settingsGroupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.settingsGroupTitle, { color: colors.textTertiary }]}>Güvenlik & Gizlilik</Text>
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Ionicons name="lock-closed-outline" size={20} color="#34C759" />
                  <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>Uçtan Uca Şifreleme</Text>
                </View>
                <Text style={{ color: '#34C759', fontSize: 11, fontWeight: '700' }}>AKTİF</Text>
              </View>
              <View style={styles.settingItem}>
                <View style={styles.settingLeft}>
                  <Ionicons name="server-outline" size={20} color="#BF5AF2" />
                  <Text style={[styles.settingLabel, { color: colors.textPrimary }]}>HIPAA Uyumluluk Kaydı</Text>
                </View>
                <Text style={{ color: '#BF5AF2', fontSize: 11, fontWeight: '700' }}>DOĞRULANDI</Text>
              </View>
            </View>

            <View style={[styles.settingsGroupCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.settingsGroupTitle, { color: colors.textTertiary }]}>Hesap Yönetimi</Text>
              <TouchableOpacity style={styles.settingItem} onPress={handleLogout}>
                <View style={styles.settingLeft}>
                  <Ionicons name="log-out-outline" size={20} color="#EF4444" />
                  <Text style={[styles.settingLabel, { color: '#EF4444', fontWeight: '700' }]}>Medikal Oturumu Kapat</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileTabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  profileTab: { flex: 1, alignItems: 'center', paddingVertical: spacing.md, gap: 5, flexDirection: 'row', justifyContent: 'center' },
  profileTabLabel: { fontSize: 12 },
  scrollInner: { padding: spacing.xl, paddingBottom: 110 },
  
  // ID card style e-Nabiz
  healthCardContainer: { borderRadius: radius.xxl, overflow: 'hidden', elevation: 3 },
  gradientCard: { padding: spacing.xl, borderRadius: radius.xxl },
  idHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 0.5, borderBottomColor: 'rgba(255, 255, 255, 0.15)', paddingBottom: spacing.md },
  idBadgeLogo: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  idLogoText: { color: '#3B82F6', fontSize: 10, fontWeight: '900', letterSpacing: 0.8 },
  idStatus: { color: '#22C55E', fontSize: 9, fontWeight: '800' },
  userMainRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.lg },
  avatarBox: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  avatarText: { color: '#FFF', fontSize: 15, fontWeight: '800' },
  userInfoCol: { justifyContent: 'center' },
  userName: { color: '#FFF', fontSize: 16, fontWeight: '800' },
  userMeta: { color: 'rgba(255, 255, 255, 0.6)', fontSize: 10, marginTop: 2 },
  idStatsRow: { flexDirection: 'row', marginTop: spacing.lg, gap: spacing.sm },
  idStatBox: { flex: 1, backgroundColor: 'rgba(255, 255, 255, 0.05)', borderRadius: radius.md, padding: spacing.md },
  idStatLabel: { color: 'rgba(255, 255, 255, 0.4)', fontSize: 7, fontWeight: '700' },
  idStatVal: { color: '#FFF', fontSize: 10, fontWeight: '800', marginTop: 3 },

  // Sections
  section: { gap: spacing.sm },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingLeft: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '700' },
  card: { borderRadius: radius.xl, borderWidth: 1, paddingHorizontal: spacing.lg, overflow: 'hidden' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.06)' },
  itemLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  bullet: { width: 6, height: 6, borderRadius: 3 },
  itemText: { fontSize: 12, fontWeight: '600' },
  statusBadge: { paddingVertical: 2, paddingHorizontal: 8, borderRadius: radius.pill },
  statusText: { fontSize: 9, fontWeight: '700' },

  // Lab list timeline style
  labCard: { borderRadius: radius.xl, borderWidth: 1, padding: spacing.lg, gap: spacing.md },
  labCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  labTitle: { fontSize: 13, fontWeight: '700' },
  labMeta: { fontSize: 10, marginTop: 2 },
  labValRow: { flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' },
  labValChip: { flexDirection: 'row', paddingVertical: 3, paddingHorizontal: 8, borderRadius: radius.pill },
  labValLabel: { fontSize: 10, fontWeight: '500' },
  labValFig: { fontSize: 10, fontWeight: '700' },

  // Doc row attachment list
  docRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.lg, borderBottomWidth: 0.5, borderBottomColor: 'rgba(0,0,0,0.06)' },
  docTitle: { fontSize: 12, fontWeight: '700' },
  docMeta: { fontSize: 9, marginTop: 2 },

  // Settings
  settingsGroupCard: { borderRadius: radius.xl, borderWidth: 1, padding: spacing.lg, gap: spacing.md },
  settingsGroupTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 2 },
  settingItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2 },
  settingLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  settingLabel: { fontSize: 12, fontWeight: '600' },
});
