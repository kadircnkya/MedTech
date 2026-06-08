import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAppStore } from '../../store/AppContext';
import { useTheme } from '../../hooks/useTheme';
import { spacing, radius, typography } from '../../theme';

export default function ChatScreen() {
  const { colors } = useTheme();
  const { chatMessages, setChatMessages } = useAppStore();
  const [inputText, setInputText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  const sendMessage = () => {
    if (!inputText.trim()) return;

    const userMsg = {
      id: Math.random().toString(),
      sender: 'user' as const,
      text: inputText,
    };

    setChatMessages(prev => [...prev, userMsg]);
    setInputText('');

    // Simulate AI medical engine response
    setTimeout(() => {
      let aiText = "Bu konuda bir hekime danışmanız en doğrusudur. Ancak genel tıbbi bilgilere göre, belirttiğiniz durum/ilaç için düzenli kullanım ve doz kontrolü çok önemlidir.";
      
      const lower = inputText.toLowerCase();
      if (lower.includes('parol') || lower.includes('parasetamol')) {
        aiText = "Parol (Parasetamol), hafif-orta şiddetli ağrılar ve ateş için sıklıkla tercih edilir. Karaciğer sağlığınız için günlük 4 gram (8 tablet) limitini aşmamalısınız.";
      } else if (lower.includes('aspirin')) {
        aiText = "Aspirin, kan sulandırıcı etkisinden ötürü mide hassasiyetine veya aktif ülser durumlarında kanamalara yol açabilir. Mide koruyucu olmadan kullanırken dikkatli olunmalıdır.";
      } else if (lower.includes('alerji')) {
        aiText = "Sisteminizde kayıtlı alerji bilgileri doğrultusunda, parasetamol veya aspirin içerikli taranan ilaçlarda AI motorumuz sizi otomatik olarak uyaracaktır.";
      }

      setChatMessages(prev => [...prev, {
        id: Math.random().toString(),
        sender: 'ai' as const,
        text: aiText,
      }]);
    }, 1000);
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Mediflow AI Asistan</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Klinik düzeyde akıllı ilaç ve tahlil danışmanı
        </Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesList}
        contentContainerStyle={styles.scrollInner}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
      >
        {chatMessages.map(msg => {
          const isAi = msg.sender === 'ai';
          return (
            <View
              key={msg.id}
              style={[
                styles.messageBubble,
                isAi 
                  ? [styles.aiBubble, { backgroundColor: colors.surface, borderColor: colors.border }]
                  : [styles.userBubble, { backgroundColor: colors.primary }],
              ]}
            >
              <Text
                style={[
                  styles.messageText,
                  { color: isAi ? colors.textPrimary : '#FFFFFF' },
                ]}
              >
                {msg.text}
              </Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Input controls */}
      <View style={[styles.inputRow, { borderTopColor: colors.border, backgroundColor: colors.surface }]}>
        <TextInput
          style={[styles.input, { color: colors.textPrimary, backgroundColor: colors.surfaceSecondary, borderColor: colors.border }]}
          placeholder="İlaç etkileşimleri veya tahlillerinizi sorun..."
          placeholderTextColor={colors.textTertiary}
          value={inputText}
          onChangeText={setInputText}
        />
        <TouchableOpacity style={[styles.sendBtn, { backgroundColor: colors.primary }]} onPress={sendMessage}>
          <Text style={styles.sendBtnText}>Gönder</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: spacing.lg,
    borderBottomWidth: 1,
  },
  title: {
    ...typography.h3,
    fontWeight: '800',
  },
  subtitle: {
    ...typography.caption,
    marginTop: 2,
  },
  messagesList: {
    flex: 1,
  },
  scrollInner: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  messageBubble: {
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    maxWidth: '85%',
  },
  aiBubble: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderBottomLeftRadius: 4,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 4,
  },
  messageText: {
    ...typography.body,
    lineHeight: 22,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    height: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.xl,
    ...typography.body,
    marginRight: spacing.sm,
  },
  sendBtn: {
    height: 48,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText: {
    color: '#FFFFFF',
    ...typography.buttonSmall,
    fontWeight: '700',
  },
});
