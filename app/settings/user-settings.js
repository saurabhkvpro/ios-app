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
} from 'react-native';
import { useRouter } from 'expo-router';
import ApiService from '../../services/api.service';
import LoadingIndicator from '../../components/LoadingIndicator';
import ErrorToast from '../../components/ErrorToast';
import SettingsCard from '../../components/settings/SettingsCard';
import SettingsToggleRow from '../../components/settings/SettingsToggleRow';
import SettingsOptionRow from '../../components/settings/SettingsOptionRow';
import NudgeFrequencySheet, { NUDGE_FREQUENCIES } from '../../components/NudgeFrequencySheet';
import { COLORS, SIZES } from '../../constants/theme';

const normalizeSettings = (payload) => {
  if (!payload) {
    return { hideFlaggedUsers: false, hideFlaggedPosts: false };
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'hideFlaggedUsers')) {
    return {
      hideFlaggedUsers: Boolean(payload.hideFlaggedUsers),
      hideFlaggedPosts: Boolean(payload.hideFlaggedPosts),
    };
  }

  if (payload.data) {
    return normalizeSettings(payload.data);
  }

  return { hideFlaggedUsers: false, hideFlaggedPosts: false };
};

const extractFrequencyType = (payload) => {
  if (!payload) {
    return NUDGE_FREQUENCIES.DAILY;
  }

  // Check if freguencyType is directly in the payload
  if (payload.freguencyType !== undefined) {
    return payload.freguencyType;
  }

  // Check if it's nested in data
  if (payload.data && payload.data.freguencyType !== undefined) {
    return payload.data.freguencyType;
  }

  return NUDGE_FREQUENCIES.DAILY;
};

