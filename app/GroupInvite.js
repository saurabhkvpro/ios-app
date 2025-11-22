import { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet, Text, TouchableOpacity, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../services/api.service';
import { COLORS, SIZES } from '../constants/theme';

/**
 * Handles universal links from email group invitations.
 * Verifies user authorization and redirects to appropriate flow.
 */
export default function GroupInvite() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [error, setError] = useState(null);

  useEffect(() => {
    handleInvitation();
  }, []);

  const handleInvitation = async () => {
    const invitationUserId = params.userId;
    const invitationKey = params.code;

    console.log('📧 Group invitation received:', { userId: invitationUserId, invitationKey });

    if (!invitationUserId || !invitationKey) {
      console.error('❌ Missing userId or invitationKey');
      setError('Invalid invitation link. Missing required parameters.');
      return;
    }

    try {
      // Check if user is authenticated
      const token = await AsyncStorage.getItem('bearerToken');

      if (!token) {
        // Store invitation for after login
        await AsyncStorage.setItem('pendingGroupInvitation', JSON.stringify({
          userId: invitationUserId,
          invitationKey,
          timestamp: Date.now(),
        }));

        console.log('🔐 User not authenticated, redirecting to login...');
        router.replace('/(auth)/login');
        return;
      }

      // User is authenticated - Get current user info from API
      console.log('🔍 Fetching current user info from API...');
      const userInfoResponse = await ApiService.getUserInfo();

      if (!userInfoResponse?.success || !userInfoResponse?.data) {
        console.error('❌ Failed to fetch user info');
        setError('Unable to verify your account. Please log in again.');

        await AsyncStorage.setItem('pendingGroupInvitation', JSON.stringify({
          userId: invitationUserId,
          invitationKey,
          timestamp: Date.now(),
        }));

        setTimeout(() => router.replace('/(auth)/login'), 2000);
        return;
      }

      const currentUserId = userInfoResponse.data.userId;

      console.log('🔍 Verifying user:', {
        invitationUserId,
        currentUserId,
        match: invitationUserId === currentUserId
      });

      // CRITICAL: Verify the logged-in user matches the invitation userId
      if (currentUserId !== invitationUserId) {
        console.error('❌ User mismatch! Invitation is for different user.');
        setError('This invitation is for a different account. Please log in with the correct account to accept this invitation.');

        // Store invitation and show alert
        await AsyncStorage.setItem('pendingGroupInvitation', JSON.stringify({
          userId: invitationUserId,
          invitationKey,
          timestamp: Date.now(),
        }));

        // Show alert AFTER a short delay
        setTimeout(() => {
          Alert.alert(
            'Wrong Account',
            'This invitation is for a different user. Please log in with the correct account.',
            [
              {
                text: 'Switch Account',
                onPress: async () => {
                  // Save device token before clearing
                  const deviceTokenRaw = await AsyncStorage.getItem('expoPushToken');
                  await AsyncStorage.clear();
                  if (deviceTokenRaw) {
                    await AsyncStorage.setItem('expoPushToken', deviceTokenRaw);
                  }
                  // Restore pending invitation
                  await AsyncStorage.setItem('pendingGroupInvitation', JSON.stringify({
                    userId: invitationUserId,
                    invitationKey,
                    timestamp: Date.now(),
                  }));
                  router.replace('/(auth)/login');
                },
              },
              {
                text: 'Go Home',
                onPress: () => router.replace('/(tabs)/home'),
                style: 'cancel',
              },
            ]
          );
        }, 500);
        return;
      }

      // User is authenticated AND verified - Call ConfirmGroup API to get group details
      console.log('✅ User verified! Fetching group details from ConfirmGroup API...');

      const confirmResponse = await ApiService.confirmGroup(invitationUserId, invitationKey);

      console.log('📦 ConfirmGroup API response:', confirmResponse);

      if (!confirmResponse?.success) {
        console.error('❌ ConfirmGroup API failed:', confirmResponse?.message);
        setError(confirmResponse?.message || 'Unable to fetch group invitation details. The invitation may be expired or invalid.');
        setTimeout(() => router.replace('/(tabs)/home'), 3000);
        return;
      }

      // Store the invitation with group details
      await AsyncStorage.setItem('activeGroupInvitation', JSON.stringify({
        userId: invitationUserId,
        invitationKey,
        groupDetails: confirmResponse.data, // Store actual group details
      }));

      console.log('✅ Group invitation stored successfully. Redirecting to home...');
      router.replace('/(tabs)/home');
    } catch (error) {
      console.error('❌ Error handling invitation:', error);
      setError('An error occurred while processing your invitation. Please try again.');
      setTimeout(() => router.replace('/(tabs)/home'), 3000);
    }
  };

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Unable to Process Invitation</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => router.replace('/(auth)/login')}
            >
              <Text style={styles.buttonText}>Go to Login</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.replace('/(tabs)/home')}
            >
              <Text style={styles.secondaryButtonText}>Go to Home</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={COLORS.purple1} />
      <Text style={styles.loadingText}>Processing invitation...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.purple0,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.spacingXL,
  },
  loadingText: {
    marginTop: SIZES.spacingL,
    fontSize: 16,
    color: COLORS.purple3,
  },
  errorContainer: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.cornerRadius16,
    padding: SIZES.spacingXL,
    alignItems: 'center',
    maxWidth: 400,
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: SIZES.spacingL,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.purple1,
    marginBottom: SIZES.spacingM,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: COLORS.purple3,
    textAlign: 'center',
    marginBottom: SIZES.spacingXL,
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    gap: SIZES.spacingM,
  },
  primaryButton: {
    backgroundColor: COLORS.purple1,
    padding: SIZES.spacingL,
    borderRadius: SIZES.cornerRadius12,
    alignItems: 'center',
  },
  buttonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    padding: SIZES.spacingL,
    borderRadius: SIZES.cornerRadius12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.purple1,
  },
  secondaryButtonText: {
    color: COLORS.purple1,
    fontSize: 16,
    fontWeight: '600',
  },
});
