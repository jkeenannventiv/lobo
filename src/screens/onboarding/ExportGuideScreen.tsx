import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Linking,
  Platform,
} from 'react-native';
import LogoHeader from '../../components/LogoHeader';

const STEPS_ANDROID = [
  {
    number: '01',
    title: 'Open Settings',
    detail: 'Open the Settings app on your Android phone.',
  },
  {
    number: '02',
    title: 'Tap Location',
    detail: 'Scroll down and tap "Location".',
  },
  {
    number: '03',
    title: 'Tap Location Services',
    detail: 'Tap "Location Services" from the list.',
  },
  {
    number: '04',
    title: 'Tap Timeline',
    detail: 'Scroll down and tap "Timeline".',
  },
  {
    number: '05',
    title: 'Export Timeline Data',
    detail: 'Tap "Export Timeline data" and confirm when prompted. The file will be saved to your Downloads folder.',
  },
  {
    number: '06',
    title: 'Come Back to Lobo',
    detail: 'Once the export is complete, come back to this app and tap "I\'ve Downloaded My File" below.',
  },
];

const STEPS_IOS = [
  {
    number: '01',
    title: 'Open Google Maps',
    detail: 'Open the Google Maps app on your iPhone.',
  },
  {
    number: '02',
    title: 'Tap your profile picture',
    detail: 'Tap your profile photo or initial in the top right corner of the screen.',
  },
  {
    number: '03',
    title: 'Go to Settings',
    detail: 'Tap "Settings" from the menu that appears.',
  },
  {
    number: '04',
    title: 'Tap Location & Privacy',
    detail: 'Scroll down and tap "Location & Privacy".',
  },
  {
    number: '05',
    title: 'Export Timeline Data',
    detail: 'Tap "Export Timeline Data" and confirm when prompted.',
  },
  {
    number: '06',
    title: 'Save the File',
    detail: 'Choose "Save to Files" and save it somewhere easy to find, like your iCloud Drive or On My iPhone folder.',
  },
  {
    number: '07',
    title: 'Come Back to Lobo',
    detail: 'Once saved, come back to this app and tap "I\'ve Downloaded My File" below.',
  },
];

export default function ExportGuideScreen({ navigation }: any) {
  const [platform, setPlatform] = useState<'android' | 'ios'>('android');
  const [deepLinkFailed, setDeepLinkFailed] = useState(false);
  const steps = platform === 'android' ? STEPS_ANDROID : STEPS_IOS;

  const handleDeepLink = async () => {
    try {
      if (platform === 'android') {
        const supported = await Linking.canOpenURL('android.settings.LOCATION_SOURCE_SETTINGS');
        if (supported) {
          await Linking.openURL('android.settings.LOCATION_SOURCE_SETTINGS');
        } else {
          await Linking.openURL('app-settings:');
        }
      } else {
        await Linking.openURL('app-settings:');
      }
    } catch (e) {
      setDeepLinkFailed(true);
    }
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

        <Text style={styles.title}>Export Your{'\n'}Timeline Data</Text>
        <Text style={styles.subtitle}>
          Your Google Timeline data is stored on your device. Follow these
          steps to export it so Lobo can get to work.
        </Text>

        <View style={styles.toggle}>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              platform === 'android' && styles.toggleActive,
            ]}
            onPress={() => { setPlatform('android'); setDeepLinkFailed(false); }}
          >
            <Text style={[styles.toggleText, platform === 'android' && styles.toggleTextActive]}>
              Android
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleButton,
              platform === 'ios' && styles.toggleActive,
            ]}
            onPress={() => { setPlatform('ios'); setDeepLinkFailed(false); }}
          >
            <Text style={[styles.toggleText, platform === 'ios' && styles.toggleTextActive]}>
              iPhone
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.deepLinkButton} onPress={handleDeepLink}>
          <Text style={styles.deepLinkButtonText}>
            {platform === 'android' ? '⚙️ Open Settings' : '⚙️ Open Settings'}
          </Text>
        </TouchableOpacity>

        {deepLinkFailed && (
          <View style={styles.deepLinkFailed}>
            <Text style={styles.deepLinkFailedText}>
              Couldn't open automatically — please follow the manual steps below.
            </Text>
          </View>
        )}

        <Text style={styles.orDivider}>— or follow the steps manually —</Text>

        {steps.map((step, index) => (
          <View key={index} style={styles.stepCard}>
            <View style={styles.stepLeft}>
              <Text style={styles.stepNumber}>{step.number}</Text>
              {index < steps.length - 1 && (
                <View style={styles.stepLine} />
              )}
            </View>
            <View style={styles.stepRight}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.stepDetail}>{step.detail}</Text>
            </View>
          </View>
        ))}

        <View style={styles.tipCard}>
          <Text style={styles.tipTitle}>💡 Good to know</Text>
          <Text style={styles.tipText}>
            Your Timeline file can be large if you have years of location
            history. Make sure you have a stable wifi connection before
            exporting. The file never leaves your device until you
            choose to import it into Lobo.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.navigate('ExportSuccess')}
        >
          <Text style={styles.buttonText}>I've Downloaded My File</Text>
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
    marginBottom: 24,
    lineHeight: 24,
  },
  toggle: {
    flexDirection: 'row',
    backgroundColor: '#f0f4f8',
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
  },
  toggleButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: '#1a3a5c',
  },
  toggleText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#555570',
  },
  toggleTextActive: {
    color: '#ffffff',
  },
  deepLinkButton: {
    backgroundColor: '#e94560',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  deepLinkButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deepLinkFailed: {
    backgroundColor: '#fff8ee',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f5a623',
  },
  deepLinkFailedText: {
    fontSize: 13,
    color: '#555570',
    lineHeight: 20,
  },
  orDivider: {
    textAlign: 'center',
    color: '#aaaaaa',
    fontSize: 13,
    marginBottom: 24,
  },
  stepCard: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  stepLeft: {
    alignItems: 'center',
    marginRight: 16,
    width: 36,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: '#1a3a5c',
    width: 36,
    height: 36,
    borderRadius: 18,
    textAlign: 'center',
    lineHeight: 36,
    overflow: 'hidden',
  },
  stepLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#dddddd',
    marginTop: 4,
    marginBottom: 4,
    minHeight: 20,
  },
  stepRight: {
    flex: 1,
    paddingBottom: 24,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1a1a2e',
    marginBottom: 4,
    marginTop: 6,
  },
  stepDetail: {
    fontSize: 14,
    color: '#555570',
    lineHeight: 22,
  },
  tipCard: {
    backgroundColor: '#fff8ee',
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#f5a623',
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f5a623',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 14,
    color: '#555570',
    lineHeight: 22,
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
});