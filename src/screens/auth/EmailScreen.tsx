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

export default function EmailScreen({ navigation }: any) {
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
    await saveSession('', email);
    navigation.navigate('Location');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LogoHeader />
      <View style={styles.inner}>
        <TouchableOpacity
          style={styles.back}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Backup{'\n'}Login</Text>
        <Text style={styles.subtitle}>
          Add an email address so you can recover your account
          if you change your phone number.
        </Text>

        <TextInput
          style={styles.input}
          placeholder="your@email.com"
          placeholderTextColor="#aaaaaa"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          value={email}
          onChangeText={setEmail}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.disclaimer}>
          Your email is only used for account recovery. We will never
          send you marketing emails without your permission.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.button, !isValidEmail(email) && styles.buttonDisabled]}
        onPress={handleContinue}
      >
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
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
  back: {
    marginBottom: 24,
  },
  backText: {
    color: '#555570',
    fontSize: 16,
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
    lineHeight: 24,
  },
  input: {
    backgroundColor: '#f0f4f8',
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    color: '#1a1a2e',
    borderWidth: 1,
    borderColor: '#dddddd',
    marginBottom: 12,
  },
  error: {
    color: '#e94560',
    fontSize: 13,
    marginBottom: 12,
  },
  disclaimer: {
    fontSize: 12,
    color: '#aaaaaa',
    marginTop: 16,
    lineHeight: 18,
  },
  button: {
    backgroundColor: '#1a3a5c',
    margin: 24,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
});