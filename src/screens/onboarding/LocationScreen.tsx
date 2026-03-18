import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import * as Location from 'expo-location';
import LogoHeader from '../../components/LogoHeader';

export default function LocationScreen({ navigation }: any) {
  const [error, setError] = useState('');

  const handleAllow = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        navigation.navigate('ExportGuide');
      } else {
        setError(
          'Location permission was denied. You can enable it later in your device settings.'
        );
      }
    } catch (e) {
      navigation.navigate('ExportGuide');
    }
  };

  const handleSkip = () => {
    navigation.navigate('ExportGuide');
  };

  return (
    <View style={styles.container}>
      <LogoHeader />
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity
          style={styles.back}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.icon}>📍</Text>

        <Text style={styles.title}>Allow Location Access</Text>
        <Text style={styles.subtitle}>
          Lobo uses your location to show your current position on the map
          and to help contextualize your movement history.
        </Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>What we use it for</Text>
          <Text style={styles.infoItem}>✓  Show your position on the map</Text>
          <Text style={styles.infoItem}>✓  Contextualize movement history</Text>
          <Text style={styles.infoItem}>✓  Improve place detection accuracy</Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>What we never do</Text>
          <Text style={styles.infoItem}>✗  Share your location with third parties</Text>
          <Text style={styles.infoItem}>✗  Track you in the background without consent</Text>
          <Text style={styles.infoItem}>✗  Sell precise location data</Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={styles.button} onPress={handleAllow}>
          <Text style={styles.buttonText}>Allow Location</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
          <Text style={styles.skipText}>Not Now</Text>
        </TouchableOpacity>
      </ScrollView>
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
    paddingBottom: 40,
  },
  back: {
    marginBottom: 24,
  },
  backText: {
    color: '#555570',
    fontSize: 16,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#555570',
    marginBottom: 24,
    lineHeight: 24,
  },
  infoCard: {
    backgroundColor: '#f0f4f8',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1a3a5c',
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  infoItem: {
    fontSize: 14,
    color: '#555570',
    marginBottom: 8,
    lineHeight: 20,
  },
  error: {
    color: '#e94560',
    fontSize: 13,
    marginTop: 12,
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#1a3a5c',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  skipButton: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dddddd',
  },
  skipText: {
    color: '#555570',
    fontSize: 16,
  },
});