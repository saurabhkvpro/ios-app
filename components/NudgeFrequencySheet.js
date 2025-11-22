import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  SafeAreaView,
} from 'react-native';
import { COLORS, SIZES } from '../constants/theme';

const NUDGE_FREQUENCIES = {
  DAILY: 1,
  WEEKLY: 2,
  OFF: 3,
};

const FREQUENCY_OPTIONS = [
  { id: NUDGE_FREQUENCIES.DAILY, label: 'Daily' },
  { id: NUDGE_FREQUENCIES.WEEKLY, label: 'Weekly' },
  { id: NUDGE_FREQUENCIES.OFF, label: 'Off' },
];

/**
 * Nudge Frequency Selection Sheet Component
 * Allows users to select their nudge frequency preference
 */
const NudgeFrequencySheet = ({ visible, selectedFrequency, onSelect, onClose }) => {
  const handleSelect = (frequency) => {
    onSelect(frequency);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.placeholder} />
          <Text style={styles.headerTitle}>Nudge Frequency</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Description */}
        <View style={styles.descriptionContainer}>
          <Text style={styles.description}>
            Choose how often you want to receive nudges to stay connected with your loved ones.
          </Text>
        </View>

        {/* Frequency Options */}
        <View style={styles.optionsContainer}>
          {FREQUENCY_OPTIONS.map((option, index) => {
            const isSelected = selectedFrequency === option.id;
            const isLast = index === FREQUENCY_OPTIONS.length - 1;

            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.optionItem, !isLast && styles.optionItemBorder]}
                onPress={() => handleSelect(option.id)}
                activeOpacity={0.7}
              >
                <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>
                  {option.label}
                </Text>
                {isSelected && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgColor,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.spacingM,
    paddingVertical: SIZES.spacingM,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.purple0,
  },
  placeholder: {
    width: 60,
  },
  closeButton: {
    width: 60,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.purple2,
  },
  doneText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.purple1,
  },
  descriptionContainer: {
    paddingHorizontal: SIZES.spacingM,
    paddingVertical: SIZES.spacingM,
    backgroundColor: COLORS.bgColor,
  },
  description: {
    fontSize: 14,
    color: COLORS.purple3,
    lineHeight: 20,
  },
  optionsContainer: {
    marginTop: SIZES.spacingM,
    marginHorizontal: SIZES.spacingM,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    overflow: 'hidden',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.spacingM,
    paddingVertical: SIZES.spacingM,
    minHeight: 56,
  },
  optionItemBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.purple0,
  },
  optionLabel: {
    fontSize: 16,
    color: COLORS.textColor,
    fontWeight: '400',
  },
  optionLabelSelected: {
    fontWeight: '600',
    color: COLORS.purple1,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.purple1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export { NUDGE_FREQUENCIES };
export default NudgeFrequencySheet;
