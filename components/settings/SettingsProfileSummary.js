import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../../constants/theme';

const SettingsProfileSummary = ({ fullName, aboutText, profileImage, buildImageUri }) => {
  const source = profileImage
    ? { uri: buildImageUri(profileImage) }
    : require('../../assets/images/iconEmptyProfile.png');

  return (
    <View style={styles.wrapper}>
      <Image source={source} style={styles.avatar} resizeMode="cover" />
      <View style={styles.meta}>
        <Text style={styles.name} numberOfLines={1}>
          {fullName || 'Your Name'}
        </Text>
        {aboutText ? (
          <Text style={styles.subtitle} numberOfLines={2}>
            {aboutText}
          </Text>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.spacingM,
    paddingVertical: SIZES.spacingM,
    gap: SIZES.spacingM,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: SIZES.cornerRadius16,
    backgroundColor: COLORS.purple0,
  },
  meta: {
    flex: 1,
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.purple2,
  },
  subtitle: {
    marginTop: SIZES.spacingXS,
    fontSize: 14,
    color: COLORS.purple3,
  },
});

export default SettingsProfileSummary;
