import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { COLORS, SIZES } from '../../constants/theme';
import { STRINGS } from '../../constants/strings';
import ApiService from '../../services/api.service';
import LoadingIndicator from '../../components/LoadingIndicator';
import ErrorToast from '../../components/ErrorToast';

export default function ResetPassword() {
  const router = useRouter();
  const { userId, resetKey, code } = useLocalSearchParams();
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState({ visible: false, message: '' });

  // Use either resetKey or code parameter (support both naming conventions)
  const resetCode = resetKey || code;

  useEffect(() => {
    if (!userId || !resetCode) {
      Alert.alert(
        'Invalid Link',
        'This password reset link is invalid or expired. Please request a new one.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(auth)/login'),
          },
        ]
      );
    }
  }, [userId, resetCode]);

  const isValidEmail = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email);
  const isPasswordValid = newPassword.length >= 8;
  const doPasswordsMatch = newPassword === confirmPassword && newPassword !== '';
  const isFormValid = isValidEmail && isPasswordValid && doPasswordsMatch;

  const handleResetPassword = async () => {
    if (!isFormValid) {
      setError({
        visible: true,
        message: STRINGS.passwordsDontMatch,
      });
      return;
    }

    try {
      setLoading(true);
      setError({ visible: false, message: '' });

      const response = await ApiService.resetPassword({
        email,
        code: resetCode,
        password: newPassword,
      });

      if (response.success) {
        Alert.alert(
          'Success',
          'Your password has been reset successfully. Please login with your new password.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(auth)/login'),
            },
          ]
        );
      } else {
        setError({
          visible: true,
          message: response.message || STRINGS.resetPasswordErrorMessage,
        });
      }
    } catch (err) {
      setError({
        visible: true,
        message: err.message || STRINGS.resetPasswordErrorMessage,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <LoadingIndicator visible={loading} />
      <ErrorToast
        visible={error.visible}
        message={error.message}
        onClose={() => setError({ visible: false, message: '' })}
      />

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Image
            source={require('../../assets/images/logoImg.png')}
            style={styles.logo}
            resizeMode="contain"
          />

          <View style={styles.formContainer}>
            <Text style={styles.title}>{STRINGS.resetPasswordTitle}</Text>
            <Text style={styles.subtitle}>{STRINGS.resetPasswordSubtitle}</Text>

            <TextInput
              style={styles.input}
              placeholder={STRINGS.emailAddress}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              placeholderTextColor={COLORS.lightGrayColor}
            />

            <TextInput
              style={styles.input}
              placeholder={STRINGS.newPassword}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor={COLORS.lightGrayColor}
            />

            <TextInput
              style={styles.input}
              placeholder={STRINGS.confirmNewPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor={COLORS.lightGrayColor}
            />

            {email !== '' && !isValidEmail && (
              <Text style={styles.validationText}>{STRINGS.invalidEmailErrorMessage}</Text>
            )}

            {newPassword !== '' && !isPasswordValid && (
              <Text style={styles.validationText}>{STRINGS.passwordValidation}</Text>
            )}

            {confirmPassword !== '' && !doPasswordsMatch && (
              <Text style={styles.validationText}>{STRINGS.passwordsDontMatch}</Text>
            )}

            <TouchableOpacity
              style={[styles.resetButton, !isFormValid && styles.resetButtonDisabled]}
              onPress={handleResetPassword}
              disabled={!isFormValid || loading}
            >
              <Text style={styles.resetButtonText}>{STRINGS.resetPassword}</Text>
            </TouchableOpacity>

            <View style={styles.linksContainer}>
              <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
                <Text style={styles.backToSignInText}>{STRINGS.backToSignIn}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.purple0,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  logo: {
    width: '48%',
    height: undefined,
    aspectRatio: 1.41,
    alignSelf: 'center',
    marginTop: SIZES.iconAppMarginTop * 2,
  },
  formContainer: {
    paddingVertical: SIZES.spacingXL,
    paddingHorizontal: SIZES.spacingM,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.titleColor,
    textAlign: 'center',
    marginBottom: SIZES.spacingS,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.purple3,
    textAlign: 'center',
    marginBottom: SIZES.spacingL,
  },
  input: {
    height: SIZES.defaultTextFieldHeight,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.cornerRadius12,
    paddingHorizontal: SIZES.spacingM,
    marginVertical: SIZES.spacingS,
    fontSize: 16,
    color: COLORS.black,
  },
  validationText: {
    color: COLORS.red,
    fontSize: 12,
    marginTop: SIZES.spacingXS,
    marginLeft: SIZES.spacingS,
  },
  resetButton: {
    height: SIZES.defaultTextFieldHeight,
    backgroundColor: COLORS.buttonColor,
    borderRadius: SIZES.cornerRadius12,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: SIZES.spacingL,
  },
  resetButtonDisabled: {
    opacity: 0.3,
  },
  resetButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  linksContainer: {
    alignItems: 'center',
    marginTop: SIZES.spacingM,
  },
  backToSignInText: {
    color: COLORS.purple3,
    fontStyle: 'italic',
  },
});
