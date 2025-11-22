import React, { useState } from 'react';
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';
import { COLORS, SIZES } from '../../constants/theme';
import { STRINGS } from '../../constants/strings';
import ApiService from '../../services/api.service';
import LoadingIndicator from '../../components/LoadingIndicator';
import ErrorToast from '../../components/ErrorToast';

export default function Login() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState({ visible: false, message: '' });
  const [showPassword, setShowPassword] = useState(false);

  const isInvalid = userName.trim() === '' || password.length < 8;

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError({ visible: false, message: '' });

      const response = await ApiService.login(userName, password);

      if (response.success && response.data) {
        // Check if there's a pending group invitation
        const pendingInvitation = await AsyncStorage.getItem('pendingGroupInvitation');

        if (pendingInvitation) {
          // Clear the pending invitation
          await AsyncStorage.removeItem('pendingGroupInvitation');

          // Parse and trigger the deep link handler
          const invitation = JSON.parse(pendingInvitation);
          const { userId, invitationKey } = invitation;

          // Create the group invite URL and trigger deep link
          const inviteUrl = `https://website-01-dev.azurewebsites.net/GroupInvite?userId=${userId}&code=${invitationKey}`;

          // Navigate to home first, then trigger deep link
          router.replace('/(tabs)/home');

          // Trigger deep link after a short delay to ensure navigation is complete
          setTimeout(() => {
            Linking.openURL(inviteUrl);
          }, 500);
        } else {
          // Normal navigation to home
          router.replace('/(tabs)/home');
        }
      } else {
        setError({
          visible: true,
          message: response.message || STRINGS.loginErrorMessage,
        });
      }
    } catch (err) {
      setError({
        visible: true,
        message: err.message || STRINGS.loginErrorMessage,
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
            <TextInput
              style={styles.input}
              placeholder={STRINGS.username}
              value={userName}
              onChangeText={setUserName}
              autoCapitalize="none"
              autoCorrect={false}
              placeholderTextColor={COLORS.lightGrayColor}
            />

            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder={STRINGS.password}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                placeholderTextColor={COLORS.lightGrayColor}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off' : 'eye'}
                  size={22}
                  color={COLORS.purple1}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.optionsContainer}>
              <TouchableOpacity
                style={styles.rememberMeContainer}
                onPress={() => setRememberMe(!rememberMe)}
              >
                <Image
                  source={
                    rememberMe
                      ? require('../../assets/images/iconChecked.png')
                      : require('../../assets/images/iconUnChecked.png')
                  }
                  style={styles.checkbox}
                />
                <Text style={styles.rememberMeText}>{STRINGS.rememberMe}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push('/(auth)/forgot-password')}>
                <Text style={styles.forgotPasswordText}>{STRINGS.forgotPassword}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.signInButton, isInvalid && styles.signInButtonDisabled]}
              onPress={handleLogin}
              disabled={isInvalid || loading}
            >
              <Text style={styles.signInButtonText}>{STRINGS.loginTitle}</Text>
            </TouchableOpacity>

            <View style={styles.signUpContainer}>
              <Text style={styles.dontHaveAccountText}>{STRINGS.dontHaveAccount}</Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/signup')}>
                <Text style={styles.signUpText}>{STRINGS.signUp}</Text>
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
    marginTop: SIZES.iconAppMarginTop,
  },
  formContainer: {
    padding: SIZES.spacingM,
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
  passwordContainer: {
    position: 'relative',
    marginVertical: SIZES.spacingS,
  },
  passwordInput: {
    height: SIZES.defaultTextFieldHeight,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.cornerRadius12,
    paddingHorizontal: SIZES.spacingM,
    paddingRight: 50,
    fontSize: 16,
    color: COLORS.black,
  },
  eyeIcon: {
    position: 'absolute',
    right: SIZES.spacingM,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    width: 40,
  },
  optionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: SIZES.spacingM,
    paddingHorizontal: SIZES.spacingM,
  },
  rememberMeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 16,
    height: 16,
    tintColor: COLORS.purple1,
  },
  rememberMeText: {
    marginLeft: SIZES.spacingS,
    color: COLORS.purple1,
    fontStyle: 'italic',
  },
  forgotPasswordText: {
    color: COLORS.purple1,
    fontStyle: 'italic',
  },
  signInButton: {
    height: SIZES.defaultTextFieldHeight,
    backgroundColor: COLORS.buttonColor,
    borderRadius: SIZES.cornerRadius12,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: SIZES.spacingL,
  },
  signInButtonDisabled: {
    opacity: 0.3,
  },
  signInButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: SIZES.spacingL,
  },
  dontHaveAccountText: {
    color: COLORS.purple3,
    fontSize: 14,
  },
  signUpText: {
    color: COLORS.purple3,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
});
