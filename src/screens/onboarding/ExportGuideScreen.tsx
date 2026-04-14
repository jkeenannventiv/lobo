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
  { number: '01', title: 'Open Settings', detail: 'Open the Settings app on your Android phone.' },
  { number: '02', title: 'Tap Location', detail: 'Scroll down and tap "Location".' },
  { number: '03', title: 'Tap Location Services', detail: 'Tap "Location Services" from the list.' },
  { number: '04', title: 'Tap Timeline', detail: 'Scroll down and tap "Timeline".' },
  { number: '05', title: 'Export Timeline Data', detail: 'Tap "Export Timeline data" and confirm when prompted. The file will be saved to your Downloads folder.' },
  { number: '06', title: 'Come Back to Lobo', detail: 'Once the export is complete, come back to this app and tap "I\'ve Downloaded My File" below.' },
];

const STEPS_IOS = [
  { number: '01', title: 'Open Google Maps', detail: 'Open the Google Maps app on your iPhone.' },
  { number: '02', title: 'Tap your profile picture', detail: 'Tap your profile photo or initial in the top right corner of the screen.' },
  { number: '03', title: 'Go to Settings', detail: 'Tap "Settings" from the menu that appears.' },
  { number: '04', title: 'Tap Location & Privacy', detail: 'Scroll down and tap "Location & Privacy".' },
  { number: '05', title: 'Export Timeline Data', detail: 'Tap "Export Timeline Data" and confirm when prompted.' },
  { number: '06', title: 'Save the File', detail: 'Choose "Save to Files" and save it somewhere easy to find, like your iCloud Drive or On My iPhone folder.' },
  { number: '07', title: 'Come Back to Lobo', detail: 'Once saved, come back to this app and tap "I\'ve Downloaded My File" below.' },
];

export default function ExportGuideScreen({ navigation }: any) {
  const [deepLinkFailed, setDeepLinkFailed] = useState(false);
  const isIOS = Platform.OS === 'ios';
  const steps = isIOS ? STEPS_IOS : STEPS_ANDROID;

  const handleDeepLink = async () => {
    try {
      if (isIOS) {
        const googleMapsApp = 'comgooglemaps://';
        const mapsTimeline = 'https://www.google.com/maps/timeline';
        const mapsInstalled = await Linking.canOpenURL(googleMapsApp);
        if (mapsInstalled) {
          await Linking.openURL(googleMapsApp);
        } else {
          await Linking.openURL(mapsTimeline);
        }
      } else {
        await Linking.openURL('https://www.google.com/maps/timeline');
      }
    } catch (e) {
      setDeepLinkFailed(true);
    }
  };

  return (
    <View style={styles.container}>
      <LogoHeader />
      <ScrollView contentContainerStyle={styles.scroll}>
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.title}>Export Your{'\n'}Timeline Data</Text>
        <Text style={styles.subtitle}>
          Your Google Timeline data is stored on your device. Follow these
          steps to export it so Lobo can get to work.
        </Text>

        {isIOS ? (
          <TouchableOpacity style={styles.deepLinkButton} onPress={handleDeepLink}>
            <Text style={styles.deepLinkButtonText}>🗺️ Open Google Maps</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.androidTip}>
            <Text style={styles.androidTipText}>
              📱 On Android, export lives in device settings — not in the Google Maps app. Follow the steps below.
            </Text>
          </View>
        )}

        {deepLinkFailed && (
          <View style={styles.deepLinkFailed}>
            <Text style={styles.deepLinkFailedText}>
              Couldn't open Google Maps automatically — please follow the manual steps below.
            </Text>
          </View>
        )}

        <Text style={styles.orDivider}>
          {isIOS ? '— then follow these steps —' : '— follow these steps —'}
        </Text>

        {steps.map((step, index) => (
          <View key={index} style={styles.stepCard}>
            <View style={styles.stepLeft}>
              <Text style={styles.stepNumber}>{step.number}</Text>
              {index < steps.length - 1 && <View style={styles.stepLine} />}
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
            Your Timeline file can be large if you have years of location history. Make sure you have a stable wifi connection before exporting. The file never leaves your device until you choose to import it into Lobo.
          </Text>
          <Text style={[styles.tipText, { marginTop: 8 }]}>
            For the best experience, export and refresh weekly — Lobo will show you a summary of your last 7 days each time you import.
          </Text>
        </View>

        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('ExportSuccess')}>
          <Text style={styles.buttonText}>I've Downloaded My File</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#ffffff' },
  scroll: { padding: 24, paddingTop: 16, paddingBottom: 40 },
  back: { marginBottom: 24 },
  backText: { color: '#555570', fontSize: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 12, lineHeight: 36 },
  subtitle: { fontSize: 15, color: '#555570', marginBottom: 24, lineHeight: 24 },
  deepLinkButton: { backgroundColor: '#e94560', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 12 },
  deepLinkButtonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  androidTip: { backgroundColor: '#f0f4f8', borderRadius: 12, padding: 14, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#1a3a5c' },
  androidTipText: { fontSize: 14, color: '#555570', lineHeight: 21 },
  deepLinkFailed: { backgroundColor: '#fff8ee', borderRadius: 12, padding: 14, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#f5a623' },
  deepLinkFailedText: { fontSize: 13, color: '#555570', lineHeight: 20 },
  orDivider: { textAlign: 'center', color: '#aaaaaa', fontSize: 13, marginBottom: 24 },
  stepCard: { flexDirection: 'row', marginBottom: 8 },
  stepLeft: { alignItems: 'center', marginRight: 16, width: 36 },
  stepNumber: { fontSize: 12, fontWeight: 'bold', color: '#ffffff', backgroundColor: '#1a3a5c', width: 36, height: 36, borderRadius: 18, textAlign: 'center', lineHeight: 36, overflow: 'hidden' },
  stepLine: { width: 2, flex: 1, backgroundColor: '#dddddd', marginTop: 4, marginBottom: 4, minHeight: 20 },
  stepRight: { flex: 1, paddingBottom: 24 },
  stepTitle: { fontSize: 16, fontWeight: 'bold', color: '#1a1a2e', marginBottom: 4, marginTop: 6 },
  stepDetail: { fontSize: 14, color: '#555570', lineHeight: 22 },
  tipCard: { backgroundColor: '#fff8ee', borderRadius: 16, padding: 20, marginTop: 8, marginBottom: 24, borderLeftWidth: 4, borderLeftColor: '#f5a623' },
  tipTitle: { fontSize: 14, fontWeight: 'bold', color: '#f5a623', marginBottom: 8 },
  tipText: { fontSize: 14, color: '#555570', lineHeight: 22 },
  button: { backgroundColor: '#1a3a5c', padding: 18, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1 },
});
