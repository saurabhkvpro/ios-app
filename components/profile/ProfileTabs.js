import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../../constants/theme';

const ProfileTabs = ({ tabs, activeTab, onTabChange, rightAccessory }) => {
  return (
    <View style={styles.wrapper}>
      <View style={styles.tabRow}>
        {tabs.map((tab) => {
          const isActive = tab === activeTab;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, isActive && styles.tabButtonActive]}
              onPress={() => onTabChange(tab)}
              activeOpacity={0.7}
            >
              <Text
                style={[styles.tabText, isActive && styles.tabTextActive]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {tab}
              </Text>            
            </TouchableOpacity>
          );
        })}
      </View>
      {rightAccessory ? <View style={styles.accessoryContainer}>{rightAccessory}</View> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    paddingBottom: SIZES.spacingS,
    backgroundColor: COLORS.bgColor,
  },
  tabRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.cornerRadius16,
    padding: SIZES.spacingXXS,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  tabButton: {
    flex: 1,
    paddingVertical: SIZES.spacingS,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: SIZES.cornerRadius12,
  },
  tabButtonActive: {
    backgroundColor: COLORS.purple1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.purple2,
    textAlign: 'center',
  },
  tabTextActive: {
    color: COLORS.white,
  },
  accessoryContainer: {
    marginTop: SIZES.spacingS,
  },
});

export default ProfileTabs;
