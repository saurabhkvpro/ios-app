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
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { COLORS, SIZES } from '../../constants/theme';
import { STRINGS } from '../../constants/strings';
import ApiService from '../../services/api.service';
import LoadingIndicator from '../../components/LoadingIndicator';
import ErrorToast from '../../components/ErrorToast';

export default function SignUp() {
  const router = useRouter();
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState({ visible: false, message: '' });

  const [showUserNameError, setShowUserNameError] = useState(false);
  const [showEmailError, setShowEmailError] = useState(false);
  const [showPasswordError, setShowPasswordError] = useState(false);

  // Validation
  const isValidEmail = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email);
  const isValidUserName = /^[a-zA-Z0-9]*$/.test(userName) && userName.length >= 4 && userName.length <= 25;
  const isValidPassword = password.length >= 8 && password.length <= 25;
  const isPasswordMatch = password === confirmPassword;

  const isInvalid =
    !userName.trim() ||
    !email.trim() ||
    !password.trim() ||
    !confirmPassword.trim() ||
    !isValidEmail ||
    !isValidUserName ||
    !isValidPassword ||
    !isPasswordMatch;

  const handleCheckAvailability = async () => {
    if (!isValidUserName) {
      setShowUserNameError(true);
      return;
    }

    try {
      setLoading(true);
      const response = await ApiService.checkUsernameAvailability(userName);

      if (response.success) {
        alert('Username is available!');
      } else {
        setError({
          visible: true,
          message: response.message || 'Username not available',
        });
      }
    } catch (err) {
      setError({
        visible: true,
        message: err.message || 'Error checking username',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNext = async () => {
    if (!isValidUserName) {
      setShowUserNameError(true);
      return;
    }
    if (!isValidEmail) {
      setShowEmailError(true);
      return;
    }
    if (!isValidPassword) {
      setShowPasswordError(true);
      return;
    }

    try {
      setLoading(true);
      setError({ visible: false, message: '' });

      // Check username availability
      const usernameCheck = await ApiService.checkUsernameAvailability(userName);
      if (!usernameCheck.success) {
        setError({
          visible: true,
          message: usernameCheck.message || 'Username not available',
        });
        setLoading(false);
        return;
      }

      // Check email availability
      const emailCheck = await ApiService.checkEmailAvailability(email);
      if (!emailCheck.success || emailCheck.data) {
        setError({
          visible: true,
          message: STRINGS.invalidEmailErrorMessage,
        });
        setLoading(false);
        return;
      }

      // Navigate to profile step with data
      setLoading(false);
      router.push({
        pathname: '/(auth)/signup-flow',
        params: { userName, email, password, confirmPassword },
      });
    } catch (err) {
      setError({
        visible: true,
        message: err.message || STRINGS.registerErrorMessage,
      });
      setLoading(false);
    }
  };

  const handleTermsPress = () => {
    Linking.openURL('https://website-01-dev.azurewebsites.net/terms');
  };

  const handlePrivacyPress = () => {
    Linking.openURL('https://website-01-dev.azurewebsites.net/privacy');
  };

  const handleSupportPress = () => {
    Linking.openURL('https://website-01-dev.azurewebsites.net/support');
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

          <Text style={styles.title}>{STRINGS.signUpTitle}</Text>

          <View style={styles.formContainer}>
            <View style={styles.userNameContainer}>
              <TextInput
                style={[styles.input, styles.inputWithButton]}
                placeholder={STRINGS.userName}
                value={userName}
                onChangeText={(text) => {
                  setUserName(text);
                  setShowUserNameError(false);
                }}
                autoCapitalize="none"
                autoCorrect={false}
                placeholderTextColor={COLORS.lightGrayColor}
              />
              <TouchableOpacity style={styles.checkButton} onPress={handleCheckAvailability}>
                <Text style={styles.checkButtonText}>{STRINGS.checkAvailability}</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder={STRINGS.email}
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setShowEmailError(false);
              }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              placeholderTextColor={COLORS.lightGrayColor}
            />

            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder={STRINGS.passwordPlaceholder}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  setShowPasswordError(false);
                }}
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

            <View style={styles.passwordContainer}>
              <TextInput
                style={styles.passwordInput}
                placeholder={STRINGS.confirmPassword}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                placeholderTextColor={COLORS.lightGrayColor}
              />
              <TouchableOpacity
                style={styles.eyeIcon}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off' : 'eye'}
                  size={22}
                  color={COLORS.purple1}
                />
              </TouchableOpacity>
            </View>

            {showUserNameError && (
              <Text style={styles.errorText}>{STRINGS.usernameValidation}</Text>
            )}
            {showEmailError && (
              <Text style={styles.errorText}>{STRINGS.emailValidation}</Text>
            )}
            {showPasswordError && (
              <Text style={styles.errorText}>{STRINGS.passwordValidation}</Text>
            )}

            <TouchableOpacity
              style={[styles.nextButton, isInvalid && styles.nextButtonDisabled]}
              onPress={handleNext}
              disabled={isInvalid || loading}
            >
              <Text style={styles.nextButtonText}>{STRINGS.next}</Text>
            </TouchableOpacity>

            <Text style={styles.termsText}>
              By clicking Next button, you agree to our{' '}
              <Text style={styles.link} onPress={handleTermsPress}>Terms</Text>,{' '}
              <Text style={styles.link} onPress={handlePrivacyPress}>Privacy Policy</Text> and{' '}
              <Text style={styles.link} onPress={handleSupportPress}>Support</Text>.
            </Text>

            <View style={styles.divider} />

            <View style={styles.signInContainer}>
              <Text style={styles.alreadyHaveAccountText}>
                {STRINGS.alreadyHaveAccount}
              </Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.signInText}>{STRINGS.signIn}</Text>
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
    width: '40%',
    height: undefined,
    aspectRatio: 1,
    alignSelf: 'center',
    marginTop: SIZES.spacingXXL,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.titleColor,
    textAlign: 'center',
    marginVertical: SIZES.spacingL,
  },
  formContainer: {
    paddingHorizontal: SIZES.spacingM,
  },
  userNameContainer: {
    position: 'relative',
    marginVertical: SIZES.spacingS,
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
  inputWithButton: {
    paddingRight: 140,
  },
  checkButton: {
    position: 'absolute',
    right: 5,
    top: '50%',
    transform: [{ translateY: -10 }],
  },
  checkButtonText: {
    color: 'blue',
    fontSize: 13,
    textDecorationLine: 'underline',
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
  errorText: {
    color: 'red',
    fontSize: 13,
    marginLeft: SIZES.spacingS,
    marginTop: -SIZES.spacingS,
    marginBottom: SIZES.spacingS,
  },
  nextButton: {
    height: SIZES.defaultTextFieldHeight,
    backgroundColor: COLORS.buttonColor,
    borderRadius: SIZES.cornerRadius12,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: SIZES.spacingL,
  },
  nextButtonDisabled: {
    opacity: 0.3,
  },
  nextButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  termsText: {
    color: COLORS.purple3,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: SIZES.spacingM,
  },
  link: {
    color: 'blue',
    textDecorationLine: 'underline',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.purple3,
    marginVertical: SIZES.spacingM,
  },
  signInContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: SIZES.spacingM,
  },
  alreadyHaveAccountText: {
    color: COLORS.purple3,
    fontSize: 14,
  },
  signInText: {
    color: COLORS.purple3,
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 4,
  },
});
