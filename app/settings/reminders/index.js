import React, { useCallback, useMemo, useState } from 'react';
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
  Pressable,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import ApiService from '../../../services/api.service';
import LoadingIndicator from '../../../components/LoadingIndicator';
import ErrorToast from '../../../components/ErrorToast';
import SettingsCard from '../../../components/settings/SettingsCard';
import { COLORS, SIZES } from '../../../constants/theme';

const parseReminderResponse = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (payload.reminderList) return Array.isArray(payload.reminderList) ? payload.reminderList : [];
  if (payload.data) return parseReminderResponse(payload.data);
  return [];
};

const resolveReminderOwnerId = (reminder) => {
  if (!reminder) return null;
  const raw = reminder.userConnectionId
    ?? reminder.userProfileId
    ?? reminder.memberProfileId
    ?? reminder.connectionProfileId;
  const numeric = Number(raw);
  return Number.isFinite(numeric) ? numeric : null;
};

const ReminderListScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState({ visible: false, message: '' });

  const hideError = useCallback(() => setError({ visible: false, message: '' }), []);
  const showError = useCallback((message) => setError({ visible: true, message }), []);

  const filterUserId = useMemo(() => {
    const raw = Array.isArray(params?.userConnectionId) ? params.userConnectionId[0] : params?.userConnectionId;
    if (raw == null) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }, [params?.userConnectionId]);

  const filterUserName = useMemo(() => {
    const raw = Array.isArray(params?.userName) ? params.userName[0] : params?.userName;
    if (!raw) return '';
    return String(raw);
  }, [params?.userName]);

  const visibleReminders = useMemo(() => {
    if (!filterUserId) {
      return reminders;
    }
    return reminders.filter((reminder) => resolveReminderOwnerId(reminder) === filterUserId);
  }, [filterUserId, reminders]);

  const fetchReminders = useCallback(async ({ showSpinner } = { showSpinner: true }) => {
    try {
      if (showSpinner) {
        setLoading(true);
      }
      hideError();
      const response = await ApiService.fetchReminders();
      const list = parseReminderResponse(response);
      setReminders(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('⚠️ Fetch reminders error', err);
      showError(err?.message || 'Unable to load reminders.');
    } finally {
      if (showSpinner) {
        setLoading(false);
      }
    }
  }, [hideError, showError]);

  useFocusEffect(
    useCallback(() => {
      fetchReminders();
    }, [fetchReminders])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReminders({ showSpinner: false });
    setRefreshing(false);
  }, [fetchReminders]);

  const handleAddReminder = useCallback(() => {
    if (filterUserId) {
      router.push({
        pathname: '/settings/reminders/edit',
        params: {
          connectionId: filterUserId.toString(),
          connectionName: filterUserName,
        },
      });
      return;
    }

    router.push('/settings/reminders/edit');
  }, [filterUserId, filterUserName, router]);

  const handleEditReminder = useCallback(
    (reminder) => {
      router.push({
        pathname: '/settings/reminders/edit',
        params: { reminder: encodeURIComponent(JSON.stringify(reminder)) },
      });
    },
    [router]
  );

  const handleDeleteReminder = useCallback(
    (reminder) => {
      Alert.alert(
        'Delete Reminder',
        `Are you sure you want to delete "${reminder.title}"? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                setLoading(true);
                const response = await ApiService.deleteReminder(reminder.id);
                const success = response?.success ?? false;
                if (success) {
                  await fetchReminders({ showSpinner: false });
                } else {
                  showError(response?.message || 'Unable to delete reminder.');
                }
              } catch (err) {
                console.error('Delete reminder error', err);
                showError(err?.message || 'Unable to delete reminder.');
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    },
    [fetchReminders, showError]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <ErrorToast visible={error.visible} message={error.message} onClose={hideError} />
        <LoadingIndicator visible={(loading && !refreshing)} />

        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.headerAction}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {filterUserName ? `${filterUserName}'s Reminders` : 'Reminders'}
          </Text>
          <TouchableOpacity onPress={handleAddReminder} activeOpacity={0.7}>
            <Text style={styles.headerAction}>Add</Text>
          </TouchableOpacity>
        </View>

        {filterUserName ? (
          <Text style={styles.filterNote}>Showing reminders for {filterUserName}</Text>
        ) : null}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.purple1} />
          }
          showsVerticalScrollIndicator={false}
        >
          <SettingsCard>
            {visibleReminders.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No reminders yet!</Text>
                <Text style={styles.emptyCopy}>
                  {filterUserName
                    ? `Tap the Add button to create a reminder for ${filterUserName}.`
                    : 'Tap the Add button to create your first reminder.'}
                </Text>
              </View>
            ) : (
              visibleReminders.map((reminder, index) => (
                <View key={`reminder-${reminder.id}`}>
                  <TouchableOpacity
                    style={styles.reminderRow}
                    onPress={() => handleEditReminder(reminder)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.reminderMeta}>
                      <Text style={styles.reminderTitle}>{reminder.title}</Text>
                      <Text style={styles.reminderDate}>{formatReminderDate(reminder.notificationDateTime)}</Text>
                      {reminder.userConnectionName ? (
                        <Text style={styles.reminderConnection}>{reminder.userConnectionName}</Text>
                      ) : null}
                      {reminder.remindEachYear ? (
                        <Text style={styles.reminderRecurring}>Repeats every year</Text>
                      ) : null}
                    </View>
                    <Pressable
                      style={styles.deleteButton}
                      onPress={(event) => {
                        event?.stopPropagation?.();
                        handleDeleteReminder(reminder);
                      }}
                    >
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </Pressable>
                  </TouchableOpacity>
                  {index < visibleReminders.length - 1 ? <View style={styles.divider} /> : null}
                </View>
              ))
            )}
          </SettingsCard>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const formatReminderDate = (value) => {
  if (!value) return 'No schedule';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return `${date.toLocaleDateString()} • ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } catch (err) {
    return value;
  }
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
  filterNote: {
    fontSize: 13,
    color: COLORS.purple3,
    paddingHorizontal: SIZES.spacingM,
    marginBottom: SIZES.spacingXS,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SIZES.spacingXXL,
  },
  emptyState: {
    paddingVertical: SIZES.spacingXL,
    alignItems: 'center',
    paddingHorizontal: SIZES.spacingL,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.purple2,
    marginBottom: SIZES.spacingS,
  },
  emptyCopy: {
    fontSize: 14,
    color: COLORS.purple3,
    textAlign: 'center',
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.spacingM,
    paddingVertical: SIZES.spacingM,
  },
  reminderMeta: {
    flex: 1,
    marginRight: SIZES.spacingM,
  },
  reminderTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.purple2,
  },
  reminderDate: {
    fontSize: 13,
    color: COLORS.purple3,
    marginTop: SIZES.spacingXS,
  },
  reminderConnection: {
    fontSize: 12,
    color: COLORS.purple3,
    marginTop: SIZES.spacingXS,
  },
  reminderRecurring: {
    fontSize: 12,
    color: COLORS.purple3,
    marginTop: SIZES.spacingXS,
    fontStyle: 'italic',
  },
  deleteButton: {
    paddingVertical: SIZES.spacingXS,
    paddingHorizontal: SIZES.spacingS,
    backgroundColor: COLORS.errorCode,
    borderRadius: SIZES.cornerRadius12,
  },
  deleteButtonText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.purple0,
    marginHorizontal: SIZES.spacingM,
  },
});

export default ReminderListScreen;
