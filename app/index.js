import { useEffect, useState } from 'react';
import { useRouter, useRootNavigationState } from 'expo-router';
import { View, Image, StyleSheet, Dimensions, StatusBar, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/theme';

const { width } = Dimensions.get('window');

export default function Index() {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!rootNavigationState?.key) return;

    initializeApp();
  }, [rootNavigationState?.key]);

  const initializeApp = async () => {
    try {
      // Show splash for minimum time
      await new Promise(resolve => setTimeout(resolve, 1000));

      const token = await AsyncStorage.getItem('bearerToken');

      setIsReady(true);

      // Navigate after ensuring navigation is ready
      if (token) {
        // User is logged in, go directly to home (skip onboarding)
        router.replace('/(tabs)/home');
      } else {
        // User is not logged in, show 3-step onboarding
        router.replace('/onboarding');
      }
    } catch (error) {
      console.error('Error initializing app:', error);
      setIsReady(true);
      router.replace('/onboarding');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.purple0} />
      <Image
        source={require('../assets/images/logoImg.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator
        size="large"
        color={COLORS.purple1}
        style={styles.loader}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.purple0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: width * 0.6,
    height: width * 0.6,
    marginBottom: 40,
  },
  loader: {
    marginTop: 20,
  },
});
