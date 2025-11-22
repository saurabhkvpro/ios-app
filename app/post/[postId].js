import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import FeedPost from '../../components/FeedPost';
import LoadingIndicator from '../../components/LoadingIndicator';
import ErrorToast from '../../components/ErrorToast';
import ApiService from '../../services/api.service';
import { COLORS, SIZES } from '../../constants/theme';
import ReportPostModal from '../../components/ReportPostModal';
import PostCommentsModal from '../../components/PostCommentsModal';

const parsePostId = (raw) => {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const normalizeMediaList = (images = [], videos = []) => {
  const normalizedImages = images
    .filter(Boolean)
    .map((item) => ({
      ...item,
      url: item?.url || item?.mediaUrl || item?.resizeImageUrl || null,
    }));

  const normalizedVideos = videos
    .filter(Boolean)
    .map((item) => ({
      ...item,
      url: item?.url || item?.mediaUrl || item?.resizeImageUrl || null,
    }));

  return [...normalizedImages, ...normalizedVideos].filter((media) => media.url);
};

const normalizePostDetails = (payload) => {
  if (!payload) return null;

  const container = payload?.data ?? payload;
  const rawPost = container?.postDetails ?? container?.post ?? container;
  if (!rawPost) return null;

  const groupPostId = rawPost.groupPostId ?? rawPost.postId ?? rawPost.id ?? rawPost.entityId;
  if (!groupPostId) return null;

  const mediaList =
    Array.isArray(rawPost.postMediaList) && rawPost.postMediaList.length > 0
      ? rawPost.postMediaList
      : normalizeMediaList(rawPost.groupPostImageList, rawPost.groupPostVideoList);

  return {
    groupId: rawPost.groupId ?? rawPost.userConnectionGroupId ?? rawPost.connectionGroupId ?? 0,
    groupName: rawPost.groupName ?? '',
    groupPostId,
    postTitle: rawPost.postTitle ?? rawPost.title ?? '',
    postBody: rawPost.postBody ?? rawPost.description ?? '',
    createdDate: rawPost.createdDate ?? rawPost.creationDate ?? rawPost.createdOn,
    createdBY: rawPost.createdBY ?? rawPost.publisherName ?? rawPost.postedBy ?? '',
    profileImage: rawPost.profileImage ?? rawPost.publisherPic ?? rawPost.authorImage ?? null,
    postMediaList: mediaList,
    postCommentList: rawPost.postCommentList ?? rawPost.groupPostCommentList ?? [],
    commentsCount: rawPost.commentsCount ?? rawPost.groupPostCommentList?.length ?? rawPost.totalComments ?? 0,
    isLiked: Boolean(rawPost.isLiked),
    isFavorite: Boolean(rawPost.isFavorite ?? rawPost.isFavourite),
    totalLikes: rawPost.totalLikes ?? 0,
    totalFavourite: rawPost.totalFavourite ?? rawPost.totalFavorite ?? 0,
    canFlagPost: rawPost.canFlagPost ?? true,
    isReported: Boolean(rawPost.isReported),
    hashTags: rawPost.hashTags ?? [],
  };
};

const PostDetailScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const postId = useMemo(() => parsePostId(params?.postId), [params?.postId]);

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState({ visible: false, message: '' });
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportingPost, setReportingPost] = useState(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [account, setAccount] = useState(null);

  const hideError = useCallback(() => setError({ visible: false, message: '' }), []);
  const showError = useCallback((message) => setError({ visible: true, message }), []);

  const fetchPostDetails = useCallback(
    async ({ showSpinner } = { showSpinner: true }) => {
      if (!postId) {
        showError('Invalid post identifier.');
        return;
      }

      try {
        if (showSpinner) {
          setLoading(true);
        }
        hideError();
        const response = await ApiService.fetchPostDetails(postId);
        const normalized = normalizePostDetails(response);
        if (normalized) {
          setPost(normalized);
        } else {
          showError('Unable to load post details.');
          setPost(null);
        }
      } catch (err) {
        showError(err?.message || 'Unable to load post details.');
      } finally {
        if (showSpinner) {
          setLoading(false);
        }
      }
    },
    [hideError, postId, showError]
  );

  useEffect(() => {
    fetchPostDetails();
  }, [fetchPostDetails]);

  useEffect(() => {
    const loadAccount = async () => {
      try {
        const response = await ApiService.getUserInfo();
        if (response?.success && response?.data) {
          setAccount(response.data);
        }
      } catch (err) {
      }
    };

    loadAccount();
  }, []);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchPostDetails({ showSpinner: false });
    setRefreshing(false);
  }, [fetchPostDetails]);

  const handleLike = useCallback(async (targetPostId, shouldLike) => {
    try {
      await ApiService.likePost(targetPostId, shouldLike);
    } catch (err) {
      Alert.alert('Whoops', 'Unable to update like status right now.');
    }
  }, []);

  const handleSave = useCallback(async (targetPostId, shouldSave) => {
    try {
      await ApiService.savePost(targetPostId, shouldSave);
    } catch (err) {
      Alert.alert('Whoops', 'Unable to update favorite status right now.');
    }
  }, []);

  const handleReport = useCallback((targetPost) => {
    if (!targetPost) return;
    setReportingPost(targetPost);
    setReportModalVisible(true);
  }, []);

  const handleSubmitReport = useCallback(
    async (reason) => {
      if (!reportingPost) return;

      try {
        setReportSubmitting(true);
        const response = await ApiService.reportPost(reportingPost.groupPostId, reason);
        const success = response?.success ?? false;

        if (success) {
          setPost((prev) => (prev ? { ...prev, isReported: true } : prev));
          Alert.alert('Report Submitted', 'Thank you for letting us know. We will review this post shortly.');
          setReportModalVisible(false);
          setReportingPost(null);
        } else {
          Alert.alert('Whoops', response?.message || 'Unable to report this post. Please try again.');
        }
      } catch (err) {
        Alert.alert('Whoops', err?.message || 'Unable to report this post. Please try again.');
      } finally {
        setReportSubmitting(false);
      }
    },
    [reportingPost]
  );

  const handleCloseReportModal = useCallback(() => {
    if (reportSubmitting) return;
    setReportModalVisible(false);
    setReportingPost(null);
  }, [reportSubmitting]);

  const handleBlock = useCallback(() => {
    router.push('/settings/user-settings');
  }, [router]);

  const commentDisplayName = useMemo(() => {
    if (!account) return '';
    const first = typeof account.firstName === 'string' ? account.firstName.trim() : '';
    const last = typeof account.lastName === 'string' ? account.lastName.trim() : '';
    const combined = [first, last].filter(Boolean).join(' ');
    return combined || account.userName || '';
  }, [account]);

  const handleCommentPress = useCallback(() => {
    if (!postId) return;
    setCommentModalVisible(true);
  }, [postId]);

  const handleCloseComments = useCallback(() => {
    setCommentModalVisible(false);
  }, []);

  const handleCommentAdded = useCallback(
    (targetPostId, comment) => {
      if (!comment || targetPostId !== postId) {
        return;
      }

      setPost((prev) => {
        if (!prev || prev.groupPostId !== targetPostId) {
          return prev;
        }

        const existingList = Array.isArray(prev.postCommentList)
          ? [...prev.postCommentList]
          : [];
        const nextList = [...existingList, comment];
        const baseCount =
          prev.commentsCount ??
          (Array.isArray(prev.postCommentList) ? prev.postCommentList.length : 0);

        return {
          ...prev,
          commentsCount: baseCount + 1,
          postCommentList: nextList,
        };
      });
    },
    [postId]
  );

  const handleCommentsLoaded = useCallback(
    (targetPostId, commentList = []) => {
      if (targetPostId !== postId) {
        return;
      }

      const normalized = Array.isArray(commentList) ? commentList : [];

      setPost((prev) => {
        if (!prev || prev.groupPostId !== targetPostId) {
          return prev;
        }

        return {
          ...prev,
          commentsCount: normalized.length,
          postCommentList: normalized,
        };
      });
    },
    [postId]
  );

  const handleShare = useCallback(async (targetPost) => {
    if (!targetPost) {
      return;
    }

    try {
      const parts = [];
      if (targetPost.postTitle) {
        parts.push(targetPost.postTitle);
      }
      if (targetPost.postBody) {
        parts.push(targetPost.postBody);
      }
      const mediaUrl =
        Array.isArray(targetPost.postMediaList) && targetPost.postMediaList.length > 0
          ? targetPost.postMediaList[0]?.url ||
            targetPost.postMediaList[0]?.resizeImageUrl ||
            targetPost.postMediaList[0]?.mediaUrl
          : null;
      if (mediaUrl) {
        parts.push(mediaUrl);
      }

      const message =
        parts.filter(Boolean).join('\n\n') ||
        'Check out this post on ScrapIt!';

      await Share.share({ message });
    } catch (error) {
      Alert.alert('Whoops', 'Unable to share this post right now.');
    }
  }, []);

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleBack} style={styles.backButton}>
            <Text style={styles.backText}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post Details</Text>
          <View style={styles.backButton} />
        </View>

        <ErrorToast visible={error.visible} message={error.message} onClose={hideError} />
        <LoadingIndicator visible={loading && !refreshing} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.purple1}
            />
          }
        >
          {post ? (
            <FeedPost
              post={post}
              onLike={handleLike}
              onSave={handleSave}
              onReport={handleReport}
              onBlock={handleBlock}
              onComment={handleCommentPress}
              onShare={handleShare}
            />
          ) : !loading ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyTitle}>Post not available</Text>
              <Text style={styles.emptyMessage}>This post may have been removed or is temporarily unavailable.</Text>
            </View>
          ) : null}
        </ScrollView>
        <PostCommentsModal
          visible={commentModalVisible}
          postId={post?.groupPostId ?? postId}
          postTitle={post?.postTitle || ''}
          onClose={handleCloseComments}
          onCommentAdded={handleCommentAdded}
          onCommentsLoaded={handleCommentsLoaded}
          currentUserProfileId={account?.userProfileId}
          currentUserName={(commentDisplayName || 'You').trim() || 'You'}
        />
        <ReportPostModal
          visible={reportModalVisible}
          onClose={handleCloseReportModal}
          onSubmit={handleSubmitReport}
          loading={reportSubmitting}
          postTitle={post?.postTitle || ''}
        />
      </View>
    </SafeAreaView>
  );
};

export default PostDetailScreen;

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.spacingM,
    paddingTop: SIZES.spacingM,
    paddingBottom: SIZES.spacingS,
    backgroundColor: COLORS.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.purple0,
  },
  backButton: {
    paddingVertical: SIZES.spacingS,
    paddingHorizontal: SIZES.spacingS,
  },
  backText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.purple1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.titleColor,
  },
  scrollContent: {
    padding: SIZES.spacingM,
    paddingBottom: SIZES.spacingXXL,
  },
  emptyContainer: {
    paddingVertical: SIZES.spacingXL,
    alignItems: 'center',
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
    paddingHorizontal: SIZES.spacingL,
  },
});
