import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Image,
  ImageBackground,
  Alert,
  Modal,
} from 'react-native';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SIZES } from '../../constants/theme';
import LoadingIndicator from '../../components/LoadingIndicator';
import ErrorToast from '../../components/ErrorToast';
import FeedPost from '../../components/FeedPost';
import UpgradeToLoginModal from '../../components/UpgradeToLoginModal';
import AddManagerModal from '../../components/AddManagerModal';
import ReportUserModal from '../../components/ReportUserModal';
import ApiService from '../../services/api.service';
import { API_CONFIG } from '../../config/api';

const ACCOUNT_CACHE_KEY = 'profile_cache_account_v1';

export const buildImageUri = (value) => {
  if (!value) return value;
  if (/^https?:/i.test(value)) return value;
  const base = API_CONFIG.BASE_URL.replace(/\/$/, '');
  const suffix = value.startsWith('/') ? value : `/${value}`;
  return `${base}${suffix}`;
};

export const parseMaybeJson = (value) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }
  return value;
};

export const extractList = (payload, key) => {
  const parsed = parseMaybeJson(payload);
  if (!parsed || typeof parsed !== 'object') return [];
  const direct = parsed?.[key] ?? parsed?.[capitalizeFirst(key)];
  const normalized = parseMaybeJson(direct);
  if (Array.isArray(normalized)) return normalized;
  if (normalized && Array.isArray(normalized.$values)) return normalized.$values;
  return [];
};

const parseReminderResponse = (payload) => {
  const parsed = parseMaybeJson(payload);
  if (!parsed) return [];
  if (Array.isArray(parsed)) return parsed;

  const directList = extractList(parsed, 'reminderList');
  if (directList.length > 0) return directList;

  if (parsed.reminderList && Array.isArray(parsed.reminderList.$values)) {
    return parsed.reminderList.$values;
  }

  if (Array.isArray(parsed.data)) {
    return parsed.data;
  }

  if (parsed.data) {
    return parseReminderResponse(parsed.data);
  }

  if (Array.isArray(parsed.Reminders)) {
    return parsed.Reminders;
  }

  if (parsed.Reminders) {
    return parseReminderResponse(parsed.Reminders);
  }

  return [];
};

const extractReminderConnectionId = (reminder) => {
  const value = coalesce(
    reminder?.userConnectionId,
    reminder?.userProfileId,
    reminder?.memberProfileId,
    reminder?.connectionProfileId,
    reminder?.memberUserProfileId
  );

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const capitalizeFirst = (text) => {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
};

export const coalesce = (...values) => {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    } else if (typeof value === 'number') {
      if (!Number.isNaN(value)) {
        return value;
      }
    } else if (typeof value === 'boolean') {
      return value;
    } else if (Array.isArray(value)) {
      if (value.length > 0) {
        return value;
      }
    } else if (typeof value === 'object') {
      return value;
    }
  }
  return undefined;
};

