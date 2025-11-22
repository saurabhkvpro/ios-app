import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants/theme';

const EMPTY_COVER = require('../assets/images/empty.png');
const EMPTY_AVATAR = require('../assets/images/iconEmptyProfile.png');
const GROUP_ICON = require('../assets/images/groupImage.png');
const EDIT_ICON = require('../assets/images/iconCreate.png');

const GroupDetailsHeader = ({
  group,
  account,
  onPrimaryAction,
  onInvitePress,
  onToggleLike,
  onToggleFavorite,
  onChangeCover,
  disabled = false,
}) => {
  if (!group) {
    return null;
  }

  const memberList = Array.isArray(group.groupUserList) ? group.groupUserList : [];
  const memberCount = memberList.length;

  const acceptedDate = group.acceptedDate || '';
  const rejectedDate = group.rejectedDate || '';

  let shouldShowJoinButton = false;
  if (!acceptedDate && !rejectedDate) {
    shouldShowJoinButton = true;
  } else if (acceptedDate && !rejectedDate) {
    shouldShowJoinButton = false;
  } else {
    shouldShowJoinButton = !acceptedDate;
  }

  // Check if current user is the group creator
  const isCreator = account?.userProfileId === group.createdById ||
                    account?.userProfileId === group.createdBy;

  const primaryLabel = isCreator ? 'Delete' : shouldShowJoinButton ? 'Join' : 'Leave';
  const inviteDisabled = shouldShowJoinButton || disabled;

  const likeCount = typeof group.totalLikes === 'number' ? group.totalLikes : 0;
  const favoriteCount = typeof group.totalFavourite === 'number' ? group.totalFavourite : 0;

  // Only group creator can edit the cover image
  const canEditCover = isCreator;

  const handlePrimaryAction = () => {
    if (disabled) return;
    onPrimaryAction && onPrimaryAction({
      primaryLabel,
      shouldShowJoinButton,
      isCreator,
    });
  };

  const handleInvite = () => {
    if (inviteDisabled) return;
    onInvitePress && onInvitePress();
  };

  const handleToggleLike = () => {
    if (disabled) return;
    onToggleLike && onToggleLike(!group.isLiked);
  };

  const handleToggleFavorite = () => {
    if (disabled) return;
    onToggleFavorite && onToggleFavorite(!group.isFavorite);
  };

  const handleChangeCover = () => {
    if (disabled || !canEditCover) return;
    onChangeCover && onChangeCover();
  };

  return (
    <View style={styles.container}>
      <View style={styles.coverWrapper}>
        <Image
          source={group.groupBackgroundImage ? { uri: group.groupBackgroundImage } : EMPTY_COVER}
          style={styles.coverImage}
          resizeMode="cover"
        />
        {canEditCover && onChangeCover && (
          <TouchableOpacity
            style={[styles.coverEditButton, (disabled) && styles.coverEditButtonDisabled]}
            onPress={handleChangeCover}
            disabled={disabled}
            hitSlop={HIT_SLOP}
          >
            <Image source={EDIT_ICON} style={styles.coverEditIcon} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <View style={styles.titleGroup}>
            <View style={styles.nameRow}>
              <Image
                source={group.groupImage ? { uri: group.groupImage } : GROUP_ICON}
                style={styles.groupAvatar}
              />
              <Text style={styles.groupName}>{group.groupName}</Text>
            </View>
            <Text style={styles.memberCount}>
              {memberCount} {memberCount === 1 ? 'member' : 'members'}
            </Text>
          </View>

          <View style={styles.metrics}>
            <TouchableOpacity
              style={styles.metricButton}
              hitSlop={HIT_SLOP}
              disabled={disabled}
              onPress={handleToggleLike}
            >
              <Ionicons
                name={group.isLiked ? 'heart' : 'heart-outline'}
                size={18}
                color={group.isLiked ? COLORS.purple1 : COLORS.purple2}
                style={{ marginRight: SIZES.spacingXS }}
              />
              <Text style={styles.metricValue}>{likeCount}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.metricButton, styles.metricButtonSpacing]}
              hitSlop={HIT_SLOP}
              disabled={disabled}
              onPress={handleToggleFavorite}
            >
              <Ionicons
                name={group.isFavorite ? 'bookmark' : 'bookmark-outline'}
                size={18}
                color={group.isFavorite ? COLORS.purple1 : COLORS.purple2}
                style={{ marginRight: SIZES.spacingXS }}
              />
              <Text style={styles.metricValue}>{favoriteCount}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.membersRow}
        >
          {memberList.map((member) => {
            const uri = member.profileImage;
            return (
              <Image
                key={`member-${member.userProfileId}`}
                source={uri ? { uri } : EMPTY_AVATAR}
                style={styles.memberAvatar}
                resizeMode="cover"
              />
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={[styles.primaryButton, disabled && styles.disabledButton]}
          onPress={handlePrimaryAction}
          disabled={disabled}
        >
          <Text style={styles.primaryButtonText}>{primaryLabel}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.inviteButton,
            (inviteDisabled || disabled) && styles.inviteButtonDisabled,
          ]}
          onPress={handleInvite}
          disabled={inviteDisabled || disabled}
        >
          <Text style={styles.inviteButtonText}>Invite</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.divider} />
    </View>
  );
};

const HIT_SLOP = { top: 8, right: 8, bottom: 8, left: 8 };

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
  },
  coverWrapper: {
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: (SIZES.screenWidth || 320) * 0.55,
    backgroundColor: COLORS.lightGrayColor,
  },
  coverEditButton: {
    position: 'absolute',
    right: SIZES.spacingM,
    bottom: SIZES.spacingM,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: COLORS.black,
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  coverEditButtonDisabled: {
    opacity: 0.5,
  },
  coverEditIcon: {
    width: 20,
    height: 20,
    tintColor: COLORS.purple1,
  },
  content: {
    paddingHorizontal: SIZES.spacingM,
    paddingTop: SIZES.spacingM,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleGroup: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  groupAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: SIZES.spacingS,
    backgroundColor: COLORS.lightGrayColor,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.purple1,
  },
  memberCount: {
    marginTop: SIZES.spacingXS,
    fontSize: 14,
    color: COLORS.black,
  },
  metrics: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: SIZES.spacingM,
  },
  metricButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricButtonSpacing: {
    marginLeft: SIZES.spacingM,
  },
  metricValue: {
    fontSize: 14,
    color: COLORS.purple2,
    fontWeight: '500',
  },
  membersRow: {
    paddingVertical: SIZES.spacingM,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: SIZES.spacingS,
    backgroundColor: COLORS.lightGrayColor,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.spacingM,
    paddingBottom: SIZES.spacingM,
  },
  primaryButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    backgroundColor: COLORS.purple1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: SIZES.spacingS,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 16,
  },
  inviteButton: {
    flex: 1,
    height: 44,
    borderRadius: 8,
    backgroundColor: COLORS.purple1,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: SIZES.spacingS,
  },
  inviteButtonDisabled: {
    opacity: 0.4,
  },
  inviteButtonText: {
    color: COLORS.white,
    fontWeight: '600',
    fontSize: 16,
  },
  disabledButton: {
    opacity: 0.6,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.lightGrayColor,
  },
});

export default GroupDetailsHeader;
