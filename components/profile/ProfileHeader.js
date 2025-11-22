import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../constants/theme';

const ProfileHeader = ({
  account,
  fullName,
  aboutText,
  stats,
  buildImageUri,
  onPressSettings,
}) => {
  const profileSource = account?.profileImage
    ? { uri: buildImageUri(account.profileImage) }
    : require('../../assets/images/iconEmptyProfile.png');
  const safeStats = Array.isArray(stats) ? stats : [];

  return (
    <View style={styles.wrapper}>
      <View style={styles.profileCard}>
        {onPressSettings ? (
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={onPressSettings}
            activeOpacity={0.8}
            hitSlop={{ top: 12, right: 12, bottom: 12, left: 12 }}
          >
            <Feather name="settings" size={22} color={COLORS.purple2} />
          </TouchableOpacity>
        ) : null}
        <View style={styles.profileRow}>
          <Image source={profileSource} style={styles.profileImage} resizeMode="cover" />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName} numberOfLines={1}>
              {fullName || 'Your Name'}
            </Text>
            <Text style={styles.profileAbout} numberOfLines={2}>
              {aboutText}
            </Text>
            <View style={styles.profileStatsRow}>
              {safeStats.map((stat) => (
                <View key={stat.label} style={styles.profileStat}>
                  <Text style={styles.profileStatValue}>{stat.value}</Text>
                  <Text style={styles.profileStatLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: COLORS.bgColor,
    paddingTop: SIZES.spacingM,
  },
  profileCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.cornerRadius16,
    padding: SIZES.spacingM,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    marginHorizontal: SIZES.spacingM,
    marginBottom: SIZES.spacingM,
  },
  settingsButton: {
    position: 'absolute',
    top: SIZES.spacingS,
    right: SIZES.spacingS,
    padding: SIZES.spacingXS,
    borderRadius: SIZES.cornerRadius12,
    backgroundColor: 'rgba(0, 104, 123, 0.08)',
    zIndex: 5,
    elevation: 3,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImage: {
    width: 96,
    height: 96,
    borderRadius: 12,
    backgroundColor: COLORS.purple0,
    marginRight: SIZES.spacingM,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.purple2,
  },
  profileAbout: {
    fontSize: 14,
    color: COLORS.textColor,
    marginTop: SIZES.spacingXS,
  },
  profileStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SIZES.spacingM,
  },
  profileStat: {
    flex: 1,
    alignItems: 'center',
  },
  profileStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.purple1,
  },
  profileStatLabel: {
    fontSize: 12,
    color: COLORS.textColor,
    marginTop: 4,
  },
});

export default ProfileHeader;
