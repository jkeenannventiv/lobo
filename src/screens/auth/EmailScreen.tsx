import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import LogoHeader from '../../components/LogoHeader';
import { saveSession } from '../../config/storage';
import { syncUserToSupabase } from '../../config/userService';

export default function EmailScreen({ navigation, route }: any) {
  const { phone } = route.params || {};
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const isValidEmail = (val: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);

  const handleContinue = async () => {
      if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }
    setError('');
    await saveSession(phone || '', email);
    syncUserToSupabase(phone || '', email).then(() => {
      }).catch((e: any) => {
      console.error('Supabase sync error:', e);
    });
    navigation.navigate('Consent');
  };

  const handleSkip = () => {
    saveSession(phone || '', '');
    navigation.navigate('Consent');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LogoHeader />
      <View style={styles.inner}>
        <Text style={styles.title}>Add Your{'\n'}Email Address</Text>
        <Text style={styles.subtitle}>
          Used for account recovery and administrative communications.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="you@example.com"
          placeholderTextColor="#aaaaaa"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity style={styles.button} onPress={handleContinue}>
          <Text style={styles.buttonText}>Continue</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Skip for now</Text>
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
  inner: {
    flex: 1,
    padding: 24,
    paddingTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 12,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 15,
    color: '#555570',
    marginBottom: 32,
  },
  input: {
    backgroundColor: '#f0f4f8',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#dddddd',
  },
  error: {
    color: '#e94560',
    fontSize: 13,
    marginTop: 8,
  },
  buttons: {
    padding: 24,
    gap: 12,
  },
  button: {
    backgroundColor: '#1a3a5c',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  skipButton: {
    padding: 12,
    alignItems: 'center',
  },
  skipText: {
    color: '#aaaaaa',
    fontSize: 15,
  },
});