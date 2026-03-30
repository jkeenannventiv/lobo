import React, { useEffect, useRef } from 'react';
import { View, Image, StyleSheet, Animated } from 'react-native';
import { getSession, isConsentCurrent } from '../../config/storage';
import { getVisitCount } from '../../config/database';

const splashImage = require('../../../assets/lobo_place_splash.png');

export default function SplashScreen({ navigation }: any) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: false,
      }),
      Animated.delay(2000),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: false,
      }),
    ]).start(async () => {
      const session = await getSession();
      if (!session) {
        // New user — start onboarding
        navigation.replace('HowItWorks');
        return;
      }

      const consentCurrent = await isConsentCurrent();
      if (!consentCurrent) {
        // Returning user who hasn't consented to current version
        navigation.replace('Consent');
        return;
      }

      const visitCount = await getVisitCount();
      if (visitCount === 0) {
        // Logged in and consented but no data yet — go to import
        navigation.replace('ExportGuide');
        return;
      }

      // Fully returning user — go straight to dashboard
      navigation.replace('Home');
    });
  }, []);

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.imageWrap, { opacity }]}>
        <Image
          source={splashImage}
          style={styles.image}
          resizeMode="cover"
        />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0d1b2a',
  },
  imageWrap: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});