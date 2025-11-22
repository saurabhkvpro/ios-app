import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

// Configure how notifications should be displayed when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

class NotificationService {
  constructor() {
    this.expoPushToken = null;
    this.notificationListener = null;
    this.responseListener = null;
  }

  /**
   * Register for push notifications and get the Expo Push Token
   * @returns {Promise<string|null>} Expo Push Token or null if registration failed
   */
  async registerForPushNotifications() {
    let token = null;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        return null;
      }

      try {
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;

        if (!projectId) {
          console.error('❌ Project ID not found in app.json');
          return null;
        }

        token = await Notifications.getExpoPushTokenAsync({
          projectId,
        });

        this.expoPushToken = token.data;

        return this.expoPushToken;
      } catch (error) {
        console.error('❌ Error getting push token:', error);
        return null;
      }
    } else {
      return null;
    }
  }

  /**
   * Get the current Expo Push Token
   * @returns {string|null} Current token or null
   */
  getToken() {
    return this.expoPushToken;
  }

  /**
   * Set up notification listeners
   * @param {Function} onNotificationReceived - Callback when notification is received (app in foreground)
   * @param {Function} onNotificationResponse - Callback when user taps notification
   */
  setupNotificationListeners(onNotificationReceived, onNotificationResponse) {
    // Listener for notifications received while app is foregrounded
    this.notificationListener = Notifications.addNotificationReceivedListener(
      (notification) => {
        if (onNotificationReceived) {
          onNotificationReceived(notification);
        }
      }
    );

    // Listener for when user taps on a notification
    this.responseListener = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        if (onNotificationResponse) {
          onNotificationResponse(response);
        }
      }
    );
  }

  /**
   * Remove notification listeners (call this on unmount)
   */
  removeNotificationListeners() {
    if (this.notificationListener) {
      this.notificationListener.remove();
      this.notificationListener = null;
    }

    if (this.responseListener) {
      this.responseListener.remove();
      this.responseListener = null;
    }
  }

  /**
   * Schedule a local notification (for testing)
   * @param {Object} notification - Notification object with title, body, and data
   */
  async scheduleLocalNotification(notification) {
    try {
      const id = await Notifications.scheduleNotificationAsync({
        content: {
          title: notification.title || 'Test Notification',
          body: notification.body || 'This is a test notification',
          data: notification.data || {},
        },
        trigger: null, // Show immediately
      });
      return id;
    } catch (error) {
      console.error('❌ Error scheduling local notification:', error);
      return null;
    }
  }

  /**
   * Parse notification data to determine the type and extract relevant info
   * @param {Object} notification - Notification object
   * @returns {Object} Parsed notification data
   */
  parseNotificationData(notification) {
    let data = notification?.request?.content?.data || notification?.data || {};

    // Check if customData is a JSON string and parse it
    if (data.customData && typeof data.customData === 'string') {
      try {
        const parsedCustomData = JSON.parse(data.customData);
        data = { ...data, ...parsedCustomData };
      } catch (error) {
        console.error('❌ Error parsing customData:', error);
      }
    }

    return {
      notificationType: data.notificationType || data.type || data.NotificationType || 'unknown',
      entityId: data.entityId || data.id || data.EntityId || null,
      userId: data.userId || data.user_id || data.UserProfileId || data.userProfileId || data.MemberUserId || null,
      invitationKey: data.invitationKey || data.invitation_key || data.InvitationKey || null,
      groupId: data.groupId || data.group_id || data.GroupId || null,
      notificationId: data.notificationId || data.NotificationId || null,
      entityTable: data.entityTable || data.EntityTable || null,
      senderName: data.senderName || data.SenderName || null,
      message: notification?.request?.content?.body || notification?.body || data.message || data.Message || '',
      title: notification?.request?.content?.title || notification?.title || data.title || data.Title || '',
    };
  }

  /**
   * Get the last notification response (useful for handling cold start)
   * @returns {Promise<Object|null>} Last notification response or null
   */
  async getLastNotificationResponse() {
    try {
      const response = await Notifications.getLastNotificationResponseAsync();
      if (response) {
        return response;
      }
      return null;
    } catch (error) {
      console.error('❌ Error getting last notification response:', error);
      return null;
    }
  }

  /**
   * Clear all notifications
   */
  async clearAllNotifications() {
    try {
      await Notifications.dismissAllNotificationsAsync();
    } catch (error) {
      console.error('❌ Error clearing notifications:', error);
    }
  }

  /**
   * Get notification permissions status
   * @returns {Promise<Object>} Permissions status
   */
  async getPermissionsStatus() {
    try {
      const { status } = await Notifications.getPermissionsAsync();
      return { granted: status === 'granted', status };
    } catch (error) {
      console.error('❌ Error getting permissions status:', error);
      return { granted: false, status: 'undetermined' };
    }
  }
}

export default new NotificationService();
