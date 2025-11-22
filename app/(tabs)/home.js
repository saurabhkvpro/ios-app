import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  StatusBar,
  TouchableOpacity,
  Image,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  BackHandler,
  Share,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SIZES } from '../../constants/theme';
import ApiService from '../../services/api.service';
import FeedPost from '../../components/FeedPost';
import { useHome } from '../../context/HomeContext';
import ImageCarousel from '../../components/ImageCarousel';
import LeftDrawer from '../../components/LeftDrawer';
import GroupDetailsHeader from '../../components/GroupDetailsHeader';
import AddMember from '../../components/AddMember';
import ReportPostModal from '../../components/ReportPostModal';
import PostCommentsModal from '../../components/PostCommentsModal';
import NotificationActionModal from '../../components/NotificationActionModal';
import BirthdayAnimation from '../../components/BirthdayAnimation';
import NudgePopup from '../../components/NudgePopup';

const normalizeGroupDetails = (rawGroup) => {
  if (!rawGroup) return null;

  const totalLikes = Number(rawGroup.totalLikes ?? 0);
  const totalFavourite = Number(rawGroup.totalFavourite ?? rawGroup.totalFavorite ?? 0);

  return {
    ...rawGroup,
    groupId: rawGroup.groupId,
    groupName: rawGroup.groupName,
    groupImage: rawGroup.groupImage,
    createdById: rawGroup.createdById,
    createdBy: rawGroup.createdBy,
    totalLikes: Number.isFinite(totalLikes) ? totalLikes : 0,
    totalFavourite: Number.isFinite(totalFavourite) ? totalFavourite : 0,
    isLiked: Boolean(rawGroup.isLiked),
    isFavorite: Boolean(rawGroup.isFavorite ?? rawGroup.isFavourite),
    groupBackgroundImage: rawGroup.groupBackgroundImage || rawGroup.groupImage || '',
    groupUserList: Array.isArray(rawGroup.groupUserList) ? rawGroup.groupUserList : [],
    acceptedDate: rawGroup.acceptedDate || '',
    rejectedDate: rawGroup.rejectedDate || '',
    invitationKey: rawGroup.invitationKey || '',
  };
};

const normalizeCreatedGroupListItem = (groupPayload, fallback = {}) => {
  if (!groupPayload || typeof groupPayload !== 'object') {
    const fallbackId = Number(fallback?.groupId ?? fallback?.id);
    const hasValidId = Number.isFinite(fallbackId) && fallbackId > 0;
    return hasValidId
      ? {
        groupId: fallbackId,
        groupName: fallback.groupName || '',
        groupImage: fallback.groupImage || '',
        lastActivity: fallback.lastActivity || '',
        acceptedDate: fallback.acceptedDate || '',
        rejectedDate: fallback.rejectedDate || '',
        invitationKey: fallback.invitationKey || '',
        createdById: fallback.createdById ?? null,
        isFavorite: Boolean(fallback.isFavorite),
        isLiked: Boolean(fallback.isLiked),
      }
      : null;
  }

  const candidateId = Number(
    groupPayload.groupId ??
    groupPayload.userConnectionGroupId ??
    groupPayload.id ??
    fallback.groupId ??
    fallback.id
  );

  if (!Number.isFinite(candidateId) || candidateId <= 0) {
    return null;
  }

  return {
    groupId: candidateId,
    groupName: groupPayload.groupName ?? groupPayload.name ?? fallback.groupName ?? '',
    groupImage:
      groupPayload.groupImage ??
      groupPayload.groupPhoto ??
      groupPayload.groupPicture ??
      fallback.groupImage ??
      '',
    lastActivity: groupPayload.lastActivity ?? fallback.lastActivity ?? '',
    acceptedDate: groupPayload.acceptedDate ?? fallback.acceptedDate ?? '',
    rejectedDate: groupPayload.rejectedDate ?? fallback.rejectedDate ?? '',
    invitationKey: groupPayload.invitationKey ?? fallback.invitationKey ?? '',
    createdById:
      groupPayload.createdById ??
      groupPayload.groupAdminId ??
      groupPayload.createdByUserProfileId ??
      fallback.createdById ??
      null,
    isFavorite: Boolean(
      groupPayload.isFavorite ?? groupPayload.isFavourite ?? fallback.isFavorite
    ),
    isLiked: Boolean(groupPayload.isLiked ?? fallback.isLiked),
    groupImageThumbnail:
      groupPayload.groupImageThumbnail ?? fallback.groupImageThumbnail ?? '',
  };
};

