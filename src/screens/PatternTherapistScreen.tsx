import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import LogoHeader from '../components/LogoHeader';
import { sendPatternTherapistMessage, ChatMessage } from '../config/patternTherapist';

const STARTER_PROMPTS = [
  'What patterns do you see in me?',
  "Where do I spend the most time?",
  'How does my week compare to usual?',
];

export default function PatternTherapistScreen({ navigation }: any) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: "Hey! I'm your Pattern Therapist — I can look at your actual visit history and talk through what it says about your routines. Ask me anything, or tap a suggestion below to get started.",
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [showPrivacyNote, setShowPrivacyNote] = useState(true);
  const apiHistoryRef = useRef<any[]>([]);
  const listRef = useRef<FlatList>(null);

  const send = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setMessages((prev) => [...prev, { role: 'user', text: trimmed }]);
    setInput('');
    setSending(true);
    setError('');

    try {
      const { replyText, apiHistory } = await sendPatternTherapistMessage(
        apiHistoryRef.current,
        trimmed,
        setStatus
      );
      apiHistoryRef.current = apiHistory;
      setMessages((prev) => [...prev, { role: 'assistant', text: replyText }]);
    } catch (e: any) {
      setError(e.message || "Something went wrong — mind trying that again?");
    } finally {
      setSending(false);
      setStatus('');
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <LogoHeader />

      <View style={styles.titleRow}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🧭 Pattern Therapist</Text>
      </View>

      {showPrivacyNote && (
        <View style={styles.privacyNote}>
          <Text style={styles.privacyNoteText} numberOfLines={2}>
            💡 Place patterns (not raw GPS) are sent to Claude to write replies.
          </Text>
          <TouchableOpacity onPress={() => setShowPrivacyNote(false)} hitSlop={8}>
            <Text style={styles.privacyNoteDismiss}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        ref={listRef}
        style={styles.messageListFlex}
        data={messages}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.role === 'user' ? styles.bubbleUser : styles.bubbleAssistant,
            ]}
          >
            <Text style={item.role === 'user' ? styles.bubbleTextUser : styles.bubbleTextAssistant}>
              {item.text}
            </Text>
          </View>
        )}
        ListFooterComponent={
          sending ? (
            <View style={[styles.bubble, styles.bubbleAssistant, styles.bubbleLoading]}>
              <ActivityIndicator size="small" color="#1a3a5c" />
              <Text style={styles.statusText}>{status || 'Thinking...'}</Text>
            </View>
          ) : messages.length === 1 ? (
            <View style={styles.starters}>
              {STARTER_PROMPTS.map((prompt) => (
                <TouchableOpacity key={prompt} style={styles.starterChip} onPress={() => send(prompt)}>
                  <Text style={styles.starterChipText}>{prompt}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null
        }
      />

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Ask about your patterns..."
          placeholderTextColor="#aaaaaa"
          multiline
          editable={!sending}
          onSubmitEditing={() => send(input)}
        />
        <TouchableOpacity
          style={[styles.sendButton, (sending || !input.trim()) && styles.sendButtonDisabled]}
          onPress={() => send(input)}
          disabled={sending || !input.trim()}
        >
          <Text style={styles.sendButtonText}>→</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  titleRow: {
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  backLink: {
    color: '#555570',
    fontSize: 15,
    marginBottom: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1a1a2e',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 24,
    marginBottom: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: '#f0f4f8',
    gap: 8,
  },
  privacyNoteText: {
    flex: 1,
    fontSize: 10,
    color: '#777788',
    lineHeight: 14,
  },
  privacyNoteDismiss: {
    fontSize: 12,
    color: '#999999',
    paddingHorizontal: 4,
  },
  messageListFlex: {
    flex: 1,
  },
  messageList: {
    paddingHorizontal: 24,
    paddingBottom: 12,
    flexGrow: 1,
  },
  bubble: {
    maxWidth: '85%',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
  },
  bubbleUser: {
    alignSelf: 'flex-end',
    backgroundColor: '#1a3a5c',
  },
  bubbleAssistant: {
    alignSelf: 'flex-start',
    backgroundColor: '#f0f4f8',
  },
  bubbleLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bubbleTextUser: {
    color: '#ffffff',
    fontSize: 15,
    lineHeight: 21,
  },
  bubbleTextAssistant: {
    color: '#1a1a2e',
    fontSize: 15,
    lineHeight: 21,
  },
  statusText: {
    color: '#555570',
    fontSize: 13,
    fontStyle: 'italic',
  },
  starters: {
    marginTop: 4,
    paddingBottom: 8,
    gap: 8,
  },
  starterChip: {
    borderWidth: 1,
    borderColor: '#dddddd',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  starterChipText: {
    color: '#1a3a5c',
    fontSize: 14,
  },
  errorText: {
    color: '#e94560',
    fontSize: 13,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 8,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#dddddd',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    maxHeight: 100,
    color: '#1a1a2e',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1a3a5c',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
});
