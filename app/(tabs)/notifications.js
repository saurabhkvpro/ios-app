import React, { useCallback, useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
  Animated,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import * as ExpoNotifications from 'expo-notifications';
import { COLORS, SIZES } from '../../constants/theme';
import ApiService from '../../services/api.service';
import LoadingIndicator from '../../components/LoadingIndicator';
import ErrorToast from '../../components/ErrorToast';
import NotificationActionModal from '../../components/NotificationActionModal';
import NudgePopup from '../../components/NudgePopup';

const RELATIVE_DIVISORS = [
  { unit: 'year', value: 365 * 24 * 60 * 60 * 1000 },
  { unit: 'month', value: 30 * 24 * 60 * 60 * 1000 },
  { unit: 'day', value: 24 * 60 * 60 * 1000 },
  { unit: 'hour', value: 60 * 60 * 1000 },
  { unit: 'minute', value: 60 * 1000 },
  { unit: 'second', value: 1000 },
];

const getRelativeTime = (dateString) => {
  if (!dateString) return '';
  try {
    const target = new Date(dateString);
    if (!Number.isFinite(target.getTime())) return '';
    const diff = Date.now() - target.getTime();
    for (const { unit, value } of RELATIVE_DIVISORS) {
      const amount = Math.floor(Math.abs(diff) / value);
      if (amount >= 1) {
        const suffix = amount === 1 ? '' : 's';
        if (diff >= 0) {
          return `${amount} ${unit}${suffix} ago`;
        }
        return `in ${amount} ${unit}${suffix}`;
      }
    }
    return 'just now';
  } catch (error) {
    return '';
  }
};

const ADD_GROUP_NOTIFICATION_TYPES = new Set(['AddGroup', 'GroupInvitation']);

const hasValidGroupDate = (value) => {
  if (!value) {
    return false;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return false;
    }

    const normalized = trimmed.replace(/\s+/g, '').toLowerCase();
    if (normalized.includes('0001-01-01') || normalized.includes('1900-01-01')) {
      return false;
    }
  }

  return true;
};

const shouldShowJoinButtonForGroup = (group) => {
  if (!group) return true;

  const acceptedValid = hasValidGroupDate(group.acceptedDate);
  const rejectedValid = hasValidGroupDate(group.rejectedDate);

  if (!acceptedValid && !rejectedValid) {
    return true;
  }

  if (acceptedValid && !rejectedValid) {
    return false;
  }

  return !acceptedValid;
};

const normalizeNotifications = (payload) => {
  if (!payload) return [];

  const sourceList = Array.isArray(payload)
    ? payload
    : payload?.notificationList || payload?.data?.notificationList;

  if (!Array.isArray(sourceList)) {
    return [];
  }

  return sourceList.filter((item) => {
    const isRead =
      item?.isRead ??
      item?.IsRead ??
      item?.isMarkedRead ??
      item?.IsMarkedRead ??
      false;
    return !isRead;
  });
};

