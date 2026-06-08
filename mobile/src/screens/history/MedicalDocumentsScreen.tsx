import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';
import { apiClient } from '../../services/api';
import * as DocumentPicker from 'expo-document-picker';
import { useAppStore } from '../../store/AppContext';

export default function MedicalDocumentsScreen() {
  const { colors } = useTheme();
  const { showToast } = useAppStore();
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/v1/patients/documents');
      if (res.data?.data) {
        setDocuments(res.data.data);
      }
    } catch (err) {
      console.warn('Failed to fetch documents', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;
      const file = result.assets[0];

      setUploading(true);
      const formData = new FormData();
      formData.append('file', {
        uri: file.uri,
        name: file.name,
        type: file.mimeType || 'application/pdf',
      } as any);
      formData.append('title', file.name);
      formData.append('documentType', 'pdf');

      await apiClient.post('/api/v1/patients/documents', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      showToast('Belge başarıyla yüklendi.');
      fetchDocuments();
    } catch (err) {
      console.error('Upload error', err);
      showToast('Belge yüklenirken hata oluştu.');
    } finally {
      setUploading(false);
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case 'pdf': return 'document-text';
      case 'mr': return 'scan';
      case 'xray': return 'body';
      case 'lab_result': return 'flask';
      default: return 'document';
    }
  };

  const renderItem = ({ item }: { item: any }) => (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.iconBox, { backgroundColor: colors.primaryLight }]}>
        <Ionicons name={getIconForType(item.documentType)} size={24} color={colors.primary} />
      </View>
      <View style={styles.info}>
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>{item.title}</Text>
        <Text style={[styles.date, { color: colors.textSecondary }]}>
          {new Date(item.createdAt).toLocaleDateString('tr-TR')} · {(item.sizeBytes / 1024 / 1024).toFixed(2)} MB
        </Text>
      </View>
      <TouchableOpacity style={[styles.downloadBtn, { backgroundColor: colors.primary }]} activeOpacity={0.8}>
        <Ionicons name="cloud-download-outline" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Tıbbi Belgeler</Text>
        <TouchableOpacity
          style={[styles.uploadBtn, { backgroundColor: colors.primary }]}
          onPress={handleUpload}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : documents.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="document-text-outline" size={48} color={colors.textTertiary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Henüz belge yüklenmemiş.</Text>
        </View>
      ) : (
        <FlatList
          data={documents}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.xl,
    paddingTop: spacing.xxl,
  },
  headerTitle: { ...typography.h2, fontWeight: '700' } as any,
  uploadBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: { padding: spacing.xl, paddingBottom: 100 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: { flex: 1 },
  title: { ...typography.button, fontWeight: '700' } as any,
  date: { ...typography.caption, marginTop: 4 } as any,
  downloadBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  emptyText: { ...typography.body, textAlign: 'center' } as any,
});
