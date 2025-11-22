import analytics from '@react-native-firebase/analytics';

class AnalyticsService {
  static async initialize() {
    try {
      // Enable analytics collection (enabled by default, but can be controlled)
      await analytics().setAnalyticsCollectionEnabled(true);
      console.log('Firebase Analytics initialized');
    } catch (error) {
      console.error('Failed to initialize Firebase Analytics:', error);
    }
  }

  // Log custom events
  static async logEvent(eventName, params = {}) {
    try {
      await analytics().logEvent(eventName, params);
      console.log(`Analytics event logged: ${eventName}`, params);
    } catch (error) {
      console.error(`Failed to log event ${eventName}:`, error);
    }
  }

  // Log screen view
  static async logScreenView(screenName, screenClass = '') {
    try {
      await analytics().logScreenView({
        screen_name: screenName,
        screen_class: screenClass || screenName,
      });
      console.log(`Screen view logged: ${screenName}`);
    } catch (error) {
      console.error(`Failed to log screen view ${screenName}:`, error);
    }
  }

  // Set user ID for analytics
  static async setUserId(userId) {
    try {
      await analytics().setUserId(userId);
      console.log(`User ID set: ${userId}`);
    } catch (error) {
      console.error('Failed to set user ID:', error);
    }
  }

  // Set user properties
  static async setUserProperty(name, value) {
    try {
      await analytics().setUserProperty(name, value);
      console.log(`User property set: ${name} = ${value}`);
    } catch (error) {
      console.error(`Failed to set user property ${name}:`, error);
    }
  }

  // Log login event
  static async logLogin(method = 'email') {
    try {
      await analytics().logLogin({ method });
      console.log(`Login logged: ${method}`);
    } catch (error) {
      console.error('Failed to log login:', error);
    }
  }

  // Log signup event
  static async logSignUp(method = 'email') {
    try {
      await analytics().logSignUp({ method });
      console.log(`Sign up logged: ${method}`);
    } catch (error) {
      console.error('Failed to log sign up:', error);
    }
  }

  // Log share event
  static async logShare(contentType, itemId, method) {
    try {
      await analytics().logShare({
        content_type: contentType,
        item_id: itemId,
        method: method,
      });
      console.log(`Share logged: ${contentType} - ${itemId}`);
    } catch (error) {
      console.error('Failed to log share:', error);
    }
  }

  // Log app open
  static async logAppOpen() {
    try {
      await analytics().logAppOpen();
      console.log('App open logged');
    } catch (error) {
      console.error('Failed to log app open:', error);
    }
  }

  // Reset analytics data (useful for logout)
  static async resetAnalyticsData() {
    try {
      await analytics().resetAnalyticsData();
      console.log('Analytics data reset');
    } catch (error) {
      console.error('Failed to reset analytics data:', error);
    }
  }
}

export default AnalyticsService;
