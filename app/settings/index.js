import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StatusBar,
  Alert,
  Linking,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ApiService from '../../services/api.service';
import LoadingIndicator from '../../components/LoadingIndicator';
import ErrorToast from '../../components/ErrorToast';
import SettingsCard from '../../components/settings/SettingsCard';
import SettingsOptionRow from '../../components/settings/SettingsOptionRow';
import SettingsProfileSummary from '../../components/settings/SettingsProfileSummary';
import { COLORS, SIZES } from '../../constants/theme';
import { buildImageUri } from '../user/[profileId]';

const PRIVACY_POLICY_URL = 'https://website-01-dev.azurewebsites.net/privacy';

const SettingsScreen = () => {
  const router = useRouter();

  const [account, setAccount] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState({ visible: false, message: '' });

  const hideError = useCallback(() => setError({ visible: false, message: '' }), []);
  const showError = useCallback((message) => setError({ visible: true, message }), []);

  const fetchAccount = useCallback(async ({ showSpinner } = { showSpinner: true }) => {
    try {
      if (showSpinner) {
        setLoading(true);
      }
      hideError();
      const response = await ApiService.getAccountInfo();
      const data = response?.data ?? response;
      if (data) {
        setAccount(data);
      }
    } catch (err) {
      console.error('⚠️ Settings fetch error', err);
      showError(err?.message || 'Unable to load account. Please try again.');
    } finally {
      if (showSpinner) {
        setLoading(false);
      }
    }
  }, [hideError, showError]);

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAccount({ showSpinner: false });
    setRefreshing(false);
  }, [fetchAccount]);

  const fullName = useMemo(() => {
    if (!account) return '';
    const first = account.firstName || '';
    const last = account.lastName || '';
    return `${first} ${last}`.trim();
  }, [account]);

  const aboutText = account?.aboutMe || 'Keep your loved ones close.';
  const profileId = account?.userProfileId;

  const handleViewProfile = useCallback(() => {
    if (!profileId) return;
    const params = { profileId: String(profileId), viewerProfileId: String(profileId) };
    router.push({ pathname: '/user/[profileId]', params });
  }, [profileId, router]);

  const handleEditProfile = useCallback(() => {
    if (!profileId) return;
    router.push({
      pathname: '/add-connection',
      params: {
        userId: String(profileId),
        isEdit: 'true',
        hideRelationshipField: 'true',
        isProfileEdit: 'true',

      },
    });
  }, [profileId, router]);

  const handleOpenChangePassword = useCallback(() => {
    router.push('/settings/change-password');
  }, [router]);

  const handleOpenReminders = useCallback(() => {
    router.push('/settings/reminders');
  }, [router]);

  const handleOpenUserSettings = useCallback(() => {
    router.push('/settings/user-settings');
  }, [router]);

  const handleOpenPrivacyPolicy = useCallback(async () => {
    try {
      const supported = await Linking.canOpenURL(PRIVACY_POLICY_URL);
      if (supported) {
        await Linking.openURL(PRIVACY_POLICY_URL);
      } else {
        showError('Unable to open privacy policy link.');
      }
    } catch (err) {
      showError('Unable to open privacy policy link.');
    }
  }, [showError]);

  const handleLogout = useCallback(async () => {
    try {
      console.log('🚪 Starting logout process...');

      // Get device token before clearing storage
      const deviceTokenRaw = await AsyncStorage.getItem('expoPushToken');
      const deviceToken =
        typeof deviceTokenRaw === 'string'
          ? deviceTokenRaw.replace(/^"|"$/g, '')
          : '';

      // Unregister device token from backend
      if (deviceToken) {
        try {
          await ApiService.logoutDevice(deviceToken);
          console.log('✅ Device token unregistered from backend');
        } catch (logoutError) {
          console.error('⚠️ Failed to unregister device token during logout:', logoutError?.message || logoutError);
        }
      }

      // Clear ALL storage (including device token) - complete app reset
      await AsyncStorage.clear();
      console.log('✅ All AsyncStorage data cleared (including device token)');

      // Navigate to login
      router.replace('/(auth)/login');
      console.log('✅ Logout complete - navigating to login');
    } catch (error) {
      console.error('❌ Error during logout:', error);
      // Even if there's an error, clear storage and navigate to login
      try {
        await AsyncStorage.clear();
      } catch (clearError) {
        console.error('❌ Failed to clear storage:', clearError);
      }
      router.replace('/(auth)/login');
    }
  }, [router]);

  const confirmDeleteAccount = useCallback(() => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to delete your account? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setProcessing(true);
              const response = await ApiService.deleteAccount();
              const success = response?.success ?? false;
              if (success) {
                Alert.alert('Account Deleted', 'Your account has been deleted successfully.', [
                  {
                    text: 'OK',
                    onPress: async () => {
                      await ApiService.clearToken();
                      router.replace('/(auth)/login');
                    },
                  },
                ]);
              } else {
                showError(response?.message || 'Unable to delete account.');
              }
            } catch (err) {
              console.error('Delete account error', err);
              showError(err?.message || 'Unable to delete account.');
            } finally {
              setProcessing(false);
            }
          },
        },
      ]
    );
  }, [router, showError]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <ErrorToast visible={error.visible} message={error.message} onClose={hideError} />
        <LoadingIndicator visible={(loading && !refreshing) || processing} />

        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.headerAction}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
          <TouchableOpacity onPress={handleEditProfile} activeOpacity={profileId ? 0.7 : 1} disabled={!profileId}>
            <Text style={[styles.headerAction, !profileId && styles.headerActionDisabled]}>Edit</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.purple1}
            />
          }
          showsVerticalScrollIndicator={false}
        >
          <SettingsCard style={styles.summaryCard}>
            <SettingsProfileSummary
              fullName={fullName}
              aboutText={aboutText}
              profileImage={account?.profileImage}
              buildImageUri={buildImageUri}
            />
          </SettingsCard>

          <SettingsCard>
            <SettingsOptionRow label="View Profile" onPress={handleViewProfile} />
            <SettingsOptionRow label="Change Password" onPress={handleOpenChangePassword} />
            <SettingsOptionRow label="Reminders" onPress={handleOpenReminders} />
            <SettingsOptionRow label="User Settings" onPress={handleOpenUserSettings} />
            <SettingsOptionRow label="Privacy Policy" onPress={handleOpenPrivacyPolicy} />
            <SettingsOptionRow label="Delete Account" onPress={confirmDeleteAccount} variant="danger" />
            <SettingsOptionRow label="Logout" onPress={handleLogout} showDivider={false} variant="danger" />
          </SettingsCard>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgColor,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bgColor,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.spacingM,
    paddingTop: SIZES.spacingS,
    paddingBottom: SIZES.spacingS,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.purple2,
  },
  headerAction: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.purple2,
  },
  headerActionDisabled: {
    opacity: 0.4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: SIZES.spacingS,
    paddingBottom: SIZES.spacingXXL,
  },
  summaryCard: {
    paddingVertical: SIZES.spacingM,
  },
});

export default SettingsScreen;