export const normalizeProfilePayload = (payload) => {
  const parsed = parseMaybeJson(payload) || {};
  const responseLayer = parsed?.data ?? parsed?.Data ?? parsed;
  if (!responseLayer || typeof responseLayer !== 'object') {
    return null;
  }

  const profile = responseLayer?.userProfile ?? responseLayer?.UserProfile ?? responseLayer?.profile ?? responseLayer;
  if (!profile || typeof profile !== 'object') {
    return null;
  }

  const normalized = { ...profile };

  normalized.firstName = coalesce(
    profile.firstName,
    profile.FirstName,
    profile.memberFirstName,
    profile.MemberFirstName,
    profile.memberName,
    profile.MemberName
  ) || '';

  normalized.lastName = coalesce(
    profile.lastName,
    profile.LastName,
    profile.memberLastName,
    profile.MemberLastName,
    profile.surname,
    profile.Surname
  ) || '';

  if (!normalized.firstName && !normalized.lastName) {
    const displayName = coalesce(
      profile.fullName,
      profile.FullName,
      profile.displayName,
      profile.DisplayName,
      profile.userName,
      profile.UserName
    );
    if (displayName) {
      const parts = String(displayName).split(/\s+/).filter(Boolean);
      if (parts.length === 0) {
        normalized.firstName = String(displayName);
      } else if (parts.length === 1) {
        normalized.firstName = parts[0];
      } else {
        normalized.firstName = parts.shift();
        normalized.lastName = parts.join(' ');
      }
    }
  }

  normalized.profileImage = coalesce(
    profile.profileImage,
    profile.ProfileImage,
    profile.memberProfileImage,
    profile.MemberProfileImage
  ) || null;

  if (normalized.profileImage) {
    normalized.profileImage = buildImageUri(normalized.profileImage);
  }

  normalized.backGroundImage = coalesce(
    profile.backGroundImage,
    profile.backgroundImage,
    profile.BackgroundImage,
    profile.memberBackgroundImage,
    profile.MemberBackgroundImage
  ) || null;

  if (normalized.backGroundImage) {
    normalized.backGroundImage = buildImageUri(normalized.backGroundImage);
  }

  normalized.aboutMe = coalesce(profile.aboutMe, profile.AboutMe, profile.bio, profile.Bio) || '';

  normalized.email = coalesce(profile.email, profile.Email);
  normalized.middleName = coalesce(profile.middleName, profile.MiddleName) || '';
  normalized.birthdate = coalesce(profile.birthdate, profile.Birthdate, profile.dateOfBirth, profile.DateOfBirth);
  normalized.relationshipTypeId = coalesce(
    profile.relationshipTypeId,
    profile.RelationshipTypeId,
    profile.relationTypeId,
    profile.RelationTypeId,
    profile.relationshipId,
    profile.RelationshipId
  );

  normalized.phoneNumber = coalesce(profile.phoneNumber, profile.PhoneNumber, profile.contactNumber, profile.ContactNumber);
  normalized.city = coalesce(profile.city, profile.City, profile.town, profile.Town);
  normalized.state = coalesce(profile.state, profile.State);
  normalized.country = coalesce(profile.country, profile.Country);
  normalized.occupation = coalesce(profile.occupation, profile.Occupation);
  normalized.occupationTitle = coalesce(profile.occupationTitle, profile.OccupationTitle);

  normalized.isNonAccountHolder = Boolean(
    coalesce(profile.isNonAccountHolder, profile.IsNonAccountHolder, profile.nonAccountHolder, profile.NonAccountHolder)
  );
  normalized.isReported = Boolean(coalesce(profile.isReported, profile.IsReported));
  normalized.hideFlaggedUser = Boolean(coalesce(profile.hideFlaggedUser, profile.HideFlaggedUser));

  normalized.postList = extractList(profile, 'postList').map((post) => {
    const normalizedPost = { ...post };
    const fallbackName = `${normalized.firstName || ''} ${normalized.lastName || ''}`.trim() || undefined;
    normalizedPost.groupPostId = coalesce(post.groupPostId, post.GroupPostId, post.postId, post.PostId, post.id, post.Id);
    normalizedPost.profileImage = (coalesce(post.profileImage, post.ProfileImage, post.authorImage, post.AuthorImage) || null);
    if (normalizedPost.profileImage) {
      normalizedPost.profileImage = buildImageUri(normalizedPost.profileImage);
    }

    const primaryImage = coalesce(post.postImage, post.PostImage, post.thumbnailUrl, post.ThumbnailUrl, post.imageUrl, post.ImageUrl);
    if (primaryImage) {
      normalizedPost.postImage = buildImageUri(primaryImage);
    }

    const mediaList = extractList(post, 'postMediaList').map((media) => {
      const mediaUrl = coalesce(media.url, media.Url, media.mediaUrl, media.MediaUrl, media.imageUrl, media.ImageUrl, media.mediaPath, media.MediaPath);
      const thumbUrl = coalesce(media.resizeImageUrl, media.ResizeImageUrl, media.thumbnailUrl, media.ThumbnailUrl);
      return {
        ...media,
        url: mediaUrl ? buildImageUri(mediaUrl) : undefined,
        resizeImageUrl: thumbUrl ? buildImageUri(thumbUrl) : undefined,
      };
    });
    normalizedPost.postMediaList = mediaList;

    normalizedPost.createdBY = coalesce(post.createdBY, post.createdBy, post.CreatedBy, post.authorName, post.AuthorName, fallbackName) || '';
    normalizedPost.createdDate = coalesce(post.createdDate, post.CreatedDate, post.createdOn, post.CreatedOn, post.postedOn, post.PostedOn);
    normalizedPost.isLiked = Boolean(coalesce(post.isLiked, post.IsLiked));
    normalizedPost.isFavorite = Boolean(coalesce(post.isFavorite, post.IsFavorite, post.isSaved, post.IsSaved));
    normalizedPost.totalLikes = coalesce(post.totalLikes, post.TotalLikes, post.likesCount, post.LikesCount) || 0;
    normalizedPost.commentsCount = coalesce(post.commentsCount, post.CommentsCount, post.totalComments, post.TotalComments) || 0;

    return normalizedPost;
  });
  normalized.uploadedImages = extractList(profile, 'uploadedImages').map((item) => {
    const rawUrl = coalesce(
      item.userImageSrcUrl,
      item.UserImageSrcUrl,
      item.imageUrl,
      item.ImageUrl,
      item.url,
      item.Url
    );
    return {
      ...item,
      userImageSrcUrl: rawUrl ? buildImageUri(rawUrl) : null,
    };
  });
  normalized.uploadedVideos = extractList(profile, 'uploadedVideos').map((item) => {
    const videoUrl = coalesce(item.userVideoSrcUrl, item.UserVideoSrcUrl, item.videoUrl, item.VideoUrl, item.mediaUrl, item.MediaUrl);
    const previewUrl = coalesce(item.userVideoImageUrl, item.UserVideoImageUrl, item.thumbnailUrl, item.ThumbnailUrl);
    return {
      ...item,
      userVideoSrcUrl: videoUrl ? buildImageUri(videoUrl) : undefined,
      userVideoImageUrl: previewUrl ? buildImageUri(previewUrl) : undefined,
    };
  });

  normalized.reminderCount = coalesce(
    profile.reminderCount,
    profile.ReminderCount,
    profile.reminders?.length,
    profile.Reminders?.length,
    profile.reminderList?.length,
    profile.ReminderList?.length
  ) || 0;

  normalized.userProfileId = coalesce(profile.userProfileId, profile.UserProfileId, profile.memberProfileId, profile.MemberProfileId);

  return normalized;
};

