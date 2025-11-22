import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  Dimensions,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants/theme';

const { width } = Dimensions.get('window');

const getRelativeTime = (dateString) => {
  if (!dateString) return '';

  try {
    const postDate = new Date(dateString);
    const now = new Date();
    const diffMs = now - postDate;
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffYears > 0) {
      return `${diffYears} year${diffYears > 1 ? 's' : ''} ago`;
    } else if (diffMonths > 0) {
      return `${diffMonths} month${diffMonths > 1 ? 's' : ''} ago`;
    } else if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffMins > 0) {
      return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    } else {
      return 'just now';
    }
  } catch (error) {
    return '';
  }
};

export default function FeedPost({ post, onLike, onComment, onShare, onSave, onReport, onBlock }) {
  const router = useRouter();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(post.isLiked);
  const [isSaved, setIsSaved] = useState(post.isFavorite);
  const [likesCount, setLikesCount] = useState(post.totalLikes || 0);
  const reportDisabled = post.isReported || !onReport;

  const handleProfilePress = () => {
    let profileId = null;

    // Try to get profile ID from postMediaList first (most reliable)
    if (post.postMediaList && Array.isArray(post.postMediaList) && post.postMediaList.length > 0) {
      const firstMedia = post.postMediaList[0];
      if (firstMedia.userProfileId && firstMedia.userProfileId !== 0) {
        profileId = firstMedia.userProfileId;
      }
    }

    // Try tagMemerProfileIds
    if (!profileId && post.tagMemerProfileIds && Array.isArray(post.tagMemerProfileIds) && post.tagMemerProfileIds.length > 0) {
      profileId = post.tagMemerProfileIds[0];
    }

    // Fallback to other fields
    if (!profileId) {
      profileId =
        post.createdByUserProfileId ||
        (post.userProfileId && post.userProfileId !== 0 ? post.userProfileId : null) ||
        post.createdBy ||
        post.userId ||
        post.createdByUserId;
    }

    if (profileId) {
      router.push({
        pathname: '/user/[profileId]',
        params: { profileId: profileId.toString() },
      });
    } else {
      Alert.alert('Error', 'Unable to open profile for this user.');
    }
  };

  const handleLike = () => {
    const newLikedState = !isLiked;
    setIsLiked(newLikedState);
    setLikesCount(likesCount + (newLikedState ? 1 : -1));
    onLike && onLike(post.groupPostId, newLikedState);
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    onSave && onSave(post.groupPostId, !isSaved);
  };

  const renderImages = () => {
    if (!post.postMediaList || post.postMediaList.length === 0) {
      return null;
    }

    return (
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={(e) => {
          const contentOffsetX = e.nativeEvent.contentOffset.x;
          const index = Math.round(contentOffsetX / width);
          setCurrentImageIndex(index);
        }}
        scrollEventThrottle={16}
      >
        {post.postMediaList.map((media, index) => (
          <Image
            key={index}
            source={{ uri: media.url || media.resizeImageUrl }}
            style={styles.postImage}
            resizeMode="cover"
          />
        ))}
      </ScrollView>
    );
  };

  const renderPaginationDots = () => {
    if (!post.postMediaList || post.postMediaList.length <= 1) {
      return null;
    }

    return (
      <View style={styles.paginationContainer}>
        {post.postMediaList.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              index === currentImageIndex && styles.paginationDotActive,
            ]}
          />
        ))}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.profileSection} onPress={handleProfilePress}>
          {post.profileImage ? (
            <Image
              source={{ uri: post.profileImage }}
              style={styles.profileImage}
            />
          ) : (
            <Image
              source={require('../assets/images/empty.png')}
              style={styles.profileImage}
            />
          )}
          <View style={styles.headerTextContainer}>
            <Text style={styles.postTitle} numberOfLines={1}>
              {post.postTitle || 'Untitled'}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.createdBy} numberOfLines={1}>
                {post.createdBY || 'Unknown'}
              </Text>
              <Text style={styles.dot}> • </Text>
              <Text style={styles.relativeTime}>
                {getRelativeTime(post.createdDate)}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
        {post.canFlagPost && (
          <View style={styles.actionButtons}>
            <TouchableOpacity
              onPress={() => onReport && onReport(post)}
              disabled={reportDisabled}
              activeOpacity={reportDisabled ? 1 : 0.75}
            >
              <Text
                style={[
                  styles.reportText,
                  post.isReported && styles.reportedText,
                  !post.isReported && !onReport && styles.reportDisabledText,
                ]}
              >
                {post.isReported ? 'Reported' : 'Report'}
              </Text>
            </TouchableOpacity>
            {onBlock ? (
              <TouchableOpacity onPress={() => onBlock(post)} activeOpacity={0.75}>
                <Text style={styles.blockText}>Block</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}
      </View>

      {/* Images */}
      <View style={styles.imageContainer}>
        {renderImages()}
        {renderPaginationDots()}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={26}
            color={isLiked ? '#EF4444' : COLORS.black}
          />
          {likesCount > 0 && <Text style={styles.actionText}>{likesCount}</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onComment && onComment(post.groupPostId)}
        >
          <Ionicons
            name="chatbubble-outline"
            size={24}
            color={COLORS.black}
          />
          {post.commentsCount > 0 && <Text style={styles.actionText}>{post.commentsCount}</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => onShare && onShare(post)}
        >
          <Ionicons
            name="paper-plane-outline"
            size={24}
            color={COLORS.black}
          />
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleSave}
        >
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={26}
            color={isSaved ? COLORS.purple1 : COLORS.black}
          />
        </TouchableOpacity>
      </View>

      {/* Hashtags */}
      {post.hashTags && post.hashTags.length > 0 && (
        <View style={styles.hashtagsContainer}>
          <Text style={styles.hashtags}>
            {post.hashTags.map(tag => `#${tag}`).join(' ')}
          </Text>
        </View>
      )}

      {/* Last Comment */}
      {post.postCommentList && post.postCommentList.length > 0 && (
        <View style={styles.commentContainer}>
          <Text style={styles.commentUserName} numberOfLines={1}>
            {post.postCommentList[post.postCommentList.length - 1].userName}
          </Text>
          <Text style={styles.commentText} numberOfLines={2}>
            {post.postCommentList[post.postCommentList.length - 1].commentText}
          </Text>
        </View>
      )}

      {/* View all comments */}
      {post.commentsCount > 0 && (
        <TouchableOpacity
          style={styles.viewCommentsContainer}
          onPress={() => onComment && onComment(post.groupPostId)}
        >
          <Text style={styles.viewCommentsText}>
            View all {post.commentsCount} comments
          </Text>
        </TouchableOpacity>
      )}

      <View style={styles.divider} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    marginBottom: SIZES.spacingS,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E7EB',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.spacingM,
    paddingTop: SIZES.spacingS,
    paddingBottom: SIZES.spacingXS,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: COLORS.purple0,
  },
  profileImagePlaceholder: {
    backgroundColor: COLORS.lightGrayColor,
  },
  headerTextContainer: {
    marginLeft: SIZES.spacingS,
    flex: 1,
  },
  postTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.black,
    letterSpacing: 0.1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  createdBy: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  dot: {
    fontSize: 12,
    color: '#9CA3AF',
    marginHorizontal: 3,
  },
  relativeTime: {
    fontSize: 12,
    color: '#9CA3AF',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: SIZES.spacingS,
  },
  reportText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.purple2,
  },
  reportedText: {
    color: '#EF4444',
  },
  reportDisabledText: {
    color: COLORS.purple3,
    opacity: 0.5,
  },
  blockText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  imageContainer: {
    position: 'relative',
    marginTop: SIZES.spacingXS,
    backgroundColor: '#000',
  },
  postImage: {
    width: width,
    height: width * 1.0,
  },
  paginationContainer: {
    position: 'absolute',
    bottom: SIZES.spacingS,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 3,
  },
  paginationDotActive: {
    backgroundColor: COLORS.white,
    width: 20,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.spacingM,
    paddingVertical: SIZES.spacingS,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: SIZES.spacingM,
  },
  actionIcon: {
    width: 22,
    height: 22,
    resizeMode: 'contain',
  },
  actionText: {
    marginLeft: 4,
    fontSize: 14,
    color: COLORS.black,
    fontWeight: '600',
  },
  hashtagsContainer: {
    paddingHorizontal: SIZES.spacingM,
    paddingBottom: SIZES.spacingXS,
  },
  hashtags: {
    fontSize: 13,
    color: COLORS.purple2,
    fontWeight: '600',
    lineHeight: 18,
  },
  commentContainer: {
    paddingHorizontal: SIZES.spacingM,
    paddingVertical: SIZES.spacingXS,
  },
  commentUserName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.black,
  },
  commentText: {
    fontSize: 13,
    color: COLORS.black,
    marginTop: 2,
    lineHeight: 18,
  },
  viewCommentsContainer: {
    paddingHorizontal: SIZES.spacingM,
    paddingVertical: SIZES.spacingXS,
    paddingBottom: SIZES.spacingS,
  },
  viewCommentsText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  divider: {
    height: 0,
    backgroundColor: 'transparent',
  },
});
