import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import LogoHeader from '../../components/LogoHeader';

const FEATURES = [
  {
    emoji: '📥',
    title: 'Import your Google Timeline',
    desc: 'Your location history stays on your device — we never upload your raw data.',
  },
  {
    emoji: '📍',
    title: 'Discover your habits and places',
    desc: 'See your most visited places, favorite categories, and behavioral patterns.',
  },
  {
    emoji: '📊',
    title: 'See how you really spend your time',
    desc: 'Charts and stats break down your movement history in ways you\'ve never seen.',
  },
  {
    emoji: '🔒',
    title: 'Your location data never leaves your device',
    desc: 'All insights are computed locally. Only anonymous behavioral flags can optionally be shared.',
  },
  {
    emoji: '🔄',
    title: 'Refresh data regularly to keep insights current',
    desc: 'Export a new Timeline file from Google Maps weekly or monthly and re-import to stay up to date.',
  },
];

export default function HowItWorksScreen({ navigation }: any) {
  return (
    <View style={styles.container}>
      <LogoHeader />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <Text style={styles.headline}>Visualize Your Timeline</Text>
        <Text style={styles.subheadline}>
          Transform your Google location history into personal insights about how you live, move, and spend your time.
        </Text>

        <View style={styles.features}>
          {FEATURES.map((f, idx) => (
            <View key={idx} style={styles.featureRow}>
              <Text style={styles.featureEmoji}>{f.emoji}</Text>
              <View style={styles.featureText}>
                <Text style={styles.featureTitle}>{f.title}</Text>
                <Text style={styles.featureDesc}>{f.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('Phone')}
        >
          <Text style={styles.buttonText}>Get Started →</Text>
        </TouchableOpacity>

        <Text style={styles.footer}>
          Free to use. No credit card required.
        </Text>

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
    paddingTop: 8,
    paddingBottom: 48,
  },
  headline: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 12,
    lineHeight: 38,
  },
  subheadline: {
    fontSize: 15,
    color: '#555570',
    lineHeight: 23,
    marginBottom: 32,
  },
  features: {
    gap: 20,
    marginBottom: 36,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  featureEmoji: {
    fontSize: 26,
    width: 36,
    marginTop: 1,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a2e',
    marginBottom: 3,
  },
  featureDesc: {
    fontSize: 13,
    color: '#555570',
    lineHeight: 20,
  },
  button: {
    backgroundColor: '#1a3a5c',
    padding: 18,
    borderRadius: 14,
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  footer: {
    fontSize: 12,
    color: '#aaaaaa',
    textAlign: 'center',
  },
});
