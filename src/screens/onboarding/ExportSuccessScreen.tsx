import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import LogoHeader from '../../components/LogoHeader';

export default function ExportSuccessScreen({ navigation }: any) {
  const [picking, setPicking] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedFileUri, setSelectedFileUri] = useState<string | null>(null);
  const [error, setError] = useState('');

  const handleSelectFile = async () => {
    try {
      setPicking(true);
      setError('');

      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        setPicking(false);
        return;
      }

      const file = result.assets[0];

      if (!file.name.includes('.json')) {
        setError('Please select a JSON file. Your Timeline export should be named "location-history.json".');
        setPicking(false);
        return;
      }

      setSelectedFile(file.name);
      setSelectedFileUri(file.uri);
      setPicking(false);

    } catch (e) {
      setError('Something went wrong selecting the file. Please try again.');
      setPicking(false);
    }
  };

  const handleContinue = () => {
    navigation.navigate('Processing', {
      fileUri: selectedFileUri,
      fileName: selectedFile,
    });
  };

  return (
    <View style={styles.container}>
      <LogoHeader />
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity
          style={styles.backLink}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backLinkText}>← Back to export instructions</Text>
        </TouchableOpacity>

        <View style={styles.iconContainer}>
          <Text style={styles.icon}>✅</Text>
        </View>

        <Text style={styles.title}>File Downloaded!</Text>
        <Text style={styles.subtitle}>
          Great work. Now let's give Lobo access to your Timeline file.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Your data stays private</Text>
          <Text style={styles.cardText}>
            Your timeline file is processed on your device. Raw location
            data is never uploaded to our servers — only anonymized
            insights are used for comparisons.
          </Text>
        </View>

        {!selectedFile ? (
          <>
            <TouchableOpacity
              style={[styles.button, picking && styles.buttonDisabled]}
              onPress={handleSelectFile}
              disabled={picking}
            >
              {picking ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.buttonText}>Select My Timeline File</Text>
              )}
            </TouchableOpacity>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Text style={styles.hint}>
              Look for a file named "timeline.json" or "location-history.json" in your
              Downloads folder or Files app.
            </Text>
          </>
        ) : (
          <>
            <View style={styles.successCard}>
              <Text style={styles.successIcon}>📄</Text>
              <View style={styles.successText}>
                <Text style={styles.successTitle}>File Selected!</Text>
                <Text style={styles.successFile}>{selectedFile}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.button}
              onPress={handleContinue}
            >
              <Text style={styles.buttonText}>Continue to Dashboard →</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleSelectFile}
            >
              <Text style={styles.secondaryButtonText}>Choose a Different File</Text>
            </TouchableOpacity>
          </>
        )}
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
  backLink: {
    marginBottom: 24,
  },
  backLinkText: {
    color: '#555570',
    fontSize: 16,
  },
  iconContainer: {
    marginBottom: 24,
  },
  icon: {
    fontSize: 64,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: '#555570',
    marginBottom: 32,
    lineHeight: 24,
  },
  card: {
    backgroundColor: '#f0f4f8',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1a3a5c',
    letterSpacing: 1,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  cardText: {
    fontSize: 14,
    color: '#555570',
    lineHeight: 22,
  },
  button: {
    backgroundColor: '#1a3a5c',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
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
  error: {
    color: '#e94560',
    fontSize: 13,
    marginBottom: 12,
    lineHeight: 20,
  },
  hint: {
    fontSize: 13,
    color: '#aaaaaa',
    textAlign: 'center',
    lineHeight: 20,
    marginTop: 8,
  },
  successCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fff4',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#38a169',
    gap: 16,
  },
  successIcon: {
    fontSize: 32,
  },
  successText: {
    flex: 1,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#38a169',
    marginBottom: 4,
  },
  successFile: {
    fontSize: 13,
    color: '#555570',
  },
  secondaryButton: {
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dddddd',
  },
  secondaryButtonText: {
    color: '#555570',
    fontSize: 16,
  },
});