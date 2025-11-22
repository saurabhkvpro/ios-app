import React, { useEffect, useMemo, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { COLORS, SIZES } from '../constants/theme';

const REPORT_REASONS = [
  'Spam',
  'Harassment or hate speech',
  'Impersonation',
  'Nudity or sexual content',
  'Violence or harmful behavior',
  'Other',
];

const ReportUserModal = ({
  visible,
  onClose,
  onSubmit,
  loading = false,
  userName = '',
}) => {
  const [selectedReason, setSelectedReason] = useState(null);
  const [details, setDetails] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!visible) {
      setSelectedReason(null);
      setDetails('');
      setError('');
    }
  }, [visible]);

  const canSubmit = useMemo(() => {
    if (!selectedReason) return false;
    if (selectedReason === 'Other') {
      return details.trim().length > 0;
    }
    return true;
  }, [details, selectedReason]);

  const handleReasonSelect = (reason) => {
    setSelectedReason(reason);
    setError('');
    if (reason !== 'Other') {
      setDetails('');
    }
  };

  const handleSubmit = () => {
    if (!canSubmit || loading) {
      if (!canSubmit) {
        setError('Please select a reason.');
      }
      return;
    }

    const payload = selectedReason === 'Other' ? details.trim() : selectedReason;
    onSubmit && onSubmit(payload);
  };

  const handleClose = () => {
    if (loading) return;
    onClose && onClose();
  };

  const headerSubtitle = useMemo(() => {
    if (!userName) return null;
    return `Reporting ${userName}`;
  }, [userName]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.backdrop}>
        <Pressable style={styles.dismissArea} onPress={handleClose} />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetContainer}
        >
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.header}>
              <Text style={styles.title}>Why are you reporting this user?</Text>
              {headerSubtitle ? (
                <Text style={styles.subtitle} numberOfLines={2}>
                  {headerSubtitle}
                </Text>
              ) : null}
            </View>

            <ScrollView style={styles.reasonsList} contentContainerStyle={styles.reasonsContent}>
              {REPORT_REASONS.map((reason) => {
                const isSelected = selectedReason === reason;
                return (
                  <TouchableOpacity
                    key={reason}
                    style={[styles.reasonRow, isSelected && styles.reasonRowSelected]}
                    onPress={() => handleReasonSelect(reason)}
                    activeOpacity={0.75}
                    disabled={loading}
                  >
                    <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                      {isSelected ? <View style={styles.radioInner} /> : null}
                    </View>
                    <Text style={styles.reasonText}>{reason}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {selectedReason === 'Other' ? (
              <View style={styles.textAreaContainer}>
                <Text style={styles.textAreaLabel}>Tell us more</Text>
                <TextInput
                  value={details}
                  onChangeText={setDetails}
                  editable={!loading}
                  placeholder="Provide additional detail"
                  placeholderTextColor={COLORS.purple3}
                  style={styles.textArea}
                  multiline
                  maxLength={500}
                />
              </View>
            ) : null}

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={handleClose}
                activeOpacity={loading ? 1 : 0.75}
                disabled={loading}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryButton, (!canSubmit || loading) && styles.primaryButtonDisabled]}
                onPress={handleSubmit}
                activeOpacity={(!canSubmit || loading) ? 1 : 0.75}
                disabled={!canSubmit || loading}
              >
                {loading ? (
                  <ActivityIndicator color={COLORS.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>Submit</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    ...StyleSheet.absoluteFillObject,
  },
  sheetContainer: {
    width: '100%',
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: SIZES.cornerRadius16,
    borderTopRightRadius: SIZES.cornerRadius16,
    paddingHorizontal: SIZES.spacingL,
    paddingTop: SIZES.spacingL,
    paddingBottom: SIZES.spacingXL,
  },
  header: {
    marginBottom: SIZES.spacingM,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.purple2,
    marginBottom: SIZES.spacingS,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.purple3,
  },
  reasonsList: {
    maxHeight: 240,
  },
  reasonsContent: {
    paddingBottom: SIZES.spacingS,
  },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SIZES.spacingS,
  },
  reasonRowSelected: {
    backgroundColor: COLORS.purple0,
    borderRadius: SIZES.cornerRadius12,
    paddingHorizontal: SIZES.spacingS,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.purple2,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.spacingS,
  },
  radioOuterSelected: {
    borderColor: COLORS.buttonColor,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.buttonColor,
  },
  reasonText: {
    flex: 1,
    fontSize: 15,
    color: COLORS.purple2,
  },
  textAreaContainer: {
    marginTop: SIZES.spacingM,
  },
  textAreaLabel: {
    fontSize: 14,
    color: COLORS.purple3,
    marginBottom: SIZES.spacingXS,
  },
  textArea: {
    minHeight: 120,
    borderRadius: SIZES.cornerRadius12,
    borderWidth: 1,
    borderColor: COLORS.purple0,
    paddingHorizontal: SIZES.spacingM,
    paddingVertical: SIZES.spacingS,
    textAlignVertical: 'top',
    color: COLORS.textColor,
    backgroundColor: COLORS.bgColor,
  },
  errorText: {
    marginTop: SIZES.spacingS,
    color: COLORS.errorCode,
    fontSize: 13,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: SIZES.spacingL,
  },
  secondaryButton: {
    paddingVertical: SIZES.spacingS,
    paddingHorizontal: SIZES.spacingL,
    marginRight: SIZES.spacingS,
  },
  secondaryButtonText: {
    fontSize: 15,
    color: COLORS.purple3,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: COLORS.buttonColor,
    borderRadius: SIZES.cornerRadius12,
    paddingHorizontal: SIZES.spacingL,
    paddingVertical: SIZES.spacingS,
  },
  primaryButtonDisabled: {
    backgroundColor: COLORS.purple0,
  },
  primaryButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default ReportUserModal;
