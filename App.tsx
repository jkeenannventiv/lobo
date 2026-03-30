import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import { Platform, View, StyleSheet } from 'react-native';
import AppNavigator from './src/navigation/AppNavigator';
import { initDatabase } from './src/config/database';

export default function App() {
  useEffect(() => {
    initDatabase();
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync('#ffffff');
      NavigationBar.setButtonStyleAsync('dark');
    }
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" backgroundColor="#ffffff" translucent={false} />
      <AppNavigator />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
});