const UserSettingsScreen = () => {
  const router = useRouter();

  const [settings, setSettings] = useState({ hideFlaggedUsers: false, hideFlaggedPosts: false });
  const [initialSettings, setInitialSettings] = useState(null);
  const [nudgeFrequency, setNudgeFrequency] = useState(NUDGE_FREQUENCIES.DAILY);
  const [initialNudgeFrequency, setInitialNudgeFrequency] = useState(NUDGE_FREQUENCIES.DAILY);
  const [showNudgeSheet, setShowNudgeSheet] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState({ visible: false, message: '' });

  const hideError = useCallback(() => setError({ visible: false, message: '' }), []);
  const showError = useCallback((message) => setError({ visible: true, message }), []);

  const fetchSettings = useCallback(async ({ showSpinner } = { showSpinner: true }) => {
    try {
      if (showSpinner) {
        setLoading(true);
      }
      hideError();
      const response = await ApiService.fetchUserSettings();
      const normalized = normalizeSettings(response);
      setSettings(normalized);
      setInitialSettings({ ...normalized });

      // Extract and set nudge frequency from backend response
      const frequencyFromBackend = extractFrequencyType(response);
      setNudgeFrequency(frequencyFromBackend);
      setInitialNudgeFrequency(frequencyFromBackend);
    } catch (err) {
      console.error('⚠️ Fetch user settings error', err);
      showError(err?.message || 'Unable to load user settings.');
    } finally {
      if (showSpinner) {
        setLoading(false);
      }
    }
  }, [hideError, showError]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSettings({ showSpinner: false });
    setRefreshing(false);
  }, [fetchSettings]);

  const handleToggle = useCallback((key) => (value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleOpenNudgeSheet = useCallback(() => {
    setShowNudgeSheet(true);
  }, []);

  const handleCloseNudgeSheet = useCallback(() => {
    setShowNudgeSheet(false);
  }, []);

  const handleSelectNudgeFrequency = useCallback((frequency) => {
    setNudgeFrequency(frequency);
  }, []);

  const getNudgeFrequencyLabel = useCallback((frequency) => {
    switch (frequency) {
      case NUDGE_FREQUENCIES.DAILY:
        return 'Daily';
      case NUDGE_FREQUENCIES.WEEKLY:
        return 'Weekly';
      case NUDGE_FREQUENCIES.OFF:
        return 'Off';
      default:
        return 'Daily';
    }
  }, []);

  const hasChanges = useMemo(() => {
    if (!initialSettings) return false;
    return (
      settings.hideFlaggedUsers !== initialSettings.hideFlaggedUsers ||
      settings.hideFlaggedPosts !== initialSettings.hideFlaggedPosts ||
      nudgeFrequency !== initialNudgeFrequency
    );
  }, [initialSettings, settings.hideFlaggedPosts, settings.hideFlaggedUsers, nudgeFrequency, initialNudgeFrequency]);

  const handleSave = useCallback(async () => {
    if (!hasChanges) return;

    try {
      hideError();
      setSaving(true);

      // Save user settings (flags)
      const settingsChanged =
        settings.hideFlaggedUsers !== initialSettings.hideFlaggedUsers ||
        settings.hideFlaggedPosts !== initialSettings.hideFlaggedPosts;

      if (settingsChanged) {
        const response = await ApiService.updateUserSettings(settings);
        const success = response?.success ?? false;
        if (!success) {
          showError(response?.message || 'Unable to update settings.');
          return;
        }
      }

      // Save nudge preference
      const nudgeChanged = nudgeFrequency !== initialNudgeFrequency;
      if (nudgeChanged) {
        const nudgeResponse = await ApiService.saveNudgePreference(nudgeFrequency);
        const nudgeSuccess = nudgeResponse?.success ?? false;
        if (!nudgeSuccess) {
          showError(nudgeResponse?.message || 'Unable to update nudge preference.');
          return;
        }
      }

      // If we get here, everything saved successfully
      setInitialSettings({ ...settings });
      setInitialNudgeFrequency(nudgeFrequency);
      Alert.alert('Settings Saved', 'Your preferences have been updated.');
    } catch (err) {
      console.error('Update settings error', err);
      showError(err?.message || 'Unable to update settings.');
    } finally {
      setSaving(false);
    }
  }, [hasChanges, hideError, settings, showError, nudgeFrequency, initialSettings, initialNudgeFrequency]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <ErrorToast visible={error.visible} message={error.message} onClose={hideError} />
        <LoadingIndicator visible={(loading && !refreshing) || saving} />

        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.headerAction}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>User Settings</Text>
          <TouchableOpacity
            onPress={handleSave}
            activeOpacity={hasChanges ? 0.7 : 1}
            disabled={!hasChanges || saving}
          >
            <Text style={[styles.headerAction, !hasChanges && styles.headerActionDisabled]}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.purple1} />
          }
          showsVerticalScrollIndicator={false}
        >
          <SettingsCard>
            <Text style={styles.description}>
              Choose how often you want to receive nudges to stay connected.
            </Text>
            <SettingsOptionRow
              label="Nudge Preference"
              onPress={handleOpenNudgeSheet}
              rightElement={
                <View style={styles.frequencyValue}>
                  <Text style={styles.frequencyText}>{getNudgeFrequencyLabel(nudgeFrequency)}</Text>
                </View>
              }
              showDivider={false}
            />
          </SettingsCard>

          <SettingsCard style={styles.settingsCard}>
            <Text style={styles.description}>
              Choose how flagged users and posts are shown in your experience.
            </Text>
            <SettingsToggleRow
              label="Hide flagged users"
              value={settings.hideFlaggedUsers}
              onValueChange={handleToggle('hideFlaggedUsers')}
            />
            <View style={styles.divider} />
            <SettingsToggleRow
              label="Hide flagged posts"
              value={settings.hideFlaggedPosts}
              onValueChange={handleToggle('hideFlaggedPosts')}
            />
          </SettingsCard>
        </ScrollView>

        <NudgeFrequencySheet
          visible={showNudgeSheet}
          selectedFrequency={nudgeFrequency}
          onSelect={handleSelectNudgeFrequency}
          onClose={handleCloseNudgeSheet}
        />
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
    paddingVertical: SIZES.spacingS,
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
    paddingBottom: SIZES.spacingXXL,
  },
  description: {
    paddingHorizontal: SIZES.spacingM,
    paddingBottom: SIZES.spacingS,
    fontSize: 14,
    color: COLORS.purple3,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.purple0,
    marginHorizontal: SIZES.spacingM,
  },
  settingsCard: {
    marginTop: SIZES.spacingM,
  },
  frequencyValue: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SIZES.spacingS,
  },
  frequencyText: {
    fontSize: 16,
    color: COLORS.purple3,
    marginRight: SIZES.spacingXS,
  },
});

export default UserSettingsScreen;
