import React from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../../constants/theme';

const SettingsToggleRow = ({ label, value, onValueChange, testID }) => {
  return (
    <View style={styles.row} testID={testID}>
      <Text style={styles.label}>{label}</Text>
      <Switch
        value={Boolean(value)}
        onValueChange={onValueChange}
        thumbColor={value ? COLORS.buttonColor : COLORS.white}
        trackColor={{ false: COLORS.purple0, true: COLORS.buttonColor }}
      />
    </View>
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
  label: {
    fontSize: 16,
    color: COLORS.textColor,
    fontWeight: '600',
    flex: 1,
    marginRight: SIZES.spacingM,
  },
});

export default SettingsToggleRow;