const parseNumericParam = (param) => {
  const value = Array.isArray(param) ? param[0] : param;
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export default function Home() {
  const { selectedGroupId, setSelectedGroupId, setHandleSelectGroup } = useHome();
  const router = useRouter();
  const params = useLocalSearchParams();
  const initialGroupParam = useMemo(
    () => parseNumericParam(params?.groupId ?? params?.selectedGroupId),
    [params?.groupId, params?.selectedGroupId]
  );
  const [posts, setPosts] = useState([]);
  const [carouselImages, setCarouselImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [drawerVisible, setDrawerVisible] = useState(false);
  const [account, setAccount] = useState(null);
  const [groupInfo, setGroupInfo] = useState(null);
  const [groupLoading, setGroupLoading] = useState(false);
  const [groupActionLoading, setGroupActionLoading] = useState(false);
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportingPost, setReportingPost] = useState(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [commentModalVisible, setCommentModalVisible] = useState(false);
  const [activeCommentPost, setActiveCommentPost] = useState(null);
  const [groupInvitationModalVisible, setGroupInvitationModalVisible] = useState(false);
  const [groupInvitationData, setGroupInvitationData] = useState(null);
  const handledGroupParamRef = useRef(null);
  const flatListRef = useRef(null);
  const [nudgeData, setNudgeData] = useState(null);
  const [showBirthdayAnimation, setShowBirthdayAnimation] = useState(false);
  const [showNudgePopup, setShowNudgePopup] = useState(false);

  useEffect(() => {
    fetchInitialData();
    checkForPendingInvitation();
    checkAndFetchNudge();
  }, []);

  // Check if nudge was already shown in this session
  const checkAndFetchNudge = async () => {
    try {
      const nudgeShown = await AsyncStorage.getItem('nudgeShownThisSession');
      if (!nudgeShown) {
        // First time this session - fetch and show nudge
        await fetchNudgeData();
        // Mark as shown for this session
        await AsyncStorage.setItem('nudgeShownThisSession', 'true');
      }
    } catch (error) {
      console.error('Error checking nudge session:', error);
    }
  };

  const fetchNudgeData = async () => {
    try {
      // Reset states before fetching new data
      setShowBirthdayAnimation(false);
      setShowNudgePopup(false);
      setNudgeData(null);

      const response = await ApiService.fetchNextNudge();

      if (response?.success && response?.data && response.data.length > 0) {
        // Sort nudges by score in descending order (highest score first)
        const sortedNudges = [...response.data].sort((a, b) => {
          const scoreA = Number(a.score) || 0;
          const scoreB = Number(b.score) || 0;
          return scoreB - scoreA; // Descending order
        });

        console.log(`🎯 Found ${sortedNudges.length} nudges, sorted by score`);
        sortedNudges.forEach((nudge, index) => {
          console.log(`  ${index + 1}. ${nudge.memberName} - Score: ${nudge.score}`);
        });

        // Take the nudge with highest score
        const nudge = sortedNudges[0];
        console.log(`🏆 Showing highest score nudge: ${nudge.memberName} (Score: ${nudge.score})`);

        setNudgeData(nudge);

        // Show birthday animation if nudge type is Birthday
        if (nudge.type === 'Birthday') {
          setShowBirthdayAnimation(true);

          // Show popup after a short delay to let animation start
          setTimeout(() => {
            setShowNudgePopup(true);
          }, 800);
        } else {
          // For other nudge types, show popup immediately
          setShowNudgePopup(true);
        }
      }
    } catch (error) {
      console.error('Error fetching nudge:', error);
    }
  };

  const checkForPendingInvitation = async () => {
    try {
      const activeInvitation = await AsyncStorage.getItem('activeGroupInvitation');

      if (activeInvitation) {
        // Clear it immediately
        await AsyncStorage.removeItem('activeGroupInvitation');

        const { userId, invitationKey, groupDetails } = JSON.parse(activeInvitation);

        console.log('📧 Active group invitation found:', { userId, invitationKey, groupDetails });

        // Create notification object for modal with actual group details
        const notificationObj = {
          notificationId: null,
          entityId: groupDetails?.groupId || null,
          notificationType: 'AddGroup',
          message: groupDetails?.message || 'You have been invited to join a group',
          creationDate: groupDetails?.createdDate || new Date().toISOString(),
          senderUserId: userId,
          invitationKey: invitationKey,
          // Pass through all group details for the modal
          groupDetails: groupDetails,
        };

        setGroupInvitationData(notificationObj);
        setGroupInvitationModalVisible(true);
      }
    } catch (error) {
      console.error('❌ Error checking for pending invitation:', error);
    }
  };

  // Handle Android back button - go to All Groups if on specific group
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (selectedGroupId > 0) {
          handleSelectGroup(-1);
          return true;
        }
        return false;
      };

      const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);

      return () => subscription.remove();
    }, [selectedGroupId, handleSelectGroup])
  );

  // Refresh posts when screen comes into focus (e.g., after creating a post)
  const isFirstRender = useRef(true);
  useFocusEffect(
    useCallback(() => {
      // Skip the first render (initial mount)
      if (isFirstRender.current) {
        isFirstRender.current = false;
        return;
      }

      // Refresh posts when returning to this screen
      if (!loading) {
        if (selectedGroupId === -1) {
          fetchPosts(-1);
          fetchCarouselImages(-1);
        } else if (selectedGroupId > 0) {
          // fetchGroupDetails now fetches full post details
          fetchGroupDetails(selectedGroupId);
        }
      }
    }, [selectedGroupId, loading])
  );

  useEffect(() => {
    if (loading) return;

    if (selectedGroupId === -1) {
      loadAllGroupsFeed();
    } else {
      loadGroupFeed(selectedGroupId);
    }

    // Scroll to top when group changes
    if (flatListRef.current && posts.length > 0) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  }, [selectedGroupId]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      await Promise.all([
        fetchUserInfo(),
        fetchCarouselImages(),
        fetchPosts(),
      ]);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserInfo = async () => {
    let accountData = null;
    try {
      const response = await ApiService.getUserInfo();
      if (response?.success && response?.data) {
        setAccount(response.data);
        accountData = response.data;
      } else {
        setAccount(null);
        accountData = null;
      }
    } catch (error) {
      console.error('Error fetching user info:', error);
      setAccount(null);
      accountData = null;
    }
    return accountData;
  };

  const fetchCarouselImages = async (targetGroupId = selectedGroupId) => {
    if (targetGroupId !== -1) return;

    try {
      const response = await ApiService.fetchCarouselImages();
      if (response?.success && response?.data) {
        setCarouselImages(response.data.mediaList || []);
      } else {
        setCarouselImages([]);
      }
    } catch (error) {
      console.error('Error fetching carousel images:', error);
      setCarouselImages([]);
    }
  };

  const fetchPosts = async (targetGroupId = selectedGroupId) => {
    try {
      // Send specific groupId to filter posts, or empty array for all posts
      const groupIds = targetGroupId > 0 ? [targetGroupId] : [];
      const response = await ApiService.fetchPosts(groupIds);

      if (response?.success && response?.data) {
        const postList = response.data.postList || [];
        setPosts(postList);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
      setPosts([]);
    }
  };

  const fetchGroupDetails = async (groupId) => {
    if (!groupId || groupId <= 0) {
      setGroupInfo(null);
      return;
    }

    try {
      const response = await ApiService.fetchGroupDetails(groupId);

      if (response?.success && response?.data) {
        const groupData = response.data;
        setGroupInfo(normalizeGroupDetails(groupData));

        // Backend now returns complete post data with postImage in groupPostList
        if (groupData.groupPostList && Array.isArray(groupData.groupPostList)) {
          // Transform posts to match FeedPost component expectations
          const transformedPosts = groupData.groupPostList.map(post => ({
            ...post,
            groupPostId: post.postId || post.groupPostId,
            postTitle: post.postTitle,
            postBody: post.postBody,
            createdBY: post.createdBY,
            createdDate: post.createdDate,
            profileImage: post.profileImage,
            hashTags: post.hashTags || [],
            tagMemerProfileIds: post.tagMemerProfileIds || [],
            commentsCount: post.commentsCount || 0,
            totalLikes: post.totalLikes || 0,
            totalFavorites: post.totalFavorites || 0,
            isLiked: post.isLiked || false,
            isFavorite: post.isFavorite || false,
            isReported: post.isReported || false,
            canFlagPost: post.canFlagPost || false,
            // Transform postImage to postMediaList format for FeedPost component
            postMediaList: post.postImage ? [{
              userProfileId: post.userProfileId || groupData.createdById,
              url: post.postImage,
              key: post.postImage.split('/').pop(),
              type: 'Image',
              createDate: post.createdDate
            }] : [],
            // Add group information
            groupId: groupData.groupId,
            groupName: groupData.groupName,
            groupMainImage: groupData.groupImage,
          }));

          setPosts(transformedPosts);
        } else {
          setPosts([]);
        }
      } else {
        setGroupInfo(null);
        setPosts([]);
      }
    } catch (error) {
      console.error('Error fetching group details:', error);
      setGroupInfo(null);
      setPosts([]);
    }
  };

  const loadAllGroupsFeed = async () => {
    setGroupInfo(null);
    setGroupLoading(true);
    setPosts([]);
    try {
      await Promise.all([fetchCarouselImages(-1), fetchPosts(-1)]);
    } catch (error) {
      console.error('Error loading all groups feed:', error);
    } finally {
      setGroupLoading(false);
    }
  };

  const loadGroupFeed = async (groupId) => {
    if (!groupId || groupId <= 0) {
      return;
    }

    setGroupLoading(true);
    setPosts([]);
    try {
      // fetchGroupDetails now fetches full post details for each post
      await fetchGroupDetails(groupId);
    } catch (error) {
      console.error('Error loading group feed:', error);
    } finally {
      setGroupLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchUserInfo();
      if (selectedGroupId === -1) {
        await Promise.all([fetchCarouselImages(-1), fetchPosts(-1)]);
      } else {
        // fetchGroupDetails now fetches full post details
        await fetchGroupDetails(selectedGroupId);
      }
    } catch (error) {
      console.error('Error refreshing feed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!initialGroupParam || initialGroupParam <= 0) {
      handledGroupParamRef.current = null;
      return;
    }

    if (handledGroupParamRef.current === initialGroupParam) {
      return;
    }

    handledGroupParamRef.current = initialGroupParam;

    setInviteModalVisible(false);
    setGroupInfo(null);
    setPosts([]);
    setGroupLoading(true);
    setSelectedGroupId(initialGroupParam);
  }, [initialGroupParam]);

  const handleLike = async (postId, isLike) => {
    try {
      await ApiService.likePost(postId, isLike);
    } catch (error) {
      console.error('Error liking post:', error);
    }
  };

  const handleSave = async (postId, isFavorite) => {
    try {
      await ApiService.savePost(postId, isFavorite);
    } catch (error) {
      console.error('Error saving post:', error);
    }
  };

  const handleReport = useCallback((targetPost) => {
    if (!targetPost) {
      return;
    }
    setReportingPost(targetPost);
    setReportModalVisible(true);
  }, []);

  const handleCommentPress = useCallback(
    (targetPostId) => {
      if (!targetPostId) return;
      const targetPost =
        posts.find((item) => item.groupPostId === targetPostId) || null;
      setActiveCommentPost(
        targetPost || {
          groupPostId: targetPostId,
        }
      );
      setCommentModalVisible(true);
    },
    [posts]
  );

  const handleCloseComments = useCallback(() => {
    setCommentModalVisible(false);
    setActiveCommentPost(null);
  }, []);

  const handleCommentAdded = useCallback((targetPostId, comment) => {
    if (!targetPostId || !comment) return;

    setPosts((prev) =>
      prev.map((item) => {
        if (item.groupPostId !== targetPostId) {
          return item;
        }

        const existingList = Array.isArray(item.postCommentList)
          ? [...item.postCommentList]
          : [];
        const nextList = [...existingList, comment];
        const baseCount =
          item.commentsCount ??
          (Array.isArray(item.postCommentList) ? item.postCommentList.length : 0);

        return {
          ...item,
          commentsCount: baseCount + 1,
          postCommentList: nextList,
        };
      })
    );

    setActiveCommentPost((prev) => {
      if (!prev || prev.groupPostId !== targetPostId) {
        return prev;
      }
      const existingList = Array.isArray(prev.postCommentList)
        ? [...prev.postCommentList, comment]
        : [comment];
      const baseCount =
        prev.commentsCount ??
        (Array.isArray(prev.postCommentList)
          ? prev.postCommentList.length
          : 0);

      return {
        ...prev,
        commentsCount: baseCount + 1,
        postCommentList: existingList,
      };
    });
  }, []);

  const handleCommentsLoaded = useCallback((targetPostId, commentList = []) => {
    setPosts((prev) =>
      prev.map((item) => {
        if (item.groupPostId !== targetPostId) {
          return item;
        }
        return {
          ...item,
          commentsCount: Array.isArray(commentList) ? commentList.length : 0,
          postCommentList: Array.isArray(commentList) ? commentList : [],
        };
      })
    );

    setActiveCommentPost((prev) => {
      if (!prev || prev.groupPostId !== targetPostId) {
        return prev;
      }
      return {
        ...prev,
        commentsCount: Array.isArray(commentList) ? commentList.length : 0,
        postCommentList: Array.isArray(commentList) ? commentList : [],
      };
    });
  }, []);

  const handleShare = useCallback(async (post) => {
    if (!post) {
      return;
    }

    try {
      const parts = [];
      if (post.postTitle) {
        parts.push(post.postTitle);
      }
      if (post.postBody) {
        parts.push(post.postBody);
      }
      const mediaUrl =
        Array.isArray(post.postMediaList) && post.postMediaList.length > 0
          ? post.postMediaList[0]?.url ||
            post.postMediaList[0]?.resizeImageUrl ||
            post.postMediaList[0]?.mediaUrl
          : null;
      if (mediaUrl) {
        parts.push(mediaUrl);
      }

      const message =
        parts.filter(Boolean).join('\n\n') ||
        'Check out this post on ScrapIt!';

      await Share.share({ message });
    } catch (error) {
      console.error('⚠️ Share error:', error);
      Alert.alert('Whoops', 'Unable to share this post right now.');
    }
  }, []);

  const handleSubmitReport = useCallback(
    async (reason) => {
      if (!reportingPost) return;

      try {
        setReportSubmitting(true);
        const response = await ApiService.reportPost(reportingPost.groupPostId, reason);
        const success = response?.success ?? false;

        if (success) {
          setPosts((prev) =>
            prev.map((item) =>
              item.groupPostId === reportingPost.groupPostId
                ? { ...item, isReported: true }
                : item
            )
          );
          Alert.alert('Report Submitted', 'Thank you for letting us know. We will review this post shortly.');
          setReportModalVisible(false);
          setReportingPost(null);
        } else {
          Alert.alert('Whoops', response?.message || 'Unable to report this post. Please try again.');
        }
      } catch (error) {
        console.error('Report post error', error);
        Alert.alert('Whoops', error?.message || 'Unable to report this post. Please try again.');
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

  const handleGroupLikeToggle = async (shouldLike) => {
    if (!groupInfo) return;

    setGroupInfo((prev) => {
      if (!prev) return prev;
      const delta = shouldLike ? 1 : -1;
      const nextLikes = Math.max(0, (prev.totalLikes || 0) + delta);
      return {
        ...prev,
        isLiked: shouldLike,
        totalLikes: nextLikes,
      };
    });

    try {
      await ApiService.likeGroup(groupInfo.groupId, shouldLike);

      // Refresh user info to update groups list in left drawer
      await fetchUserInfo();
    } catch (error) {
      console.error('Error updating group like status:', error);
      // Revert optimistic update
      setGroupInfo((prev) => {
        if (!prev) return prev;
        const delta = shouldLike ? -1 : 1;
        const nextLikes = Math.max(0, (prev.totalLikes || 0) + delta);
        return {
          ...prev,
          isLiked: !shouldLike,
          totalLikes: nextLikes,
        };
      });
    }
  };

  const handleGroupFavoriteToggle = async (shouldFavorite) => {
    if (!groupInfo) return;

    setGroupInfo((prev) => {
      if (!prev) return prev;
      const delta = shouldFavorite ? 1 : -1;
      const nextFavorites = Math.max(0, (prev.totalFavourite || 0) + delta);
      return {
        ...prev,
        isFavorite: shouldFavorite,
        totalFavourite: nextFavorites,
      };
    });

    try {
      await ApiService.favoriteGroup(groupInfo.groupId, shouldFavorite);

      // Refresh user info to update groups list in left drawer
      await fetchUserInfo();
    } catch (error) {
      console.error('Error updating group favorite status:', error);
      setGroupInfo((prev) => {
        if (!prev) return prev;
        const delta = shouldFavorite ? -1 : 1;
        const nextFavorites = Math.max(0, (prev.totalFavourite || 0) + delta);
        return {
          ...prev,
          isFavorite: !shouldFavorite,
          totalFavourite: nextFavorites,
        };
      });
    }
  };

  const resolveInvitationKey = (groupId) => {
    if (groupInfo?.groupId === groupId && groupInfo?.invitationKey) {
      return groupInfo.invitationKey;
    }
    const fallbackGroup = account?.userGroups?.userGroupList?.find((g) => g.groupId === groupId);
    return fallbackGroup?.invitationKey || '';
  };

  const handleGroupPrimaryAction = ({ primaryLabel }) => {
    if (!groupInfo) return;

    const performPrimaryAction = async () => {
      try {
        setGroupActionLoading(true);
        setInviteModalVisible(false);

        if (primaryLabel === 'Delete') {
          await ApiService.deleteGroup(groupInfo.groupId);
          await fetchUserInfo();
          setGroupInfo(null);
          setPosts([]);
          setGroupLoading(true);
          setSelectedGroupId(-1);
          return;
        }

        const invitationKey = resolveInvitationKey(groupInfo.groupId);
        if (!invitationKey) {
          Alert.alert('Whoops', 'Unable to update this group right now. Please try again later.');
          return;
        }

        if (primaryLabel === 'Leave') {
          const removeResponse = await ApiService.removeGroupMembership(invitationKey);
          const removePayload = removeResponse ?? {};
          const removeSuccess = removePayload.success ?? removePayload.Success ?? false;
          if (!removeSuccess) {
            const message =
              removePayload.message ||
              removePayload.Message ||
              removePayload.ResponseMessage ||
              'Unable to leave this group right now. Please try again later.';
            throw new Error(message);
          }
        } else {
          const approveRequest = primaryLabel === 'Join';
          const updateResponse = await ApiService.updateGroupMembership(invitationKey, approveRequest);

          const responsePayload = updateResponse ?? {};
          const responseSuccess = responsePayload.success ?? responsePayload.Success ?? false;
          if (!responseSuccess) {
            const message =
              responsePayload.message ||
              responsePayload.Message ||
              responsePayload.ResponseMessage ||
              'Unable to update this group right now. Please try again later.';
            throw new Error(message);
          }
        }

        setGroupLoading(true);
        try {
          await Promise.all([
            fetchGroupDetails(groupInfo.groupId),
            fetchUserInfo(),
          ]);
        } finally {
          setGroupLoading(false);
        }
      } catch (error) {
        console.error('Error performing group action:', error);
        Alert.alert('Whoops', error?.message || 'Something went wrong. Please try again.');
      } finally {
        setGroupActionLoading(false);
      }
    };

    if (primaryLabel === 'Delete') {
      Alert.alert(
        'Delete Group?',
        'This will permanently remove the group for all members.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: () => performPrimaryAction() },
        ]
      );
      return;
    }

    if (primaryLabel === 'Leave') {
      Alert.alert(
        'Leave Group?',
        'You will no longer have access to this group or its posts.',
        [
          { text: 'Stay', style: 'cancel' },
          { text: 'Leave', style: 'destructive', onPress: () => performPrimaryAction() },
        ]
      );
      return;
    }

    performPrimaryAction();
  };

  const handleChangeGroupImage = async () => {
    if (!groupInfo) return;

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission?.granted) {
        Alert.alert('Permission needed', 'Please allow photo access to update the group image.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets && result.assets[0];
      if (!asset?.uri) {
        Alert.alert('Whoops', 'Unable to read the selected image.');
        return;
      }

      setGroupActionLoading(true);
      await ApiService.uploadGroupImage(groupInfo.groupId, asset.uri);
      await Promise.all([
        fetchGroupDetails(groupInfo.groupId),
        fetchUserInfo(),
      ]);
    } catch (error) {
      console.error('Error updating group image:', error);
      Alert.alert('Whoops', error?.message || 'Failed to update the group image.');
    } finally {
      setGroupActionLoading(false);
    }
  };

  const handleAddGroupMember = async (member) => {
    if (!groupInfo) return false;

    let success = true;

    try {
      setGroupActionLoading(true);
      const response = await ApiService.addGroupMember(groupInfo.groupId, member);

      if (!response?.success) {
        success = false;
        Alert.alert('Whoops', response?.message || 'Failed to add member.');
      } else {
        await Promise.all([
          fetchGroupDetails(groupInfo.groupId),
          fetchUserInfo(),
        ]);
      }
    } catch (error) {
      success = false;
      console.error('Error adding group member:', error);
      Alert.alert('Whoops', error?.message || 'Failed to add member.');
    } finally {
      setGroupActionLoading(false);
    }

    return success;
  };

  const handleInvitePress = () => {
    if (!groupInfo) return;
    setInviteModalVisible(true);
  };

  const handleSelectGroup = useCallback((groupId) => {
    if (groupId === selectedGroupId) {
      return;
    }

    setGroupInfo(null);
    setPosts([]);
    setGroupLoading(true);
    setInviteModalVisible(false);
    setSelectedGroupId(groupId);

    // Scroll to top when selecting a new group
    if (flatListRef.current) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: false });
    }
  }, [selectedGroupId, setSelectedGroupId]);

  // Register handleSelectGroup with context
  useEffect(() => {
    setHandleSelectGroup(() => handleSelectGroup);
  }, [handleSelectGroup, setHandleSelectGroup]);

  const handleCreatePost = () => {
    // Navigate to create tab (index 1)
    router.push('/(tabs)/create');
  };

  const handleNudgeIconPress = async () => {
    // Manually fetch nudge when user clicks the icon
    await fetchNudgeData();
  };

  const handleNudgeSendMessage = async (nudge) => {
    try {
      if (!nudge?.id) {
        console.error('No nudge ID found');
        return;
      }

      // Send message action (2) with empty videoUrl
      await ApiService.saveNudgeAction(nudge.id, 2, '');

      console.log('Message action saved for nudge:', nudge.id);
      setShowNudgePopup(false);
      Alert.alert('Success', 'Your message has been sent!');
    } catch (error) {
      console.error('Error saving message action:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    }
  };

  const handleNudgeSendVideo = (nudge) => {
    if (!nudge?.id) {
      console.error('No nudge ID found');
      return;
    }

    // Navigate to video selector with nudge info
    router.push({
      pathname: '/birthday-video-selector',
      params: {
        nudgeId: nudge.id,
        memberName: nudge.memberName || 'Birthday Person',
      },
    });
  };

  const handleNudgeClose = async () => {
    try {
      if (nudgeData?.id) {
        // Dismiss action (1) with empty videoUrl
        await ApiService.saveNudgeAction(nudgeData.id, 1, '');
        console.log('Dismiss action saved for nudge:', nudgeData.id);
      }
    } catch (error) {
      console.error('Error saving dismiss action:', error);
    } finally {
      setShowNudgePopup(false);
    }
  };

  const handleBirthdayAnimationComplete = () => {
    setShowBirthdayAnimation(false);
  };

  const handleCreateGroup = async (groupPayload) => {
    try {
      const resolvedPayload =
        groupPayload &&
          typeof groupPayload === 'object' &&
          groupPayload.data &&
          typeof groupPayload.data === 'object'
          ? groupPayload.data
          : groupPayload;

      const fallback =
        typeof groupPayload === 'string'
          ? { groupName: groupPayload?.trim() }
          : {
            groupId: resolvedPayload?.groupId,
            groupName: resolvedPayload?.groupName ?? resolvedPayload?.name ?? '',
            groupImage:
              resolvedPayload?.groupImage ??
              resolvedPayload?.groupPhoto ??
              resolvedPayload?.groupPicture,
          };

      const normalizedGroup = normalizeCreatedGroupListItem(resolvedPayload, fallback);

      // Fetch the latest data from server with retry logic (5 attempts)
      // This ensures the new group appears in the list
      await fetchUserInfo();

      // Switch to the new group and load its feed (which will be empty for new groups)
      if (normalizedGroup?.groupId) {
        setDrawerVisible(false);
        setPosts([]);
        setGroupInfo(null);
        setGroupLoading(true);
        setSelectedGroupId(normalizedGroup.groupId);
      }
    } catch (error) {
      console.error('Error creating group:', error);
    }
  };

  const renderHeader = () => (
    <View style={[
      styles.header,
      selectedGroupId > 0 && styles.headerWhite
    ]}>
      <SafeAreaView>
        <View style={styles.headerContent}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setDrawerVisible(true)}
          >
            <Image
              source={require('../../assets/images/groupMenu.png')}
              style={[
                styles.headerIcon,
                { tintColor: selectedGroupId > 0 ? COLORS.purple1 : COLORS.white }
              ]}
            />
          </TouchableOpacity>

          {selectedGroupId > 0 && (
            <Text style={styles.headerTitle}>
              {groupInfo?.groupName ||
                account?.userGroups?.userGroupList?.find((g) => g.groupId === selectedGroupId)?.groupName ||
                ''}
            </Text>
          )}

          <View style={{ flex: 1 }} />

          <TouchableOpacity style={styles.headerButton} onPress={handleCreatePost}>
            <Image
              source={require('../../assets/images/icPlus.png')}
              style={[
                styles.headerIcon,
                { tintColor: selectedGroupId > 0 ? COLORS.purple1 : COLORS.white }
              ]}
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.headerButton} onPress={handleNudgeIconPress}>
            <Image
              source={require('../../assets/images/touch.png')}
              style={[
                styles.headerIcon,
                { tintColor: selectedGroupId > 0 ? COLORS.purple1 : COLORS.white }
              ]}
            />

          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyTitle}>Whoops!</Text>
      <Text style={styles.emptyText}>There is no post for selected group!</Text>
      <TouchableOpacity style={styles.createPostButton}>
        <Text style={styles.createPostButtonText}>Create your first post</Text>
      </TouchableOpacity>
    </View>
  );

  const showGroupHeader = selectedGroupId > 0;

  const headerComponent = !showGroupHeader
    ? null
    : groupInfo ? (
      <GroupDetailsHeader
        group={groupInfo}
        account={account}
        onPrimaryAction={handleGroupPrimaryAction}
        onInvitePress={handleInvitePress}
        onToggleLike={handleGroupLikeToggle}
        onToggleFavorite={handleGroupFavoriteToggle}
        onChangeCover={handleChangeGroupImage}
        disabled={groupActionLoading || groupLoading}
      />
    ) : (
      <View style={styles.groupHeaderPlaceholder}>
        <ActivityIndicator size="small" color={COLORS.purple1} />
      </View>
    );

  const commentDisplayName = useMemo(() => {
    if (!account) return '';
    const first = typeof account.firstName === 'string' ? account.firstName.trim() : '';
    const last = typeof account.lastName === 'string' ? account.lastName.trim() : '';
    const combined = [first, last].filter(Boolean).join(' ');
    return combined || account.userName || '';
  }, [account]);

  const existingMembersForInvite = groupInfo?.groupUserList
    ? groupInfo.groupUserList.map((member) => ({
      memberProfileId: member.userProfileId,
      memberEmail: member.memberEmail || member.email || '',
    }))
    : [];

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <StatusBar barStyle={selectedGroupId > 0 ? 'dark-content' : 'light-content'} />
        <ActivityIndicator size="large" color={COLORS.purple1} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle={selectedGroupId > 0 ? 'dark-content' : 'light-content'} />

      {renderHeader()}

      {selectedGroupId === -1 && (
        <ImageCarousel images={carouselImages} />
      )}

      <FlatList
        ref={flatListRef}
        data={posts}
        keyExtractor={(item) => `post-${item.groupPostId}`}
        renderItem={({ item }) => (
          <FeedPost
            post={item}
            onLike={handleLike}
            onSave={handleSave}
            onReport={handleReport}
            onBlock={handleBlock}
            onComment={handleCommentPress}
            onShare={handleShare}
          />
        )}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={COLORS.purple1}
          />
        }
        contentContainerStyle={[
          posts.length === 0 && styles.emptyList,
          styles.listContent,
        ]}
        style={[
          styles.list,
          selectedGroupId > 0 ? styles.listWhite : styles.listPurple
        ]}
        ListHeaderComponent={headerComponent}
        stickyHeaderIndices={showGroupHeader ? [0] : undefined}
      />

      <LeftDrawer
        visible={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        groups={account?.userGroups?.userGroupList || []}
        selectedGroupId={selectedGroupId}
        onSelectGroup={handleSelectGroup}
        account={account}
        onCreateGroup={handleCreateGroup}
        onRefresh={fetchUserInfo}
      />

      <AddMember
        visible={inviteModalVisible}
        groupName={groupInfo?.groupName || ''}
        groupImage={groupInfo?.groupImage || ''}
        onClose={() => setInviteModalVisible(false)}
        onAddMember={handleAddGroupMember}
        existingMembers={existingMembersForInvite}
      />

      <PostCommentsModal
        visible={commentModalVisible}
        postId={activeCommentPost?.groupPostId}
        postTitle={activeCommentPost?.postTitle || activeCommentPost?.groupName || ''}
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
        postTitle={reportingPost?.postTitle || ''}
      />

      <NotificationActionModal
        visible={groupInvitationModalVisible}
        notification={groupInvitationData}
        onClose={() => {
          setGroupInvitationModalVisible(false);
          setGroupInvitationData(null);
          // Refresh groups list after joining/declining
          fetchInitialData();
        }}
        onAction={(action) => {
          console.log('📋 Group invitation action:', action);
          setGroupInvitationModalVisible(false);
          setGroupInvitationData(null);
          // Refresh groups list after joining/declining
          setTimeout(() => {
            fetchInitialData();
          }, 500);
        }}
      />

      {(groupLoading || groupActionLoading) && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color={COLORS.purple1} />
        </View>
      )}

      {/* Birthday Animation */}
      <BirthdayAnimation
        visible={showBirthdayAnimation}
        onComplete={handleBirthdayAnimationComplete}
      />

      {/* Nudge Popup */}
      <NudgePopup
        visible={showNudgePopup}
        nudge={nudgeData}
        onClose={handleNudgeClose}
        onSendMessage={handleNudgeSendMessage}
        onSendVideo={handleNudgeSendVideo}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: COLORS.purple1,
  },
  headerWhite: {
    backgroundColor: COLORS.white,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.spacingM,
    paddingVertical: SIZES.spacingM,
  },
  headerButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIcon: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  nudgeIcon: {
    fontSize: 24,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.purple1,
    marginLeft: SIZES.spacingM,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 120, // Extra padding for floating tab bar
  },
  listPurple: {
    backgroundColor: COLORS.white,
  },
  listWhite: {
    backgroundColor: COLORS.white,
  },
  emptyList: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.spacingM,
  },
  emptyTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: COLORS.purple1,
    marginBottom: SIZES.spacingM,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.black,
    marginBottom: SIZES.spacingM,
    textAlign: 'center',
  },
  createPostButton: {
    width: 200,
    height: 40,
    backgroundColor: COLORS.purple0,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createPostButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
  groupHeaderPlaceholder: {
    backgroundColor: COLORS.white,
    paddingVertical: SIZES.spacingL,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: (SIZES.screenWidth || 320) * 0.55,
  },
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.75)',
  },
});
