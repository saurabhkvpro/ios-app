import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_CONFIG } from '../config/api';
import ApiLogger from './api.logger';

const DEFAULT_RELATIONSHIP_TYPES = [
  { relationshipTypeId: 0, relationshipTypeName: '- Select Relationship -' },
  { relationshipTypeId: 1, relationshipTypeName: 'Mother' },
  { relationshipTypeId: 2, relationshipTypeName: 'Father' },
  { relationshipTypeId: 3, relationshipTypeName: 'Daughter' },
  { relationshipTypeId: 4, relationshipTypeName: 'Son' },
  { relationshipTypeId: 5, relationshipTypeName: 'Sister' },
  { relationshipTypeId: 6, relationshipTypeName: 'Brother' },
  { relationshipTypeId: 7, relationshipTypeName: 'Husband' },
  { relationshipTypeId: 8, relationshipTypeName: 'Wife' },
  { relationshipTypeId: 9, relationshipTypeName: 'Grandmother' },
  { relationshipTypeId: 10, relationshipTypeName: 'Grandfather' },
  { relationshipTypeId: 11, relationshipTypeName: 'Cousin' },
  { relationshipTypeId: 12, relationshipTypeName: 'Aunt' },
  { relationshipTypeId: 13, relationshipTypeName: 'Uncle' },
  { relationshipTypeId: 14, relationshipTypeName: 'Niece' },
  { relationshipTypeId: 15, relationshipTypeName: 'Nephew' },
  { relationshipTypeId: 16, relationshipTypeName: 'Personal Friend' },
  { relationshipTypeId: 17, relationshipTypeName: 'Family Friend' },
];

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_CONFIG.BASE_URL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('bearerToken');
        const skipAuth =
          config.url?.includes(API_CONFIG.ENDPOINTS.LOGIN) ||
          config.url?.includes(API_CONFIG.ENDPOINTS.REGISTER);

        if (!skipAuth && token) {
          const normalizedToken = token.replace(/^"|"$/g, '');
          config.headers.Authorization = `Bearer ${normalizedToken}`;
        }

        // Log API request
        const logId = await ApiLogger.logRequest(config, config.retryCount || 0);
        config.logId = logId;

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      async (response) => {
        // Log successful response
        if (response.config?.logId) {
          await ApiLogger.logResponse(response.config.logId, response);
        }
        return response;
      },
      async (error) => {
        // Log error response
        if (error.config?.logId) {
          await ApiLogger.logResponse(error.config.logId, null, error);
        }

        // Enhanced error logging
        const errorInfo = {
          status: error.response?.status,
          statusText: error.response?.statusText,
          message: error.message,
          url: error.config?.url,
          method: error.config?.method?.toUpperCase(),
          data: error.response?.data,
        };

        console.error('API Error:', error.response?.status, error.message);
        console.error('API Error Details:', JSON.stringify(errorInfo, null, 2));

        if (error.response?.data) {
          return Promise.reject(error.response.data);
        }
        return Promise.reject(error);
      }
    );
  }

  // Auth Methods
  async login(userName, password, deviceToken = '') {
    try {
      // Get Expo push token
      const expoPushToken = await AsyncStorage.getItem('expoPushToken');

      console.log('🔐 Login attempt for user:', userName);
      if (expoPushToken) {
        console.log('✅ Sending device token with login:', expoPushToken.substring(0, 30) + '...');
      } else {
        console.warn('⚠️ No device token found in AsyncStorage');
      }

      // Login with device token sent directly
      const response = await this.client.post(API_CONFIG.ENDPOINTS.LOGIN, {
        userName,
        password,
        deviceToken: expoPushToken || '', // Send Expo token directly in login
      });

      if (response.data.success && response.data.data) {
        const rawToken = response.data.data;
        const normalizedToken = typeof rawToken === 'string' ? rawToken.replace(/^"|"$/g, '') : rawToken;
        if (typeof normalizedToken === 'string' && normalizedToken.split('.').length === 3) {
          await AsyncStorage.setItem('bearerToken', normalizedToken);
          console.log('✅ Login successful - bearer token saved');
        }
      }

      return response.data;
    } catch (error) {
      console.error('❌ Login error:', error.message);
      throw error;
    }
  }

  // async saveDeviceToken(deviceToken, signalRConnectionId = '') {
  //   try {
  //     console.log('📤 Attempting to save device token:', {
  //       signalRConnectionId,
  //       deviceToken: deviceToken.substring(0, 30) + '...',
  //     });

  //     // Match Swift app payload structure exactly
  //     const payload = {
  //       signalRConnectionId: signalRConnectionId,
  //       deviceToken: deviceToken,
  //     };

  //     const response = await this.client.post(API_CONFIG.ENDPOINTS.SAVE_DEVICE_TOKEN, payload);

  //     console.log('✅ Device token saved to backend:', response.data);
  //     return response.data;
  //   } catch (error) {
  //     // Enhanced error logging for better debugging
  //     const errorDetails = {
  //       message: error.message,
  //       status: error.response?.status,
  //       statusText: error.response?.statusText,
  //       data: error.response?.data,
  //       url: error.config?.url,
  //       requestPayload: {
  //         signalRConnectionId,
  //         deviceToken: deviceToken?.substring(0, 30) + '...',
  //       },
  //     };
  //     console.error('❌ Error saving device token:', JSON.stringify(errorDetails, null, 2));

  //     // Don't throw error - just log it so login can continue
  //     // The app will work without push notifications registered
  //     return null;
  //   }
  // }

  async register(userData) {
    try {
      const storedDeviceToken = await AsyncStorage.getItem('expoPushToken');
      const normalizedDeviceToken = userData.deviceToken || storedDeviceToken || '';

      const response = await this.client.post(API_CONFIG.ENDPOINTS.REGISTER, {
        email: userData.email,
        userName: userData.userName,
        firstName: userData.firstName,
        lastName: userData.lastName,
        password: userData.password,
        confirmPassword: userData.confirmPassword,
        emailVerified: true,
        dateOfBirth: userData.dateOfBirth,
        deviceToken: normalizedDeviceToken,
      });

      // After successful registration, save token
      if (response.data.success && response.data.data) {
        const rawToken = response.data.data;
        const normalizedToken = typeof rawToken === 'string' ? rawToken.replace(/^"|"$/g, '') : rawToken;
        await AsyncStorage.setItem('bearerToken', normalizedToken);
      }

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async forgotPassword(email) {
    try {
      const response = await this.client.post(
        `${API_CONFIG.ENDPOINTS.FORGOT_PASSWORD}?email=${encodeURIComponent(email)}`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async resetPassword(payload) {
    try {
      const response = await this.client.post(API_CONFIG.ENDPOINTS.RESET_PASSWORD, {
        email: payload.email,
        code: payload.code,
        password: payload.password,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async checkUsernameAvailability(username) {
    try {
      const response = await this.client.get(
        `${API_CONFIG.ENDPOINTS.CHECK_USERNAME}?username=${encodeURIComponent(username)}`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async checkEmailAvailability(email) {
    try {
      const response = await this.client.get(
        `${API_CONFIG.ENDPOINTS.CHECK_EMAIL}?email=${encodeURIComponent(email)}`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async getUserInfo() {
    return await this.retryRequest(() => this.client.get(API_CONFIG.ENDPOINTS.USER_INFO));
  }

  async getAccountInfo() {
    return await this.retryRequest(() => this.client.get(API_CONFIG.ENDPOINTS.USER_INFO));
  }

  async changePassword(payload) {
    try {
      const response = await this.client.post(API_CONFIG.ENDPOINTS.CHANGE_PASSWORD, {
        oldPassword: payload.oldPassword,
        newPassword: payload.newPassword,
        confirmPassword: payload.confirmPassword,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async fetchUserSettings() {
    return await this.retryRequest(() => this.client.get(API_CONFIG.ENDPOINTS.FETCH_USER_SETTINGS));
  }

  async updateUserSettings(payload) {
    try {
      const response = await this.client.post(API_CONFIG.ENDPOINTS.UPDATE_USER_SETTINGS, {
        hideFlaggedUsers: Boolean(payload.hideFlaggedUsers),
        hideFlaggedPosts: Boolean(payload.hideFlaggedPosts),
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async fetchReminders() {
    return await this.retryRequest(() => this.client.get(API_CONFIG.ENDPOINTS.FETCH_REMINDERS));
  }

  async fetchNotifications() {
    return await this.retryRequest(() => this.client.get(API_CONFIG.ENDPOINTS.FETCH_NOTIFICATIONS));
  }

  async markNotificationAsRead(notificationIds) {
    try {
      const ids = Array.isArray(notificationIds) ? notificationIds : [notificationIds];
      const response = await this.client.post(API_CONFIG.ENDPOINTS.MARK_NOTIFICATION_READ, {
        notificaionIds: ids, // Backend expects this exact spelling
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async addReminder(payload) {
    try {
      const response = await this.client.post(API_CONFIG.ENDPOINTS.ADD_REMINDER, {
        title: payload.title,
        notificationDateTime: payload.notificationDateTime,
        userConnectionId: payload.userConnectionId,
        remindEachYear: Boolean(payload.remindEachYear),
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async updateReminder(payload) {
    try {
      const response = await this.client.put(API_CONFIG.ENDPOINTS.UPDATE_REMINDER, {
        id: payload.id,
        title: payload.title,
        notificationDateTime: payload.notificationDateTime,
        userConnectionId: payload.userConnectionId,
        remindEachYear: Boolean(payload.remindEachYear),
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async deleteReminder(reminderId) {
    try {
      const response = await this.client.delete(
        `${API_CONFIG.ENDPOINTS.DELETE_REMINDER}?id=${encodeURIComponent(reminderId)}`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async fetchAllTags() {
    return await this.retryRequest(() => this.client.get(API_CONFIG.ENDPOINTS.FETCH_ALL_TAGS));
  }

  async fetchAllEvents() {
    return await this.retryRequest(() => this.client.get(API_CONFIG.ENDPOINTS.FETCH_ALL_EVENTS));
  }

  async addEvent(payload) {
    try {
      const response = await this.client.post(API_CONFIG.ENDPOINTS.ADD_EVENT, {
        title: payload.title,
        description: payload.description,
        location: payload.location,
        startTime: payload.startTime,
        endTime: payload.endTime,
        firstReminder: payload.firstReminder,
        secondReminder: payload.secondReminder,
        eventType: Number(payload.eventType),
        tags: Array.isArray(payload.tags) ? payload.tags : [],
        visibilityType: Number(payload.visibilityType),
        shareType: Number(payload.shareType),
        shareWithId: Array.isArray(payload.shareWithId) ? payload.shareWithId : [],
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async updateEvent(payload) {
    try {
      const response = await this.client.post(API_CONFIG.ENDPOINTS.UPDATE_EVENT, {
        id: payload.id,
        title: payload.title,
        description: payload.description,
        location: payload.location,
        startTime: payload.startTime,
        endTime: payload.endTime,
        firstReminder: payload.firstReminder,
        secondReminder: payload.secondReminder,
        eventType: Number(payload.eventType),
        tags: Array.isArray(payload.tags) ? payload.tags : [],
        visibilityType: Number(payload.visibilityType),
        shareType: Number(payload.shareType),
        shareWithId: Array.isArray(payload.shareWithId) ? payload.shareWithId : [],
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async deleteEvent(eventId) {
    try {
      const response = await this.client.delete(
        `${API_CONFIG.ENDPOINTS.DELETE_EVENT}?eventId=${encodeURIComponent(eventId)}`
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async deleteAccount() {
    try {
      const response = await this.client.delete(API_CONFIG.ENDPOINTS.DELETE_USER);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Helper function to retry requests that return empty strings (5 total attempts)
  async retryRequest(requestFn, maxAttempts = 5, delayMs = 500) {
    let logId = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        console.log(`🔄 API Request attempt ${attempt}/${maxAttempts}`);

        // Create a wrapper that adds retry count to config
        const requestWithRetryCount = async () => {
          const config = await requestFn.call(this);
          if (config && config.config) {
            config.config.retryCount = attempt - 1;
            logId = config.config.logId;

            // Update retry count in logger
            if (logId && attempt > 1) {
              await ApiLogger.updateRetryCount(logId, attempt - 1);
            }
          }
          return config;
        };

        const response = await requestWithRetryCount();

        // Log this attempt's response
        if (logId) {
          await ApiLogger.logAttempt(logId, attempt, response, null);
        }

        // Check if response.data is valid (not empty string)
        if (response.data && response.data !== '' && typeof response.data === 'object') {
          console.log(`✅ Success on attempt ${attempt}/${maxAttempts}`);
          return response.data;
        }

        console.log(`⚠️ Attempt ${attempt}/${maxAttempts} failed - got empty response`);
      } catch (error) {
        console.log(`⚠️ Attempt ${attempt}/${maxAttempts} error:`, error.message);

        // Log this attempt's error
        if (logId) {
          await ApiLogger.logAttempt(logId, attempt, null, error);
        }
      }

      // Wait before retrying (except on last attempt)
      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    // After 5 failed attempts, return null (will show empty state)
    console.log(`❌ All ${maxAttempts} attempts failed - returning null`);
    return null;
  }

  async getUserProfilePosts() {
    return await this.retryRequest(() => this.client.get(API_CONFIG.ENDPOINTS.USER_PROFILE_POSTS));
  }

  async getUserGroups() {
    return await this.retryRequest(() => this.client.get(API_CONFIG.ENDPOINTS.USER_GROUPS));
  }

  async getCircleList() {
    return await this.retryRequest(() => this.client.get(API_CONFIG.ENDPOINTS.CIRCLE_LIST));
  }

  async getUserPublicProfile(userId) {
    return await this.retryRequest(() =>
      this.client.get(`${API_CONFIG.ENDPOINTS.USER_PUBLIC_PROFILE}?userProfileId=${userId}`)
    );
  }

  async uploadUserImage(userProfileId, asset) {
    if (!userProfileId) {
      throw new Error('User profile id is required');
    }

    const { uri, localUri, mimeType, fileName, type } =
      typeof asset === 'string'
        ? { uri: asset, mimeType: 'image/jpeg', fileName: null }
        : asset || {};

    const resolvedUri = uri || localUri;

    if (!resolvedUri) {
      throw new Error('Image selection failed');
    }

    const formData = new FormData();
    formData.append('UserProfileId', String(userProfileId));
    formData.append('UserImage', {
      uri: resolvedUri,
      name: fileName || `photo_${Date.now()}.jpg`,
      type: mimeType || (type === 'image' ? 'image/jpeg' : 'image/jpeg'),
    });

    const response = await this.client.post(API_CONFIG.ENDPOINTS.UPLOAD_USER_IMAGE, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  async uploadUserVideo(userProfileId, asset, videoCategory = 1) {
    if (!userProfileId) {
      throw new Error('User profile id is required');
    }

    const { uri, localUri, mimeType, fileName, type } =
      typeof asset === 'string'
        ? { uri: asset, mimeType: 'video/mp4', fileName: null }
        : asset || {};

    const resolvedUri = uri || localUri;

    if (!resolvedUri) {
      throw new Error('Video selection failed');
    }

    const formData = new FormData();
    formData.append('UserProfileId', String(userProfileId));
    formData.append('VideoCategory', String(videoCategory)); // 1=None, 2=Birthday, 3=Anniversary
    formData.append('UserVideo', {
      uri: resolvedUri,
      name: fileName || `video_${Date.now()}.mp4`,
      type: mimeType || (type === 'video' ? 'video/mp4' : 'video/mp4'),
    });

    const response = await this.client.post(API_CONFIG.ENDPOINTS.UPLOAD_USER_VIDEO, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  async deleteUserImage(imageId) {
    try {
      if (!imageId) {
        throw new Error('Image ID is required');
      }

      const params = {
        imageId,
      };

      if (API_CONFIG.API_VERSION) {
        params['api-version'] = API_CONFIG.API_VERSION;
      }

      const response = await this.client.post(
        API_CONFIG.ENDPOINTS.DELETE_USER_IMAGE,
        null,
        { params }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async deleteUserVideo(videoId) {
    try {
      if (!videoId) {
        throw new Error('Video ID is required');
      }

      const params = {
        videoId,
      };

      if (API_CONFIG.API_VERSION) {
        params['api-version'] = API_CONFIG.API_VERSION;
      }

      const response = await this.client.post(
        API_CONFIG.ENDPOINTS.DELETE_USER_VIDEO,
        null,
        { params }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async createNonAccountProfile(payload) {
    try {
      const response = await this.client.post(API_CONFIG.ENDPOINTS.CREATE_NON_ACCOUNT_PROFILE, payload);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async clearToken() {
    await AsyncStorage.removeItem('bearerToken');
  }

  async getToken() {
    return await AsyncStorage.getItem('bearerToken');
  }

  async logoutDevice(deviceToken) {
    try {
      const params = {};
      if (deviceToken) {
        params.deviceToken = deviceToken;
      }
      if (API_CONFIG.API_VERSION) {
        params['api-version'] = API_CONFIG.API_VERSION;
      }

      const response = await this.client.post(
        API_CONFIG.ENDPOINTS.LOGOUT_DEVICE,
        null,
        { params }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Post Methods
  async fetchPosts(groupIds = []) {
    const groupIdsParam = groupIds.length > 0 ? groupIds.join(',') : '';

    const params = {
      TakePosts: 50,
      SkipPosts: 0,
    };

    if (groupIdsParam) {
      params.GrpupIds = groupIdsParam;
    }

    return await this.retryRequest(() => this.client.get(API_CONFIG.ENDPOINTS.POSTS, { params }));
  }

  async likePost(postId, isLike) {
    try {
      const params = {
        postId,
        isLike
      };

      if (API_CONFIG.API_VERSION) {
        params['api-version'] = API_CONFIG.API_VERSION;
      }

      const response = await this.client.post(
        API_CONFIG.ENDPOINTS.LIKE_POST,
        null,
        { params }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async savePost(postId, isFavorite) {
    try {
      const params = {
        postId,
        isFavorite,
      };

      if (API_CONFIG.API_VERSION) {
        params['api-version'] = API_CONFIG.API_VERSION;
      }

      const response = await this.client.post(
        API_CONFIG.ENDPOINTS.SAVE_POST,
        null,
        { params }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async fetchPostComments(postId) {
    if (!postId) {
      throw new Error('postId is required to load comments');
    }

    const params = { postId };
    if (API_CONFIG.API_VERSION) {
      params['api-version'] = API_CONFIG.API_VERSION;
    }

    try {
      const response = await this.client.get(API_CONFIG.ENDPOINTS.FETCH_POST_COMMENTS, {
        params,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async savePostComment(postId, userProfileId, commentText) {
    if (!postId) {
      throw new Error('postId is required');
    }
    if (!userProfileId) {
      throw new Error('userProfileId is required');
    }
    if (!commentText || !commentText.trim()) {
      throw new Error('commentText is required');
    }

    const params = {};
    if (API_CONFIG.API_VERSION) {
      params['api-version'] = API_CONFIG.API_VERSION;
    }

    try {
      const payload = {
        postId,
        userProfileId,
        comment: commentText.trim(),
      };

      const response = await this.client.post(
        API_CONFIG.ENDPOINTS.SAVE_POST_COMMENT,
        payload,
        { params }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async reportPost(postId, reason) {
    try {
      const response = await this.client.post(API_CONFIG.ENDPOINTS.REPORT_POST, {
        postId,
        reason,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async reportUser(reportedUserId, reason) {
    try {
      const response = await this.client.post(API_CONFIG.ENDPOINTS.REPORT_USER, {
        reportedUserId,
        reason,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async fetchRelationshipByEmail(email) {
    try {
      const response = await this.client.get(API_CONFIG.ENDPOINTS.FETCH_RELATIONSHIP_BY_EMAIL, {
        params: { memberEmailAddress: email }, // iOS uses memberEmailAddress parameter
      });
      return response.data;
    } catch (error) {
      console.error('❌ Email check failed:', error.response?.data || error.message);
      throw error;
    }
  }

  async fetchCarouselImages() {
    return await this.retryRequest(() =>
      this.client.get(API_CONFIG.ENDPOINTS.CAROUSEL_IMAGES, {
        params: { TakeImages: 20 },
      })
    );
  }

  async fetchGroupDetails(groupId) {
    if (!groupId || groupId <= 0) {
      return null;
    }

    return await this.retryRequest(() =>
      this.client.get(API_CONFIG.ENDPOINTS.GROUP_DETAILS, {
        params: { groupId },
      })
    );
  }

  async likeGroup(groupId, isLike) {
    try {
      const response = await this.client.post(
        API_CONFIG.ENDPOINTS.LIKE_GROUP,
        null,
        {
          params: { groupId, isLike },
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async favoriteGroup(groupId, isFavorite) {
    try {
      const response = await this.client.post(
        API_CONFIG.ENDPOINTS.FAVORITE_GROUP,
        null,
        {
          params: { groupId, isFavorite },
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async uploadGroupImage(groupId, imageUri) {
    if (!groupId || !imageUri) {
      throw new Error('Group id and image are required');
    }

    const formData = new FormData();
    formData.append('GroupId', String(groupId));

    const filename = imageUri.split('/').pop() || `group_${Date.now()}.jpg`;
    const match = /\.(\w+)$/.exec(filename);
    const extension = match ? match[1].toLowerCase() : 'jpg';
    const type = `image/${extension === 'jpg' ? 'jpeg' : extension}`;

    formData.append('ProfileImageMedia', {
      uri: imageUri,
      name: filename,
      type,
    });

    const response = await this.client.post(API_CONFIG.ENDPOINTS.GROUP_IMAGE, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async addGroupMember(groupId, members) {
    if (!groupId) {
      throw new Error('Group id is required');
    }

    const invitedMembers = Array.isArray(members) ? members : [members];

    const response = await this.client.post(
      API_CONFIG.ENDPOINTS.ADD_GROUP_MEMBER,
      {
        groupId,
        invitedMembers,
      }
    );

    return response.data;
  }

  async removeGroupMembership(invitationKey) {
    if (!invitationKey) {
      throw new Error('Invitation key is required');
    }

    try {
      const response = await this.client.post(
        API_CONFIG.ENDPOINTS.GROUP_REMOVE_MEMBER,
        null,
        {
          params: { invitationkey: invitationKey },
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async updateGroupMembership(invitationKey, approved) {
    if (!invitationKey) {
      throw new Error('Invitation key is required');
    }

    try {
      const response = await this.client.post(
        API_CONFIG.ENDPOINTS.GROUP_MEMBERSHIP,
        null,
        {
          params: {
            invitationKey,
            approved,
          },
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async deleteGroup(groupId) {
    try {
      const response = await this.client.post(
        API_CONFIG.ENDPOINTS.DELETE_GROUP,
        null,
        {
          params: { groupId },
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async confirmGroup(memberUserId, invitationkey) {
    try {
      const response = await this.client.get(
        API_CONFIG.ENDPOINTS.CONFIRM_GROUP,
        {
          params: { memberUserId, invitationkey },
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async joiningDecision(memberUserId, invitationkey, isAccepted) {
    try {
      const response = await this.client.post(
        API_CONFIG.ENDPOINTS.GROUP_JOINING_DECISION,
        null,
        {
          params: { memberUserId, invitationkey, isAccepted },
        }
      );
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Group/Member Methods
  async getNonAccountList() {
    return await this.retryRequest(() => this.client.get(API_CONFIG.ENDPOINTS.NON_ACCOUNT_LIST));
  }

  async getRelationshipTypes() {
    const response = await this.retryRequest(() => this.client.get(API_CONFIG.ENDPOINTS.RELATIONSHIP_TYPES));

    if (!response) {
      return DEFAULT_RELATIONSHIP_TYPES;
    }

    const rawList = Array.isArray(response)
      ? response
      : Array.isArray(response?.data)
      ? response.data
      : Array.isArray(response?.data?.data)
      ? response.data.data
      : [];

    if (!rawList.length) {
      return DEFAULT_RELATIONSHIP_TYPES;
    }

    const normalized = rawList
      .map((item) => ({
        relationshipTypeId: Number(item.relationshipTypeId ?? item.id ?? 0),
        relationshipTypeName: item.relationshipTypeName ?? item.name ?? '',
      }))
      .filter((item) => item.relationshipTypeName);

    if (!normalized.length) {
      return DEFAULT_RELATIONSHIP_TYPES;
    }

    const deduped = normalized.filter(
      (item, index, list) => index === list.findIndex((candidate) => candidate.relationshipTypeId === item.relationshipTypeId)
    );

    const merged = [...deduped];
    DEFAULT_RELATIONSHIP_TYPES.forEach((fallback) => {
      if (!merged.some((item) => item.relationshipTypeId === fallback.relationshipTypeId)) {
        merged.push(fallback);
      }
    });

    const sorted = merged.sort((a, b) => a.relationshipTypeId - b.relationshipTypeId);

    return sorted[0]?.relationshipTypeId === 0
      ? sorted
      : [DEFAULT_RELATIONSHIP_TYPES[0], ...sorted];
  }

  async createGroup(groupData) {
    try {
      const response = await this.client.post(API_CONFIG.ENDPOINTS.CREATE_GROUP, groupData);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async createPost(postData) {
    try {
      const formData = new FormData();

      formData.append('GroupIds', postData.GroupIds);
      formData.append('PostTitle', postData.PostTitle);
      formData.append('PostBody', postData.PostBody);
      formData.append('HashTags', postData.HashTags || '');
      formData.append('GMSPlaceId', postData.GMSPlaceId || '');

      if (postData.MediaFile) {
        const imageUri = postData.MediaFile.uri || postData.MediaFile;
        const filename = imageUri.split('/').pop();
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('MediaFile', {
          uri: imageUri,
          name: 'post.jpg',
          type: 'image/jpeg',
        });
      }

      const response = await this.client.post(API_CONFIG.ENDPOINTS.CREATE_POST, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Connection Management Methods
  async getConnectionDetails(profileId) {
    try {
      const response = await this.client.get(`/api/User/GetProfileDetails?id=${profileId}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async updateNonAccountProfile(profileId, payload) {
    try {
      const response = await this.client.post('/api/User/NonAccountProfileCompleted', {
        ...payload,
        userProfileId: profileId,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async upgradeNonAccountToLogin(profileId, email) {
    try {
      const response = await this.client.post('/api/User/RegisterNonAccountUser', {
        memberProfileId: profileId,
        memberEmailId: email,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async addManagerToNonAccount(profileId, email, relationshipTypeId) {
    try {
      const response = await this.client.post('/api/User/AddManagerToNonAccountUser', {
        memberProfileId: profileId,
        managerEmailId: email,
        managerRelationTypeId: relationshipTypeId,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async uploadProfileImage(profileId, imageUri) {
    try {
      const formData = new FormData();
      const filename = imageUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('UserProfileId', String(profileId));
      formData.append('UserImage', {
        uri: imageUri,
        name: `${profileId}.jpg`,
        type: 'image/jpeg',
      });

      const response = await this.client.post('/api/User/UpdateProfileImage', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async uploadBackgroundImage(profileId, imageUri) {
    try {
      const formData = new FormData();
      const filename = imageUri.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : 'image/jpeg';

      formData.append('UserProfileId', String(profileId));
      formData.append('UserImage', {
        uri: imageUri,
        name: `${profileId}.jpg`,
        type: 'image/jpeg',
      });

      const response = await this.client.post('/api/User/UpdateBackgroundImage', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  async fetchNextNudge() {
    return await this.retryRequest(() => {
      const params = {};
      if (API_CONFIG.API_VERSION) {
        params['api-version'] = API_CONFIG.API_VERSION;
      }
      return this.client.get(API_CONFIG.ENDPOINTS.NUDGES_NEXT, { params });
    });
  }

  async fetchBirthdayVideos() {
    return await this.retryRequest(() => {
      const params = {};
      if (API_CONFIG.API_VERSION) {
        params['api-version'] = API_CONFIG.API_VERSION;
      }
      return this.client.get(API_CONFIG.ENDPOINTS.NUDGES_FETCH_BIRTHDAY_VIDEOS, { params });
    });
  }

  async saveNudgeAction(nudgeId, userAction, videoUrl = '') {
    try {
      const params = {};
      if (API_CONFIG.API_VERSION) {
        params['api-version'] = API_CONFIG.API_VERSION;
      }

      const payload = {
        id: nudgeId,
        userAction: userAction, // 1=Dismiss, 2=SendMessage, 3=SendVideo
        videoUrl: videoUrl || '',
      };

      const response = await this.client.post(
        API_CONFIG.ENDPOINTS.NUDGES_SAVE_ACTION,
        payload,
        { params }
      );
      return response.data;
    } catch (error) {
      console.error('Error saving nudge action:', error);
      throw error;
    }
  }

  async saveNudgePreference(frequencyType) {
    try {
      const params = {};
      if (API_CONFIG.API_VERSION) {
        params['api-version'] = API_CONFIG.API_VERSION;
      }

      const payload = {
        freguencyType: frequencyType, // 1=Daily, 2=Weekly, 3=Off (using backend's spelling)
      };

      const response = await this.client.post(
        API_CONFIG.ENDPOINTS.NUDGES_SAVE_PREFERENCE,
        payload,
        { params }
      );
      return response.data;
    } catch (error) {
      console.error('Error saving nudge preference:', error);
      throw error;
    }
  }
}

export default new ApiService();
