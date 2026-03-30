import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import LogoHeader from '../../components/LogoHeader';

export default function PhoneScreen({ navigation }: any) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 10) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }
    setError('');
    setLoading(true);

    try {
      if (Platform.OS === 'web') {
        const { getAuth, signInWithPhoneNumber, RecaptchaVerifier } = await import('firebase/auth');
        const { default: app } = await import('../../config/firebase');
        const auth = getAuth(app);
        if (!(window as any).recaptchaVerifier) {
          (window as any).recaptchaVerifier = new RecaptchaVerifier(
            auth,
            'recaptcha-container',
            { size: 'invisible' }
          );
        }
        const confirmation = await signInWithPhoneNumber(
          auth,
          '+1' + cleaned,
          (window as any).recaptchaVerifier
        );
        navigation.navigate('Otp', { phone: '+1' + cleaned, confirmation });
      } else {
        // Native: use @react-native-firebase/auth
        const auth = (await import('@react-native-firebase/auth')).default;
        const confirmation = await auth().signInWithPhoneNumber('+1' + cleaned);
        navigation.navigate('Otp', { phone: '+1' + cleaned, confirmation });
      }
    } catch (e: any) {
      setError(e.message || 'Failed to send code. Please try again.');
      if (Platform.OS === 'web' && (window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.clear();
        (window as any).recaptchaVerifier = null;
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LogoHeader />
      <View style={styles.inner}>
        <Text style={styles.title}>Enter Your{'\n'}Phone Number</Text>
        <Text style={styles.subtitle}>
          We'll send you a one-time verification code.
        </Text>

        <View style={styles.inputRow}>
          <View style={styles.countryCode}>
            <Text style={styles.countryCodeText}>🇺🇸 +1</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="(555) 000-0000"
            placeholderTextColor="#aaaaaa"
            keyboardType="phone-pad"
            maxLength={14}
            value={phone}
            onChangeText={setPhone}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.disclaimer}>
          By continuing you agree to receive an SMS. Standard rates may apply.
        </Text>

        {Platform.OS === 'web' && <div id="recaptcha-container" />}
      </View>

      <TouchableOpacity
        style={[styles.button, (phone.length < 10 || loading) && styles.buttonDisabled]}
        onPress={handleContinue}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#ffffff" />
        ) : (
          <Text style={styles.buttonText}>Send Code</Text>
        )}
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  countryCode: {
    backgroundColor: '#f0f4f8',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#dddddd',
  },
  countryCodeText: {
    color: '#1a1a2e',
    fontSize: 16,
  },
  input: {
    flex: 1,
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