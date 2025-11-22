import React, { useCallback, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import ApiService from '../../services/api.service';
import LoadingIndicator from '../../components/LoadingIndicator';
import ErrorToast from '../../components/ErrorToast';
import { COLORS, SIZES } from '../../constants/theme';
import SettingsCard from '../../components/settings/SettingsCard';

const ChangePasswordScreen = () => {
  const router = useRouter();

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState({ visible: false, message: '' });
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const hideError = useCallback(() => setError({ visible: false, message: '' }), []);
  const showError = useCallback((message) => setError({ visible: true, message }), []);

  const isPasswordValid = useMemo(() => newPassword.length >= 8, [newPassword]);
  const passwordsMatch = useMemo(() => newPassword === confirmPassword, [newPassword, confirmPassword]);
  const canSubmit = useMemo(
    () => oldPassword.length > 0 && isPasswordValid && passwordsMatch,
    [oldPassword.length, isPasswordValid, passwordsMatch]
  );

  const passwordTips = useMemo(
    () => [
      'Minimum 8 characters',
      'Include upper & lowercase letters',
      'Add at least one number or symbol',
    ],
    []
  );

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;

    try {
      hideError();
      setLoading(true);
      const response = await ApiService.changePassword({
        oldPassword,
        newPassword,
        confirmPassword,
      });

      const success = response?.success ?? false;
      if (success) {
        Alert.alert('Password Updated', 'Your password has been updated successfully.', [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        showError(response?.message || 'Unable to change password.');
      }
    } catch (err) {
      console.error('Change password error', err);
      showError(err?.message || 'Unable to change password.');
    } finally {
      setLoading(false);
    }
  }, [canSubmit, confirmPassword, hideError, newPassword, oldPassword, router, showError]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={SIZES.spacingXL}
      >
        <StatusBar barStyle="dark-content" />
        <ErrorToast visible={error.visible} message={error.message} onClose={hideError} />
        <LoadingIndicator visible={loading} />

        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.headerAction}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Change Password</Text>
          <View style={styles.headerPlaceholder} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <SettingsCard style={styles.formCard}>
            <Text style={styles.description}>
              Update your password to keep your account secure.
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Current Password</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  value={oldPassword}
                  onChangeText={setOldPassword}
                  placeholder="Enter current password"
                  secureTextEntry={!showOldPassword}
                  style={styles.inputField}
                  placeholderTextColor={COLORS.purple3}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowOldPassword((prev) => !prev)}
                  style={styles.toggleSecure}
                  activeOpacity={0.7}
                >
                  <Text style={styles.toggleSecureText}>{showOldPassword ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>New Password</Text>
              <View
                style={[
                  styles.inputWrapper,
                  !isPasswordValid && newPassword.length > 0 && styles.inputWrapperError,
                ]}
              >
                <TextInput
                  value={newPassword}
                  onChangeText={setNewPassword}
                  placeholder="Enter new password"
                  secureTextEntry={!showNewPassword}
                  style={styles.inputField}
                  placeholderTextColor={COLORS.purple3}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowNewPassword((prev) => !prev)}
                  style={styles.toggleSecure}
                  activeOpacity={0.7}
                >
                  <Text style={styles.toggleSecureText}>{showNewPassword ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
              {!isPasswordValid && newPassword.length > 0 ? (
                <Text style={styles.validationText}>Password must be at least 8 characters.</Text>
              ) : null}
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Confirm New Password</Text>
              <View
                style={[
                  styles.inputWrapper,
                  !passwordsMatch && confirmPassword.length > 0 && styles.inputWrapperError,
                ]}
              >
                <TextInput
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Re-enter new password"
                  secureTextEntry={!showConfirmPassword}
                  style={styles.inputField}
                  placeholderTextColor={COLORS.purple3}
                  autoCapitalize="none"
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword((prev) => !prev)}
                  style={styles.toggleSecure}
                  activeOpacity={0.7}
                >
                  <Text style={styles.toggleSecureText}>{showConfirmPassword ? 'Hide' : 'Show'}</Text>
                </TouchableOpacity>
              </View>
              {!passwordsMatch && confirmPassword.length > 0 ? (
                <Text style={styles.validationText}>Passwords do not match.</Text>
              ) : null}
            </View>

            <View style={styles.requirementsBox}>
              <Text style={styles.requirementsTitle}>Password tips</Text>
              {passwordTips.map((item) => (
                <View key={item} style={styles.requirementRow}>
                  <View style={styles.requirementDot} />
                  <Text style={styles.requirementText}>{item}</Text>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              activeOpacity={canSubmit ? 0.85 : 1}
              disabled={!canSubmit || loading}
            >
              <Text style={styles.submitText}>Update Password</Text>
            </TouchableOpacity>
          </SettingsCard>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgColor,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bgColor,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.spacingM,
    paddingVertical: SIZES.spacingS,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.purple2,
  },
  headerAction: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.purple2,
  },
  headerPlaceholder: {
    width: 48,
  },
  scrollContent: {
    paddingBottom: SIZES.spacingXXL,
  },
  formCard: {
    paddingVertical: SIZES.spacingL,
  },
  description: {
    fontSize: 14,
    color: COLORS.purple3,
    paddingHorizontal: SIZES.spacingM,
    marginBottom: SIZES.spacingL,
  },
  formGroup: {
    marginBottom: SIZES.spacingM,
    paddingHorizontal: SIZES.spacingM,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.purple2,
    marginBottom: SIZES.spacingXS,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.purple0,
    borderRadius: SIZES.cornerRadius12,
    paddingHorizontal: SIZES.spacingM,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputField: {
    flex: 1,
    paddingVertical: SIZES.spacingM,
    fontSize: 16,
    color: COLORS.textColor,
  },
  inputWrapperError: {
    borderColor: COLORS.errorCode,
  },
  validationText: {
    marginTop: SIZES.spacingXS,
    fontSize: 12,
    color: COLORS.errorCode,
    paddingHorizontal: SIZES.spacingM,
  },
  toggleSecure: {
    marginLeft: SIZES.spacingS,
    paddingVertical: SIZES.spacingXS,
  },
  toggleSecureText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.buttonColor,
  },
  requirementsBox: {
    marginTop: SIZES.spacingM,
    marginBottom: SIZES.spacingS,
    paddingHorizontal: SIZES.spacingM,
  },
  requirementsTitle: {
    fontSize: 12,
    color: COLORS.purple3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: SIZES.spacingXS,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.spacingXS,
  },
  requirementDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.buttonColor,
    marginRight: SIZES.spacingS,
  },
  requirementText: {
    fontSize: 13,
    color: COLORS.purple2,
  },
  submitButton: {
    backgroundColor: COLORS.buttonColor,
    borderRadius: SIZES.cornerRadius12,
    paddingVertical: SIZES.spacingM,
    alignItems: 'center',
    marginTop: SIZES.spacingL,
    marginHorizontal: SIZES.spacingM,
  },
  submitButtonDisabled: {
    backgroundColor: COLORS.purple0,
  },
  submitText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ChangePasswordScreen;
