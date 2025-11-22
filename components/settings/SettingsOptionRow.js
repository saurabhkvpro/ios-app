import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { COLORS, SIZES } from '../../constants/theme';

const SettingsOptionRow = ({
  label,
  onPress,
  disabled = false,
  showDivider = true,
  rightElement,
  testID,
  variant = 'default',
}) => {
  const isDanger = variant === 'danger';
  return (
    <>
      <TouchableOpacity
        style={[styles.row, disabled && styles.rowDisabled]}
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.85}
        testID={testID}
      >
        <Text style={[styles.label, disabled && styles.labelDisabled, isDanger && styles.labelDanger]}>{label}</Text>
        <View style={styles.rightContent}>
          {rightElement || (
            <Feather name="chevron-right" size={20} color={isDanger ? COLORS.errorCode : COLORS.purple2} />
          )}
        </View>
      </TouchableOpacity>
      {showDivider ? <View style={styles.divider} /> : null}
    </>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.spacingM,
    paddingVertical: SIZES.spacingM,
  },
  rowDisabled: {
    opacity: 0.6,
  },
  label: {
    fontSize: 16,
    color: COLORS.textColor,
    fontWeight: '600',
    flex: 1,
  },
  labelDisabled: {
    color: COLORS.purple3,
  },
  labelDanger: {
    color: COLORS.errorCode,
  },
  rightContent: {
    marginLeft: SIZES.spacingS,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.purple0,
    marginHorizontal: SIZES.spacingM,
  },
});

export default SettingsOptionRow;
