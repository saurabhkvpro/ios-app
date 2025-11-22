import { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS } from '../constants/theme';

/**
 * Handles universal links for login page from emails.
 * Redirects to login screen.
 */
export default function Login() {
  const router = useRouter();

  useEffect(() => {
    handleLoginRedirect();
  }, []);

  const handleLoginRedirect = async () => {
    console.log('🔗 Login link received, redirecting to login screen...');

    try {
      // Check if user is already authenticated
      const token = await AsyncStorage.getItem('bearerToken');

      if (token) {
        // User is already logged in, just go to home
        console.log('✅ User already authenticated, redirecting to home...');
        router.replace('/(tabs)/home');
      } else {
        // User not logged in, go to login screen
        console.log('🔐 Redirecting to login screen...');
        router.replace('/(auth)/login');
      }
    } catch (error) {
      console.error('❌ Error handling login redirect:', error);
      // Default to login screen on error
      router.replace('/(auth)/login');
    }
  };

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.purple1} />
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
});