const Notifications = () => {
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState({ visible: false, message: '' });
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [nudgePopupVisible, setNudgePopupVisible] = useState(false);
  const [selectedNudge, setSelectedNudge] = useState(null);

  const hideError = useCallback(() => setError({ visible: false, message: '' }), []);
  const showError = useCallback((message) => setError({ visible: true, message }), []);

  // Update badge count whenever notifications change
  useEffect(() => {
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    ExpoNotifications.setBadgeCountAsync(unreadCount).catch((err) =>
      console.error('⚠️ Failed to set badge count:', err)
    );
  }, [notifications]);

  const fetchNotifications = useCallback(
    async ({ showSpinner } = { showSpinner: true }) => {
      try {
        if (showSpinner) {
          setLoading(true);
        }
        hideError();
        const response = await ApiService.fetchNotifications();
        const list = normalizeNotifications(response);
        setNotifications(list);
      } catch (err) {
        console.error('⚠️ Fetch notifications error', err);
        showError(err?.message || 'Unable to load notifications right now.');
      } finally {
        if (showSpinner) {
          setLoading(false);
        }
      }
    },
    [hideError, showError]
  );

  const markAsRead = useCallback(async (notificationId) => {
    try {
      await ApiService.markNotificationAsRead(notificationId);

      // Remove notification locally so it doesn't reappear
      setNotifications((prev) =>
        prev.filter((item) => (item.notificationId || item.NotificationId) !== notificationId)
      );
    } catch (err) {
      console.error('⚠️ Mark as read error:', err);
      showError('Failed to mark notification as read');
      throw err;
    }
  }, [showError]);

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchNotifications({ showSpinner: false });
    setRefreshing(false);
  }, [fetchNotifications]);

  const handleNotificationPress = useCallback(
    async (notification) => {
      try {
        // Support both camelCase and PascalCase field names from backend
        const notificationType = notification.notificationType || notification.NotificationType;
        const notificationId = notification.notificationId || notification.NotificationId;
        const entityId = notification.entityId || notification.EntityId;

        try {
          await markAsRead(notificationId);
        } catch (err) {
          // Error already handled in markAsRead
          return;
        }

        // Handle Nudge notifications (birthday notifications)
        if (notificationType === 'Nudge') {
          try {
            setLoading(true);

            // Extract all data from notification (backend now provides complete data!)
            const title = notification.title || notification.Title || 'Happy Birthday';
            const message = notification.message || notification.Message || 'Wish you a very happy birthday!';
            const senderName = notification.senderName || notification.SenderName || 'Birthday Person';
            const senderUserId = notification.senderUserId || notification.MemberUserId;

            console.log('🎂 Nudge notification received:');
            console.log('  📝 Title:', title);
            console.log('  💬 Message:', message);
            console.log('  👤 Sender Name:', senderName);
            console.log('  🆔 Entity ID:', entityId);

            // Create nudge data from notification (no API call needed!)
            const nudgeData = {
              id: entityId,
              title: title,
              body: message,
              memberName: senderName,
              type: 'Birthday',
              memberUserId: senderUserId,
            };

            console.log('✅ Showing nudge popup with complete data from notification');
            setSelectedNudge(nudgeData);
            setNudgePopupVisible(true);

          } catch (err) {
            console.error('⚠️ Failed to process nudge notification', err);

            // Last resort fallback
            const title = notification.title || notification.Title || 'Happy Birthday';
            const message = notification.message || notification.Message || 'Wish you a very happy birthday!';
            const senderName = notification.senderName || notification.SenderName || 'Birthday Person';

            const nudgeData = {
              id: entityId,
              title: title,
              body: message,
              memberName: senderName,
              type: 'Birthday',
              memberUserId: notification.senderUserId || notification.MemberUserId,
            };

            console.log('🎂 Showing nudge popup (error fallback):', nudgeData);
            setSelectedNudge(nudgeData);
            setNudgePopupVisible(true);
          } finally {
            setLoading(false);
          }
          return; // Stop here - don't show other modals
        }

        // Handle group invitations differently
        if (ADD_GROUP_NOTIFICATION_TYPES.has(notificationType) && entityId) {
          let showModal = true;

          try {
            setLoading(true);
            const response = await ApiService.fetchGroupDetails(entityId);
            const group = response?.data;

            if (!group) {
              showError('Unable to load group details. Please try again.');
              return;
            }

            const shouldShowJoinButton = shouldShowJoinButtonForGroup(group);

            if (!shouldShowJoinButton) {
              // Already a member – navigate directly to group feed
              setModalVisible(false);
              setSelectedNotification(null);
              router.push({
                pathname: '/(tabs)/home',
                params: { groupId: entityId.toString() },
              });
              showModal = false;
            }
          } catch (err) {
            console.error('⚠️ Failed to fetch group details for notification', err);
            showError(err?.message || 'Unable to open this group right now.');
            return;
          } finally {
            setLoading(false);
          }

          if (!showModal) {
            return;
          }
        }

        setSelectedNotification(notification);
        setModalVisible(true);
      } catch (err) {
        console.error('⚠️ Notification press error', err);
        Alert.alert('Whoops', 'Unable to open this notification right now.');
      }
    },
    [markAsRead, router, showError]
  );

  const handleNotificationAction = useCallback(
    async (action, notification) => {
      const notificationId = notification.notificationId || notification.NotificationId;

      // Remove notification from list after action
      if (action === 'accept' || action === 'reject') {
        setNotifications((prev) =>
          prev.filter((item) => (item.notificationId || item.NotificationId) !== notificationId)
        );
      }

      // Navigate based on notification type if needed
      if (action === 'view') {
        const notificationType = notification.notificationType || notification.NotificationType;
        const entityId = notification.entityId || notification.EntityId;

        if (notificationType === 'AddPost' || notificationType === 'AddComment') {
          if (entityId) {
            router.push({
              pathname: '/post/[postId]',
              params: { postId: entityId.toString() },
            });
          }
        }
      }
    },
    [router]
  );

  const handleNudgeClose = useCallback(() => {
    // Just close the popup - no API calls
    console.log('Nudge popup closed from notifications list');
    setNudgePopupVisible(false);
    setSelectedNudge(null);
  }, []);

  const renderRightActions = useCallback(
    (progress, dragX, item) => {
      const scale = dragX.interpolate({
        inputRange: [-100, 0],
        outputRange: [1, 0],
        extrapolate: 'clamp',
      });

      const notificationId = item.notificationId || item.NotificationId;

      return (
        <TouchableOpacity
          style={styles.markAsReadAction}
          onPress={() => markAsRead(notificationId)}
        >
          <Animated.View style={{ transform: [{ scale }] }}>
            <Text style={styles.markAsReadText}>Mark as Read</Text>
          </Animated.View>
        </TouchableOpacity>
      );
    },
    [markAsRead]
  );

  const renderItem = useCallback(
    ({ item }) => {
      const relativeTime = getRelativeTime(item?.creationDate);

      const notificationContent = (
        <TouchableOpacity
          style={styles.notificationRow}
          activeOpacity={0.85}
          onPress={() => handleNotificationPress(item)}
        >
          <View style={styles.avatarWrapper}>
            <Image
              source={require('../../assets/images/iconProfile.png')}
              style={styles.avatar}
            />
          </View>
          <View style={styles.notificationContent}>
            <Text style={styles.notificationMessage} numberOfLines={2}>
              {item?.message || 'Notification'}
            </Text>
            <Text style={styles.notificationDate}>{relativeTime}</Text>
          </View>
          {!item?.isRead && <View style={styles.unreadDot} />}
        </TouchableOpacity>
      );

      // Only allow swipe on unread notifications
      if (!item.isRead) {
        return (
          <Swipeable
            renderRightActions={(progress, dragX) => renderRightActions(progress, dragX, item)}
            overshootRight={false}
            friction={2}
          >
            {notificationContent}
          </Swipeable>
        );
      }

      return notificationContent;
    },
    [handleNotificationPress, renderRightActions]
  );

  const listEmptyComponent = useMemo(
    () => (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No notifications yet</Text>
        <Text style={styles.emptyMessage}>We'll let you know when something comes up.</Text>
      </View>
    ),
    []
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Notifications</Text>
        </View>
        <ErrorToast visible={error.visible} message={error.message} onClose={hideError} />
        <LoadingIndicator visible={loading && !refreshing} />
        <FlatList
          data={notifications}
          keyExtractor={(item) => `${item.notificationId || item.NotificationId}`}
          renderItem={renderItem}
          contentContainerStyle={notifications.length === 0 ? styles.listEmpty : styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.purple1}
            />
          }
          ListEmptyComponent={listEmptyComponent}
        />
      </View>

      <NotificationActionModal
        visible={modalVisible}
        notification={selectedNotification}
        onClose={() => {
          setModalVisible(false);
          setSelectedNotification(null);
        }}
        onAction={handleNotificationAction}
      />

      <NudgePopup
        visible={nudgePopupVisible}
        nudge={selectedNudge}
        onClose={handleNudgeClose}
        onSendMessage={null}
        onSendVideo={null}
      />
    </SafeAreaView>
  );
};

