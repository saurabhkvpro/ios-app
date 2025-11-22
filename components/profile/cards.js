import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../constants/theme';

export const PostCard = ({ item, width, buildImageUri }) => {
  // Display-only component - no interactions
  // Profile posts API uses 'isFollowed' for saved/favorite status
  const isLiked = item.isLiked || false;
  const isSaved = item.isFollowed || false;
  const likesCount = item.totalLikes || 0;
  const savedCount = item.totalFollowers || 0;

  const imageSource = item.postImage
    ? { uri: buildImageUri(item.postImage) }
    : require('../../assets/images/empty.png');

  return (
    <View style={[styles.postCard, width ? { width } : null]}>
      <Image source={imageSource} style={[styles.postImage, width ? { height: width } : null]} resizeMode="cover" />
      <View style={styles.postBody}>
        <Text style={styles.postTitle} numberOfLines={2}>
          {item.postTitle || 'Untitled'}
        </Text>
        <View style={styles.postStatsRow}>
          {/* Display-only icons - no click handlers */}
          <View style={styles.postStatItem}>
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={18}
              color={isLiked ? '#EF4444' : COLORS.purple2}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.postStatText}>{likesCount}</Text>
          </View>
          <View style={styles.postStatItem}>
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={isSaved ? COLORS.purple1 : COLORS.purple2}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.postStatText}>{savedCount}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

export const ConnectionItem = ({ item, buildImageUri, onPress, isLast = false }) => {
  const avatarSource = item.memberProfileImage
    ? { uri: buildImageUri(item.memberProfileImage) }
    : require('../../assets/images/iconEmptyProfile.png');

  return (
    <View style={styles.connectionContainer}>
      <TouchableOpacity style={styles.connectionRow} onPress={onPress} activeOpacity={0.8}>
        <View style={styles.connectionAccent} />
        <Image source={avatarSource} style={styles.connectionAvatar} resizeMode="cover" />
        <View style={styles.connectionInfo}>
          <Text style={styles.connectionName} numberOfLines={1}>
            {`${item.firstName || ''} ${item.lastName || ''}`.trim() || 'Unnamed'}
          </Text>
          <Text style={styles.connectionRelationship} numberOfLines={1}>
            {item.relationship || 'Relationship unknown'}
          </Text>
        </View>
      </TouchableOpacity>
      {!isLast && <View style={styles.connectionDivider} />}
    </View>
  );
};

