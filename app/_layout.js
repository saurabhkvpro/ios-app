import 'react-native-get-random-values';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import * as Linking from 'expo-linking';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import NotificationService from '../services/notification.service';
import AnalyticsService from '../services/analytics.service';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationActionModal from '../components/NotificationActionModal';
import NudgePopup from '../components/NudgePopup';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const notificationListener = useRef();
  const responseListener = useRef();
  const [modalVisible, setModalVisible] = useState(false);
  const [modalNotification, setModalNotification] = useState(null);
  const [nudgePopupVisible, setNudgePopupVisible] = useState(false);
  const [selectedNudge, setSelectedNudge] = useState(null);

  useEffect(() => {
    // Hide the native splash screen immediately to show our custom one
    SplashScreen.hideAsync();

    // Initialize Firebase Analytics
    AnalyticsService.initialize();
    AnalyticsService.logAppOpen();

    // Initialize push notifications
    initializePushNotifications();

    // Handle deep links from notifications
    handleInitialURL();

    // Cleanup listeners on unmount
    return () => {
      NotificationService.removeNotificationListeners();
    };
  }, []);

  const initializePushNotifications = async () => {
    try {
      console.log('📱 Initializing push notifications...');

      // Register for push notifications
      const token = await NotificationService.registerForPushNotifications();

      if (token) {
        await AsyncStorage.setItem('expoPushToken', token);
        console.log('✅ Device token registered and saved:', token.substring(0, 30) + '...');
        console.log('💡 Token will be sent to backend on login');
      } else {
        console.warn('⚠️ No device token received');
      }

      // Set up notification listeners
      NotificationService.setupNotificationListeners(
        handleNotificationReceived,
        handleNotificationResponse
      );

      // Check for notifications received when app was closed
      const lastResponse = await NotificationService.getLastNotificationResponse();
      if (lastResponse) {
        handleNotificationResponse(lastResponse);
      }
    } catch (error) {
      console.error('❌ Error initializing push notifications:', error);
    }
  };

  const handleNotificationReceived = () => {
    // Notification is displayed automatically by the system
    // You can add custom logic here if needed
  };

  const handleNotificationResponse = (response) => {
    // Extract notification data from the response
    const notification = response.notification || response;
    const data = NotificationService.parseNotificationData(notification);

    // Handle Nudge notifications (birthday notifications)
    if (data.notificationType === 'Nudge') {
      // Extract nudge data from push notification (backend provides complete data!)
      const title = data.title || 'Happy Birthday';
      const message = data.message || 'Wish you a very happy birthday!';
      const senderName = data.senderName || 'Birthday Person';

      const nudgeData = {
        id: data.entityId,
        title: title,
        body: message,
        memberName: senderName,
        type: 'Birthday',
        memberUserId: data.userId,
      };

      setSelectedNudge(nudgeData);
      setNudgePopupVisible(true);
      return;
    }

    // Handle different notification types
    if (data.notificationType === 'GroupInvitation' || data.notificationType === 'AddGroup') {
      // Create notification object for modal (matching backend format)
      const notificationObj = {
        notificationId: data.notificationId || null,
        entityId: parseInt(data.entityId) || null,
        notificationType: 'AddGroup',
        message: data.message || data.title || 'Group invitation',
        creationDate: new Date().toISOString(),
        senderUserId: data.userId || data.MemberUserId || null,
        invitationKey: data.invitationKey || data.InvitationKey || null,
      };

      setModalNotification(notificationObj);
      setModalVisible(true);
    } else if (data.notificationType === 'AddPost' || data.notificationType === 'AddComment') {
      // Navigate to post details
      if (data.entityId) {
        router.push({
          pathname: '/post/[postId]',
          params: { postId: data.entityId.toString() },
        });
      }
    } else {
    }
  };

  const handleModalAction = (action, notification) => {
    setModalVisible(false);
    setModalNotification(null);
  };

  const handleNudgeClose = () => {
    // Just close the popup - no API calls
    console.log('Nudge popup closed from push notification');
    setNudgePopupVisible(false);
    setSelectedNudge(null);
  };

  const handleInitialURL = async () => {
    // Handle deep links from universal links (for group invitations via email)
    const initialUrl = await Linking.getInitialURL();
    if (initialUrl) {
      handleDeepLink(initialUrl);
    }

    // Listen for deep links while app is open
    Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });
  };

  const handleDeepLink = async (url) => {
    console.log('🔗 Deep link received:', url);

    // Parse URL: https://api-01-dev.azurewebsites.net/GroupInvite?userId=xxx&code=xxx
    // or: https://website-01-dev.azurewebsites.net/ResetPassword?userId=xxx&code=xxx
    try {
      const parsedUrl = Linking.parse(url);
      const { path, queryParams } = parsedUrl;

      console.log('📋 Parsed URL:', { path, queryParams });

      if (path?.toLowerCase().includes('groupinvite')) {
        const userId = queryParams?.userId;
        const invitationKey = queryParams?.code;

        if (userId && invitationKey) {
          // Check if user is authenticated
          const token = await AsyncStorage.getItem('bearerToken');

          if (!token) {
            // Store invitation for after login
            await AsyncStorage.setItem('pendingGroupInvitation', JSON.stringify({
              userId,
              invitationKey,
              timestamp: Date.now(),
            }));

            // Redirect to login
            console.log('🔐 User not authenticated, redirecting to login...');
            router.replace('/(auth)/login');
            return;
          }

          // User is authenticated, navigate to home first then show modal
          console.log('✅ User authenticated, showing group invitation...');

          // Navigate to home first
          try {
            router.replace('/(tabs)/home');
          } catch (navError) {
            console.warn('Navigation to home failed, user might already be there');
          }

          // Create notification object for modal
          const notificationObj = {
            notificationId: null,
            entityId: null, // Will be fetched by modal
            notificationType: 'AddGroup',
            message: 'You have been invited to join a group',
            creationDate: new Date().toISOString(),
            senderUserId: userId,
            invitationKey: invitationKey,
          };

          // Show modal after a short delay to ensure navigation completes
          setTimeout(() => {
            setModalNotification(notificationObj);
            setModalVisible(true);
          }, 500);
        }
      } else if (path?.toLowerCase().includes('login')) {
        // Handle login deep link from email
        console.log('🔐 Login link received, redirecting...');
        const token = await AsyncStorage.getItem('bearerToken');

        if (token) {
          // Already logged in, go to home
          router.replace('/(tabs)/home');
        } else {
          // Not logged in, go to login screen
          router.replace('/(auth)/login');
        }
      } else if (path?.toLowerCase().includes('resetpassword')) {
        const userId = queryParams?.userId;
        const resetKey = queryParams?.code;

        if (userId && resetKey) {
          router.push({
            pathname: '/(auth)/reset-password',
            params: { userId, code: resetKey },
          });
        }
      }
    } catch (error) {
      console.error('❌ Error handling deep link:', error);
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="test-notification" options={{ headerShown: true, title: 'Test Notifications' }} />
      </Stack>

      <NotificationActionModal
        visible={modalVisible}
        notification={modalNotification}
        onClose={() => {
          setModalVisible(false);
          setModalNotification(null);
        }}
        onAction={handleModalAction}
      />

      <NudgePopup
        visible={nudgePopupVisible}
        nudge={selectedNudge}
        onClose={handleNudgeClose}
        onSendMessage={null}
        onSendVideo={null}
      />
    </GestureHandlerRootView>
  );
}