const getParamValue = (param) => {
  if (param == null) return null;
  if (Array.isArray(param)) return param[0];
  return param;
};

const toNumberOrNull = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const ProfileActionButton = ({ label, onPress }) => (
  <TouchableOpacity style={styles.actionButton} onPress={onPress} activeOpacity={0.85}>
    <Text style={styles.actionButtonText}>{label}</Text>
  </TouchableOpacity>
);

const UserProfile = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  const profileIdParam = useMemo(() => getParamValue(params?.profileId), [params?.profileId]);
  const contextParam = useMemo(() => getParamValue(params?.context), [params?.context]);
  const profileIdNumber = useMemo(() => toNumberOrNull(profileIdParam), [profileIdParam]);
  const initialViewerParam = useMemo(() => toNumberOrNull(getParamValue(params?.viewerProfileId)), [params?.viewerProfileId]);

  const contextType = useMemo(() => {
    if (contextParam === 'connection') return 'connection';
    if (contextParam === 'circle') return 'circle';
    return 'generic';
  }, [contextParam]);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState({ visible: false, message: '' });
  const [cacheReady, setCacheReady] = useState(false);
  const [initialFetchAttempted, setInitialFetchAttempted] = useState(false);
  const [viewerProfileId, setViewerProfileId] = useState(initialViewerParam);
  const [isSameUser, setIsSameUser] = useState(false);
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const [addManagerModalVisible, setAddManagerModalVisible] = useState(false);
  const [reminderCountState, setReminderCountState] = useState(null);
  const [reportUserModalVisible, setReportUserModalVisible] = useState(false);
  const [reportUserSubmitting, setReportUserSubmitting] = useState(false);

  const hideError = useCallback(() => setError({ visible: false, message: '' }), []);
  const showError = useCallback((message) => setError({ visible: true, message }), []);

  const cacheKey = useMemo(() => {
    if (!profileIdParam) return null;
    return `profile_user_${profileIdParam}`;
  }, [profileIdParam]);

  const fetchReminderSummary = useCallback(async () => {
    if (!profileIdNumber) return;

    try {
      const response = await ApiService.fetchReminders();
      const reminders = parseReminderResponse(response);
      const count = reminders.filter((item) => extractReminderConnectionId(item) === profileIdNumber).length;
      setReminderCountState(count);
    } catch (err) {
      console.error('Failed to load reminder summary', err?.message || err);
    }
  }, [profileIdNumber]);

  useEffect(() => {
    setReminderCountState(null);
    if (profileIdNumber) {
      fetchReminderSummary();
    }
  }, [fetchReminderSummary, profileIdNumber]);

  useEffect(() => {
    if (viewerProfileId != null) return;

    const loadAccount = async () => {
      try {
        const cached = await AsyncStorage.getItem(ACCOUNT_CACHE_KEY);
        if (!cached) return;
        const parsed = JSON.parse(cached);
        const userId = parsed?.userProfileId;
        if (Number.isFinite(userId)) {
          setViewerProfileId(Number(userId));
        }
      } catch (err) {
        console.error('Failed to load viewer profile id', err);
      }
    };

    loadAccount();
  }, [viewerProfileId]);

  const fetchProfile = useCallback(
    async ({ showSpinner } = { showSpinner: true }) => {
      if (!profileIdNumber) return;
      hideError();
      if (showSpinner) setLoading(true);

      try {
        const response = await ApiService.getUserPublicProfile(profileIdNumber);
        const normalizedProfile = normalizeProfilePayload(response);

        if (normalizedProfile) {
          setProfile(normalizedProfile);
          fetchReminderSummary();
          if (cacheKey) {
            await AsyncStorage.setItem(cacheKey, JSON.stringify(normalizedProfile));
          }
        } else {
          showError('Unable to load profile.');
        }
      } catch (err) {
        showError(err?.message || 'Unable to load profile.');
      } finally {
        if (showSpinner) setLoading(false);
        setInitialFetchAttempted(true);
      }
    },
    [cacheKey, fetchReminderSummary, hideError, profileIdNumber, showError]
  );

  useEffect(() => {
    const loadCache = async () => {
      if (!cacheKey) {
        setCacheReady(true);
        return;
      }

      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (cached) {
          const parsed = JSON.parse(cached);
          const normalized = normalizeProfilePayload(parsed);
          if (normalized) {
            setProfile(normalized);
          }
        } else {
          // Cache miss is expected on first load
        }
      } catch (err) {
      } finally {
        setCacheReady(true);
      }
    };

    loadCache();
  }, [cacheKey]);

  useEffect(() => {
    if (!cacheReady || !profileIdNumber || initialFetchAttempted) return;

    fetchProfile();
  }, [cacheReady, fetchProfile, initialFetchAttempted, profileIdNumber]);

  useFocusEffect(
    useCallback(() => {
      if (!profileIdNumber) {
        return;
      }
      // Refresh profile when screen comes into focus (e.g., returning from edit screen)
      fetchProfile({ showSpinner: false });
      fetchReminderSummary();
    }, [fetchProfile, fetchReminderSummary, profileIdNumber])
  );

  useEffect(() => {
    if (!profile) return;
    if (viewerProfileId == null) return;

    const same = viewerProfileId === profile?.userProfileId;
    setIsSameUser(same);
  }, [profile, viewerProfileId]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProfile({ showSpinner: false });
    await fetchReminderSummary();
    setRefreshing(false);
  }, [fetchProfile, fetchReminderSummary]);

  const fullName = useMemo(() => {
    if (!profile) return '';
    return `${profile.firstName || ''} ${profile.lastName || ''}`.trim();
  }, [profile]);

  const posts = Array.isArray(profile?.postList) ? profile.postList : [];
  const isNonAccountHolder = Boolean(profile?.isNonAccountHolder);

  const isConnectionContext = contextType === 'connection';
  const isCircleContext = contextType === 'circle';

  // NEW LOGIC:
  // For CONNECTIONS: if isNonAccountHolder = true → Show Upgrade/Add Manager buttons
  // For CIRCLES: Never show Upgrade/Add Manager buttons
  const showUpgradeAndManager = isConnectionContext && isNonAccountHolder && !isSameUser;

  // Show Edit button for ALL connections (regardless of account status)
  const showEditButton = isConnectionContext;

  const hideForFlagged = Boolean(profile?.hideFlaggedUser) && Boolean(profile?.isReported);

  // Show Report/Block controls:
  // For CONNECTIONS: if isNonAccountHolder = false → Show Report/Block
  // For CIRCLES: Always show Report/Block
  const showReportControls = ((isConnectionContext && !isNonAccountHolder) || isCircleContext) && !isSameUser;

  const reportDisabled = Boolean(profile?.isReported) || reportUserSubmitting;
  const reportLabel = profile?.isReported ? 'Reported User' : reportUserSubmitting ? 'Reporting...' : 'Report User';

  const heroBackgroundSource = profile?.backGroundImage
    ? { uri: buildImageUri(profile.backGroundImage) }
    : require('../../assets/images/groupImage.png');

  const photoCount = profile?.uploadedImages?.length || 0;
  const videoCount = profile?.uploadedVideos?.length || 0;
  const reminderCount = useMemo(() => {
    if (Number.isFinite(reminderCountState)) {
      return reminderCountState;
    }

    const fallback = Number(
      coalesce(
        profile?.reminderCount,
        profile?.reminders?.length,
        profile?.reminderList?.length,
        profile?.ReminderCount,
        profile?.reminderTotal
      ) ?? 0
    );

    return Number.isFinite(fallback) ? fallback : 0;
  }, [profile, reminderCountState]);
  const allowUpload = useMemo(() => {
    if (contextType === 'connection' || contextType === 'circle') return true;
    return isSameUser;
  }, [contextType, isSameUser]);
  const showPostsSection = contextType !== 'connection';

  const handleUpgradePress = useCallback(() => {
    setUpgradeModalVisible(true);
  }, []);

  const handleAddManagerPress = useCallback(() => {
    setAddManagerModalVisible(true);
  }, []);

  const handlePhotoPress = useCallback(() => {
    if (!profileIdNumber) return;
    router.push({
      pathname: '/user/photos',
      params: {
        profileId: profileIdNumber.toString(),
        allowUpload: allowUpload ? '1' : '0',
      },
    });
  }, [allowUpload, profileIdNumber, router]);

  const handleVideoPress = useCallback(() => {
    if (!profileIdNumber) return;
    router.push({
      pathname: '/user/videos',
      params: {
        profileId: profileIdNumber.toString(),
        allowUpload: allowUpload ? '1' : '0',
      },
    });
  }, [allowUpload, profileIdNumber, router]);

  const handleReminderPress = useCallback(() => {
    if (!profileIdNumber) return;

    router.push({
      pathname: '/settings/reminders',
      params: {
        userConnectionId: profileIdNumber.toString(),
        userName: fullName || '',
      },
    });
  }, [fullName, profileIdNumber, router]);

  const handleEditPress = useCallback(() => {
    if (!profileIdNumber || !profile) return;

    // Parse birthdate to YYYY-MM-DD format if it's ISO format
    let formattedBirthdate = profile.birthdate || '';
    if (formattedBirthdate) {
      try {
        // Handle ISO date format (e.g., "2021-05-02T00:00:00")
        if (formattedBirthdate.includes('T')) {
          formattedBirthdate = formattedBirthdate.split('T')[0];
        }
      } catch (e) {
        console.error('Error formatting birthdate:', e);
      }
    }

    // Get relationshipTypeId from multiple possible fields
    const relationshipId = profile.relationshipTypeId || profile.relationTypeId || profile.relationshipId || 0;

    router.push({
      pathname: '/add-connection',
      params: {
        userId: profileIdNumber.toString(),
        isEdit: 'true',
        firstName: profile.firstName || '',
        middleName: profile.middleName || '',
        lastName: profile.lastName || '',
        email: profile.email || '',
        birthdate: formattedBirthdate,
        relationshipTypeId: relationshipId.toString(),
        profileImage: profile.profileImage || '',
        backGroundImage: profile.backGroundImage || '',
         hideEmailField: 'true',
      },
    });
  }, [profileIdNumber, profile, router]);

  const handleReportPress = useCallback(() => {
    if (reportDisabled) return;
    setReportUserModalVisible(true);
  }, [reportDisabled]);

  const handleSubmitUserReport = useCallback(
    async (reason) => {
      const reportedUserId = Number(profile?.userProfileId ?? profileIdNumber);
      if (!Number.isFinite(reportedUserId)) {
        Alert.alert('Whoops', 'Unable to report this user right now.');
        return;
      }

      try {
        setReportUserSubmitting(true);
        const response = await ApiService.reportUser(reportedUserId, reason);
        const success = response?.success ?? false;

        if (success) {
          // Update profile state to mark user as reported
          setProfile((prev) => {
            const updated = prev ? { ...prev, isReported: true } : prev;
            return updated;
          });

          // Also update cache to persist the reported state
          if (cacheKey) {
            const updatedProfile = { ...profile, isReported: true };
            await AsyncStorage.setItem(cacheKey, JSON.stringify(updatedProfile));
          }

          setReportUserModalVisible(false);
          Alert.alert('Report Submitted', 'Thank you for letting us know. We will review this user shortly.');
        } else {
          Alert.alert('Whoops', response?.message || 'Unable to report this user. Please try again.');
        }
      } catch (err) {
        Alert.alert('Whoops', err?.message || 'Unable to report this user. Please try again.');
      } finally {
        setReportUserSubmitting(false);
      }
    },
    [cacheKey, profile, profileIdNumber]
  );

  const handleCloseReportUserModal = useCallback(() => {
    if (reportUserSubmitting) return;
    setReportUserModalVisible(false);
  }, [reportUserSubmitting]);

  const handleBlockPress = useCallback(() => {
    router.push('/settings/user-settings');
  }, [router]);

  const handleClose = useCallback(() => {
    router.back();
  }, [router]);

  const handleUpgradeSuccess = useCallback(() => {
    setUpgradeModalVisible(false);
    fetchProfile({ showSpinner: false });
  }, [fetchProfile]);

  const handleManagerSuccess = useCallback(() => {
    setAddManagerModalVisible(false);
    fetchProfile({ showSpinner: false });
  }, [fetchProfile]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />
        <ErrorToast visible={error.visible} message={error.message} onClose={hideError} />
        <LoadingIndicator visible={loading && !refreshing} />

        {/* Upgrade to Login Modal */}
        <UpgradeToLoginModal
          visible={upgradeModalVisible}
          profileId={profileIdNumber}
          onClose={() => setUpgradeModalVisible(false)}
          onSuccess={handleUpgradeSuccess}
        />

        {/* Add Manager Modal */}
        <AddManagerModal
          visible={addManagerModalVisible}
          profileId={profileIdNumber}
          onClose={() => setAddManagerModalVisible(false)}
          onSuccess={handleManagerSuccess}
        />

        <ReportUserModal
          visible={reportUserModalVisible}
          onClose={handleCloseReportUserModal}
          onSubmit={handleSubmitUserReport}
          loading={reportUserSubmitting}
          userName={fullName || ''}
        />

        {hideForFlagged ? (
          <ScrollView
            style={styles.flaggedScroll}
            contentContainerStyle={styles.flaggedScrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.purple1} />}
            alwaysBounceVertical
          >
            <View style={styles.flaggedContainer}>
              <TouchableOpacity onPress={handleClose} style={styles.flaggedBackButton} activeOpacity={0.7}>
                <Text style={styles.flaggedBackText}>Back</Text>
              </TouchableOpacity>
              <Text style={styles.flaggedTitle}>Whoops</Text>
              <Text style={styles.flaggedCopy}>This profile has been flagged and is currently hidden.</Text>
            </View>
          </ScrollView>
        ) : (
          <View style={styles.profileBody}>
            <View>
              <View style={styles.heroContainer}>
                <ImageBackground source={heroBackgroundSource} style={styles.heroBackground} resizeMode="cover">
                  <View style={styles.heroOverlay}>
                    <TouchableOpacity onPress={handleClose} style={styles.heroBackButton} activeOpacity={0.7}>
                      <Text style={styles.heroBackText}>Back</Text>
                    </TouchableOpacity>

                    <Image
                      source={
                        profile?.profileImage
                          ? { uri: buildImageUri(profile.profileImage) }
                          : require('../../assets/images/iconEmptyProfile.png')
                      }
                      style={styles.heroAvatar}
                      resizeMode="cover"
                    />
                  </View>
                </ImageBackground>
              </View>

              <View style={styles.headerSection}>
                <View style={styles.nameRow}>
                  <Text style={styles.displayName}>{fullName || 'Unknown user'}</Text>
                  {showReportControls ? (
                    <View style={styles.nameActions}>
                      <TouchableOpacity
                        style={[styles.reportButton, reportDisabled && styles.reportButtonDisabled]}
                        onPress={handleReportPress}
                        activeOpacity={reportDisabled ? 1 : 0.85}
                      >
                        <Text style={[styles.reportButtonText, reportDisabled && styles.reportButtonTextDisabled]}>{reportLabel}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.blockButton} onPress={handleBlockPress} activeOpacity={0.85}>
                        <Text style={styles.blockButtonText}>Block</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
                {profile?.aboutMe ? <Text style={styles.bioText}>{profile.aboutMe}</Text> : null}
              </View>

              <View style={styles.stickyActionsWrapper}>
                {showUpgradeAndManager ? (
                  <View style={styles.dualActionRow}>
                    <TouchableOpacity style={styles.fullButton} onPress={handleUpgradePress} activeOpacity={0.85}>
                      <Text style={styles.fullButtonText}>Upgrade to Login</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.fullButton} onPress={handleAddManagerPress} activeOpacity={0.85}>
                      <Text style={styles.fullButtonText}>Add Manager</Text>
                    </TouchableOpacity>
                  </View>
                ) : null}

                <View style={styles.actionRow}>
                  <ProfileActionButton label={`Photo (${photoCount})`} onPress={handlePhotoPress} />
                  <ProfileActionButton label={`Video (${videoCount})`} onPress={handleVideoPress} />
                  <ProfileActionButton label={`Reminder (${reminderCount || 0})`} onPress={handleReminderPress} />
                  {showEditButton && <ProfileActionButton label="Edit" onPress={handleEditPress} />}
                </View>
              </View>
            </View>

            <ScrollView
              style={styles.postsScroll}
              contentContainerStyle={styles.postsScrollContent}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.purple1} />}
              showsVerticalScrollIndicator={false}
              alwaysBounceVertical
            >
              {showPostsSection ? (
                <View style={styles.cardSection}>
                  <Text style={styles.sectionTitle}>Posts</Text>
                  {posts.length === 0 ? (
                    <View style={styles.emptyPostsCard}>
                      <Text style={styles.emptyTitle}>Whoops!</Text>
                      <Text style={styles.emptyCopy}>There are no posts for {fullName || 'this user'} yet.</Text>
                    </View>
                  ) : (
                    posts.map((item) => (
                      <View key={`post-${item.groupPostId ?? item.postId ?? item.id}`} style={styles.feedPostWrapper}>
                        <FeedPost post={item} />
                      </View>
                    ))
                  )}
                </View>
              ) : (
                <View style={styles.emptyPostsPlaceholder}>
                  <Text style={styles.placeholderText}>Posts are hidden in this context.</Text>
                </View>
              )}
            </ScrollView>
          </View>
        )}
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
  profileBody: {
    flex: 1,
  },
  flaggedScroll: {
    flex: 1,
  },
  flaggedScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingTop: SIZES.spacingXL,
    paddingBottom: SIZES.spacingXXL,
  },
  heroContainer: {
    borderBottomLeftRadius: SIZES.cornerRadius16,
    borderBottomRightRadius: SIZES.cornerRadius16,
    overflow: 'hidden',
    marginBottom: SIZES.spacingL,
    backgroundColor: COLORS.purple0,
  },
  heroBackground: {
    width: '100%',
    height: 260,
  },
  heroOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 86, 104, 0.55)',
    paddingHorizontal: SIZES.spacingM,
    paddingTop: SIZES.spacingM,
    paddingBottom: SIZES.spacingL,
    alignItems: 'center',
  },
  heroBackButton: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    paddingHorizontal: SIZES.spacingS,
    paddingVertical: SIZES.spacingXS,
    borderRadius: SIZES.cornerRadius12,
  },
  heroBackText: {
    color: COLORS.white,
    fontWeight: '600',
  },
  heroAvatar: {
    width: 120,
    height: 120,
    borderRadius: 28,
    marginTop: SIZES.spacingM,
    backgroundColor: COLORS.white,
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  headerSection: {
    paddingHorizontal: SIZES.spacingM,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  displayName: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.purple1,
    marginRight: SIZES.spacingS,
  },
  nameActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bioText: {
    marginTop: SIZES.spacingXS,
    fontSize: 14,
    color: COLORS.purple3,
  },
  flaggedContainer: {
    marginHorizontal: SIZES.spacingM,
    marginBottom: SIZES.spacingM,
    paddingVertical: SIZES.spacingL,
    paddingHorizontal: SIZES.spacingM,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.cornerRadius16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    alignItems: 'center',
  },
  flaggedBackButton: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.purple0,
    paddingHorizontal: SIZES.spacingS,
    paddingVertical: SIZES.spacingXS,
    borderRadius: SIZES.cornerRadius12,
    marginBottom: SIZES.spacingS,
  },
  flaggedBackText: {
    color: COLORS.purple2,
    fontWeight: '600',
  },
  flaggedTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.purple1,
    marginBottom: SIZES.spacingS,
  },
  flaggedCopy: {
    fontSize: 14,
    color: COLORS.purple2,
    textAlign: 'center',
  },
  reportButton: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.cornerRadius12,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.purple2,
    marginRight: SIZES.spacingS / 2,
  },
  reportButtonDisabled: {
    backgroundColor: COLORS.purple0,
    borderColor: COLORS.purple0,
  },
  reportButtonText: {
    color: COLORS.purple2,
    fontSize: 14,
    fontWeight: '600',
  },
  reportButtonTextDisabled: {
    color: COLORS.purple2,
    opacity: 0.6,
  },
  blockButton: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.cornerRadius12,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.errorCode,
    marginLeft: SIZES.spacingS / 2,
  },
  blockButtonText: {
    color: COLORS.errorCode,
    fontSize: 14,
    fontWeight: '600',
  },
  dualActionRow: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.spacingM,
    marginBottom: SIZES.spacingS,
    gap: SIZES.spacingS,
  },
  fullButton: {
    flex: 1,
    backgroundColor: COLORS.buttonColor,
    borderRadius: SIZES.cornerRadius12,
    height: SIZES.defaultTextFieldHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fullButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.spacingS,
    marginBottom: 0,
    gap: SIZES.spacingS,
  },
  actionButton: {
    flex: 1,
    backgroundColor: COLORS.buttonColor,
    borderRadius: SIZES.cornerRadius12,
    height: SIZES.defaultTextFieldHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  cardSection: {
    marginBottom: SIZES.spacingL,
    marginTop: SIZES.spacingM,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.cornerRadius16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.purple2,
    marginBottom: SIZES.spacingM,
    padding: SIZES.spacingM,

  },
  emptyPostsCard: {
    alignItems: 'center',
    paddingVertical: SIZES.spacingL,
  },
  emptyTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: COLORS.purple1,
    marginBottom: SIZES.spacingS,
  },
  emptyCopy: {
    fontSize: 14,
    color: COLORS.purple2,
  },
  feedPostWrapper: {
    marginBottom: SIZES.spacingS,
  },
  stickyActionsWrapper: {
    width: '100%',
    paddingVertical: SIZES.spacingS,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 5,
  },
  postsScroll: {
    flex: 1,
  },
  postsScrollContent: {
    paddingBottom: SIZES.spacingXXL,
  },
  emptyPostsPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SIZES.spacingM,
    paddingVertical: SIZES.spacingXL,
  },
  placeholderText: {
    fontSize: 14,
    color: COLORS.purple2,
    textAlign: 'center',
  },
});

export default UserProfile;