export default Notifications;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgColor,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bgColor,
  },
  header: {
    backgroundColor: COLORS.purple1,
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: SIZES.spacingM,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.white,
  },
  listContent: {
    padding: SIZES.spacingM,
    paddingBottom: 120, // Extra padding for floating tab bar
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: SIZES.spacingM,
  },
  notificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: SIZES.spacingM,
    borderRadius: SIZES.cornerRadius16,
    marginBottom: SIZES.spacingS,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  avatarWrapper: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: COLORS.purple0,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.spacingM,
  },
  avatar: {
    width: 28,
    height: 28,
    tintColor: COLORS.purple2,
    resizeMode: 'contain',
  },
  notificationContent: {
    flex: 1,
  },
  notificationMessage: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.titleColor,
    marginBottom: SIZES.spacingXXS,
  },
  notificationDate: {
    fontSize: 12,
    color: COLORS.purple3,
  },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.purple1,
    marginLeft: SIZES.spacingS,
  },
  markAsReadAction: {
    backgroundColor: COLORS.purple1,
    justifyContent: 'center',
    alignItems: 'flex-end',
    paddingHorizontal: SIZES.spacingL,
    marginBottom: SIZES.spacingS,
    borderTopRightRadius: SIZES.cornerRadius16,
    borderBottomRightRadius: SIZES.cornerRadius16,
  },
  markAsReadText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: SIZES.spacingXL,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.titleColor,
    marginBottom: SIZES.spacingS,
  },
  emptyMessage: {
    fontSize: 14,
    color: COLORS.purple3,
    textAlign: 'center',
  },
});
