import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import LogoHeader from '../../components/LogoHeader';

export default function HowItWorksScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <LogoHeader />
      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>How Lobo Works</Text>
        <Text style={styles.subtitle}>Your location history, finally useful.</Text>

        <View style={styles.card}>
          <Text style={styles.step}>01</Text>
          <Text style={styles.stepTitle}>Export Your Timeline</Text>
          <Text style={styles.stepText}>
            Download your Google Timeline data directly from your device.
            It stays on your phone — we guide you through every step.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.step}>02</Text>
          <Text style={styles.stepTitle}>Lobo Processes It</Text>
          <Text style={styles.stepText}>
            Lobo reads your timeline file and builds a picture of your habits —
            places you visit, how often, and when.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.step}>03</Text>
          <Text style={styles.stepTitle}>Explore Your Data</Text>
          <Text style={styles.stepText}>
            See charts and insights about your lifestyle. Compare anonymously
            with others. Refresh monthly to keep it current.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.step}>04</Text>
          <Text style={styles.stepTitle}>Get Paid (Coming Soon)</Text>
          <Text style={styles.stepText}>
            Opt in to let advertisers include you in anonymous audience
            selections — and earn for your data.
          </Text>
        </View>
      </ScrollView>

      <TouchableOpacity
        style={styles.button}
        onPress={() => navigation.navigate('Phone')}
      >
        <Text style={styles.buttonText}>Get Started</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  scroll: {
    padding: 24,
    paddingTop: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#555570',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#f0f4f8',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#e94560',
  },
  step: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#e94560',
    letterSpacing: 2,
    marginBottom: 6,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 8,
  },
  stepText: {
    fontSize: 14,
    color: '#555570',
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#1a3a5c',
    margin: 24,
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
});