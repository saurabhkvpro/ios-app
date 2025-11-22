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
import { useFocusEffect, useRouter } from 'expo-router';
import ApiService from '../../services/api.service';
import LoadingIndicator from '../../components/LoadingIndicator';
import ErrorToast from '../../components/ErrorToast';
import SettingsCard from '../../components/settings/SettingsCard';
import { COLORS, SIZES } from '../../constants/theme';

const EVENT_TYPE_LABELS = {
  1: 'Birthday',
  2: 'Sports',
  3: 'Meeting',
  4: 'Anniversary',
};

const VISIBILITY_TYPE_LABELS = {
  1: 'Public',
  2: 'Private',
  3: 'Shared',
};

const parseEventResponse = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (payload.eventList) return Array.isArray(payload.eventList) ? payload.eventList : [];
  if (payload.data) return parseEventResponse(payload.data);
  return [];
};

const EventListScreen = () => {
  const router = useRouter();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState({ visible: false, message: '' });

  const hideError = useCallback(() => setError({ visible: false, message: '' }), []);
  const showError = useCallback((message) => setError({ visible: true, message }), []);

  const fetchEvents = useCallback(async ({ showSpinner } = { showSpinner: true }) => {
    try {
      if (showSpinner) {
        setLoading(true);
      }
      hideError();
      const response = await ApiService.fetchAllEvents();
      const list = parseEventResponse(response);
      setEvents(Array.isArray(list) ? list : []);
    } catch (err) {
      console.error('⚠️ Fetch events error', err);
      showError(err?.message || 'Unable to load events.');
    } finally {
      if (showSpinner) {
        setLoading(false);
      }
    }
  }, [hideError, showError]);

  useFocusEffect(
    useCallback(() => {
      fetchEvents();
    }, [fetchEvents])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchEvents({ showSpinner: false });
    setRefreshing(false);
  }, [fetchEvents]);

  const handleAddEvent = useCallback(() => {
    router.push('/events/edit');
  }, [router]);

  const handleEditEvent = useCallback(
    (event) => {
      router.push({
        pathname: '/events/edit',
        params: { event: encodeURIComponent(JSON.stringify(event)) },
      });
    },
    [router]
  );

  const handleDeleteEvent = useCallback(
    (event) => {
      Alert.alert(
        'Delete Event',
        `Are you sure you want to delete "${event.title}"? This action cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                setLoading(true);
                const response = await ApiService.deleteEvent(event.id);
                const success = response?.success ?? false;
                if (success) {
                  await fetchEvents({ showSpinner: false });
                } else {
                  showError(response?.message || 'Unable to delete event.');
                }
              } catch (err) {
                console.error('Delete event error', err);
                showError(err?.message || 'Unable to delete event.');
              } finally {
                setLoading(false);
              }
            },
          },
        ]
      );
    },
    [fetchEvents, showError]
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <ErrorToast visible={error.visible} message={error.message} onClose={hideError} />
        <LoadingIndicator visible={loading && !refreshing} />

        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.headerAction}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Events</Text>
          <TouchableOpacity onPress={handleAddEvent} activeOpacity={0.7}>
            <Text style={styles.headerAction}>Add</Text>
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
            {events.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No events yet!</Text>
                <Text style={styles.emptyCopy}>Tap the Add button to create your first event.</Text>
              </View>
            ) : (
              events.map((event, index) => (
                <View key={`event-${event.id}`}>
                  <TouchableOpacity
                    style={styles.eventRow}
                    onPress={() => handleEditEvent(event)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.eventMeta}>
                      <View style={styles.eventHeader}>
                        <Text style={styles.eventTitle}>{event.title}</Text>
                        <Text style={styles.eventType}>
                          {EVENT_TYPE_LABELS[event.eventType] || 'Event'}
                        </Text>
                      </View>
                      {event.description ? (
                        <Text style={styles.eventDescription} numberOfLines={2}>
                          {event.description}
                        </Text>
                      ) : null}
                      {event.location ? (
                        <Text style={styles.eventLocation}>📍 {event.location}</Text>
                      ) : null}
                      <Text style={styles.eventDate}>
                        {formatEventDate(event.startTime, event.endTime)}
                      </Text>
                      <View style={styles.eventFooter}>
                        <Text style={styles.eventVisibility}>
                          {VISIBILITY_TYPE_LABELS[event.visibilityType] || 'Private'}
                        </Text>
                        {event.tags && event.tags.length > 0 ? (
                          <Text style={styles.eventTags}>
                            {event.tags.length} tag{event.tags.length > 1 ? 's' : ''}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <Pressable
                      style={styles.deleteButton}
                      onPress={(e) => {
                        e?.stopPropagation?.();
                        handleDeleteEvent(event);
                      }}
                    >
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </Pressable>
                  </TouchableOpacity>
                  {index < events.length - 1 ? <View style={styles.divider} /> : null}
                </View>
              ))
            )}
          </SettingsCard>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const formatEventDate = (startTime, endTime) => {
  if (!startTime) return 'No schedule';
  try {
    const start = new Date(startTime);
    if (Number.isNaN(start.getTime())) {
      return startTime;
    }

    let dateStr = `${start.toLocaleDateString()} • ${start.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })}`;

    if (endTime) {
      const end = new Date(endTime);
      if (!Number.isNaN(end.getTime())) {
        dateStr += ` - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
      }
    }

    return dateStr;
  } catch (err) {
    return startTime;
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
  eventRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.spacingM,
    paddingVertical: SIZES.spacingM,
  },
  eventMeta: {
    flex: 1,
    marginRight: SIZES.spacingM,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SIZES.spacingXS,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.purple2,
    flex: 1,
  },
  eventType: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.white,
    backgroundColor: COLORS.purple2,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: SIZES.spacingXS,
  },
  eventDescription: {
    fontSize: 13,
    color: COLORS.purple3,
    marginBottom: SIZES.spacingXS,
  },
  eventLocation: {
    fontSize: 12,
    color: COLORS.purple3,
    marginBottom: SIZES.spacingXS,
  },
  eventDate: {
    fontSize: 13,
    color: COLORS.purple3,
    marginBottom: SIZES.spacingXS,
  },
  eventFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SIZES.spacingS,
  },
  eventVisibility: {
    fontSize: 11,
    color: COLORS.purple3,
    fontStyle: 'italic',
  },
  eventTags: {
    fontSize: 11,
    color: COLORS.purple3,
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

export default EventListScreen;
