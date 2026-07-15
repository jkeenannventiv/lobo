import React from 'react';
import { Text as RNText } from 'react-native';
if (!(RNText as any).defaultProps) (RNText as any).defaultProps = {};
(RNText as any).defaultProps.allowFontScaling = false;
import { View, Image, Text, StyleSheet, Platform, StatusBar, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';

type Props = {
  refreshDue?: boolean;
};

export default function LogoHeader({ refreshDue = false }: Props) {
  const navigation = useNavigation<any>();

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={async () => {
        const { getSession } = await import('../config/storage');
        const session = await getSession();
        if (session) {
          navigation.navigate('Home');
        }
      }}>
        <Image
          source={require('../../assets/lobo_tmline_sm.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </TouchableOpacity>
      <View style={styles.rightIcons}>
        <TouchableOpacity
          style={[styles.refreshButton, refreshDue && styles.refreshButtonDue]}
          onPress={() => navigation.navigate('ExportGuide')}
        >
          <Text style={styles.refreshButtonIcon}>🔄</Text>
          {refreshDue && (
            <Text style={[styles.refreshButtonText, styles.refreshButtonTextDue]}>
              Refresh
            </Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('PatternTherapist')}>
          <Text style={styles.chatIcon}>💬</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.settingsIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingTop: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 8 : 50,
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: Platform.OS === 'android' ? (StatusBar.currentHeight || 24) + 120 : 170,
  },
  logo: {
    width: 140,
    height: 106,
    marginLeft: -10,
  },
  rightIcons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
  },
  settingsIcon: {
    fontSize: 22,
  },
  chatIcon: {
    fontSize: 20,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#f0f4f8',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  refreshButtonDue: {
    backgroundColor: '#fff3e0',
    borderColor: '#f5a623',
  },
  refreshButtonIcon: {
    fontSize: 14,
  },
  refreshButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555570',
  },
  refreshButtonTextDue: {
    color: '#f5a623',
  },
});