import React from 'react';
import { View, Image, StyleSheet } from 'react-native';

export default function LogoHeader() {
  return (
    <View style={styles.container}>
      <Image
        source={require('../../assets/Lobo_logo_movements.png')}
        style={styles.logo}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingTop: 40,
    paddingLeft: 16,
    paddingBottom: 8,
    backgroundColor: '#ffffff',
  },
  logo: {
    width: 260,
    height: 170,
  },
});