export const GroupCard = ({ item, buildImageUri, onPress, width }) => {
  const imageSource = item.groupImage
    ? { uri: buildImageUri(item.groupImage) }
    : require('../../assets/images/groupImage.png');

  const likeCount = item.totalLikes ?? 0;

  // Member count: try groupUserList length first, then fallback to API fields
  const memberCount = Array.isArray(item.groupUserList)
    ? item.groupUserList.length
    : (item.totalMembers ?? item.totalFriends ?? 0);

  const favouriteCount = item.totalFavourite ?? item.totalFavorite ?? item.totalFollowers ?? 0;

  const isLiked = Boolean(item.isLiked);
  // API returns isFollowed, not isFavorite
  const isFavorite = Boolean(item.isFollowed || item.isFavorite || item.isFavourite);

  return (
    <TouchableOpacity
      style={[styles.groupCard, width ? { width } : null]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Image
        source={imageSource}
        style={[styles.groupImage, width ? { height: width } : null]}
        resizeMode="cover"
      />
      <View style={styles.groupBody}>
        <Text style={styles.groupTitle} numberOfLines={1}>
          {item.groupName || 'Unnamed Group'}
        </Text>
        <Text style={styles.groupStatus} numberOfLines={1}>
          {item.groupStatus ? `Status: ${item.groupStatus}` : 'Status: Active'}
        </Text>
        <View style={styles.groupStatRow}>
          <StatInlineIcon
            iconName={isLiked ? 'heart' : 'heart-outline'}
            value={likeCount}
            filled={isLiked}
          />
          <StatInlineIcon
            iconName="people"
            value={memberCount}
            filled={false}
          />
          <StatInlineIcon
            iconName={isFavorite ? 'bookmark' : 'bookmark-outline'}
            value={favouriteCount}
            filled={isFavorite}
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const CircleItem = ({ item, buildImageUri, onPress, isLast = false }) => {
  const avatarSource = item.profileImage
    ? { uri: buildImageUri(item.profileImage) }
    : require('../../assets/images/iconEmptyProfile.png');

  return (
    <View style={styles.connectionContainer}>
      <TouchableOpacity style={styles.connectionRow} onPress={onPress} activeOpacity={0.8}>
        <View style={styles.connectionAccent} />
        <Image source={avatarSource} style={styles.connectionAvatar} resizeMode="cover" />
        <View style={styles.connectionInfo}>
          <Text style={styles.connectionName} numberOfLines={1}>
            {`${item.firstName || ''} ${item.lastName || ''}`.trim() || 'Unnamed'}
          </Text>
          <Text style={styles.connectionRelationship} numberOfLines={1}>
            Circle member
          </Text>
        </View>
      </TouchableOpacity>
      {!isLast && <View style={styles.connectionDivider} />}
    </View>
  );
};

const StatInline = ({ icon, value }) => (
  <View style={styles.groupStatItem}>
    <Image source={icon} style={styles.groupStatIcon} />
    <Text style={styles.groupStatText}>{value}</Text>
  </View>
);

const StatInlineIcon = ({ iconName, value, filled = false }) => (
  <View style={styles.groupStatItem}>
    <Ionicons
      name={iconName}
      size={18}
      color={filled ? COLORS.purple1 : COLORS.purple2}
      style={{ marginRight: 4 }}
    />
    <Text style={styles.groupStatText}>{value}</Text>
  </View>
);

const styles = StyleSheet.create({
  postCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.cornerRadius16,
    marginBottom: SIZES.spacingS,
    overflow: 'hidden',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  postImage: {
    width: '100%',
    height: 160,
    backgroundColor: COLORS.purple0,
  },
  postBody: {
    padding: SIZES.spacingM,
  },
  postTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.black,
    marginBottom: SIZES.spacingS,
  },
  postStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  postStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  postStatIcon: {
    width: 18,
    height: 18,
    marginRight: 6,
    tintColor: COLORS.purple2,
  },
  postStatText: {
    fontSize: 13,
    color: COLORS.purple2,
    fontWeight: '600',
  },
  connectionContainer: {
    backgroundColor: COLORS.white,
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.spacingM,
    paddingVertical: SIZES.spacingS,
    minHeight: 60,
  },
  connectionAccent: {
    width: 4,
    alignSelf: 'stretch',
    backgroundColor: COLORS.purple1,
    borderRadius: 0,
    marginRight: SIZES.spacingM,
  },
  connectionAvatar: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: COLORS.purple0,
    marginRight: SIZES.spacingM,
  },
  connectionInfo: {
    flex: 1,
  },
  connectionName: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.purple2,
  },
  connectionRelationship: {
    fontSize: 14,
    color: COLORS.textColor,
    marginTop: 4,
  },
  connectionDivider: {
    height: 1,
    backgroundColor: COLORS.purple0,
    marginLeft: SIZES.spacingM * 2 + 56 + 4,
  },
  groupCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.cornerRadius16,
    marginBottom: SIZES.spacingS,
    overflow: 'hidden',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
  },
  groupImage: {
    width: '100%',
    height: 160,
    backgroundColor: COLORS.purple0,
  },
  groupBody: {
    padding: SIZES.spacingM,
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.black,
  },
  groupStatus: {
    fontSize: 13,
    color: COLORS.purple2,
    marginTop: SIZES.spacingXS,
  },
  groupStatRow: {
    flexDirection: 'row',
    marginTop: SIZES.spacingM,
    justifyContent: 'space-between',
  },
  groupStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupStatIcon: {
    width: 18,
    height: 18,
    tintColor: COLORS.purple2,
  },
  groupStatText: {
    fontSize: 13,
    color: COLORS.purple2,
    fontWeight: '600',
  },
});
