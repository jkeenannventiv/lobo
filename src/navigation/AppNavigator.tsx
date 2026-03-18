import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// Auth & Onboarding Screens
import SplashScreen from '../screens/onboarding/SplashScreen';
import HowItWorksScreen from '../screens/onboarding/HowItWorksScreen';
import PhoneScreen from '../screens/auth/PhoneScreen';
import OtpScreen from '../screens/auth/OtpScreen';
import EmailScreen from '../screens/auth/EmailScreen';
import LocationScreen from '../screens/onboarding/LocationScreen';
import ExportGuideScreen from '../screens/onboarding/ExportGuideScreen';
import ExportSuccessScreen from '../screens/onboarding/ExportSuccessScreen';
import ProcessingScreen from '../screens/ProcessingScreen';
import EnrichmentScreen from '../screens/EnrichmentScreen';

// Main App
import HomeScreen from '../screens/HomeScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Splash"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Splash" component={SplashScreen} />
        <Stack.Screen name="HowItWorks" component={HowItWorksScreen} />
        <Stack.Screen name="Phone" component={PhoneScreen} />
        <Stack.Screen name="Otp" component={OtpScreen} />
        <Stack.Screen name="Email" component={EmailScreen} />
        <Stack.Screen name="Location" component={LocationScreen} />
        <Stack.Screen name="ExportGuide" component={ExportGuideScreen} />
        <Stack.Screen name="ExportSuccess" component={ExportSuccessScreen} />
        <Stack.Screen name="Processing" component={ProcessingScreen} />
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Enrichment" component={EnrichmentScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}