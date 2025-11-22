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
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { COLORS, SIZES } from '../../constants/theme';
import { STRINGS } from '../../constants/strings';
import ApiService from '../../services/api.service';
import LoadingIndicator from '../../components/LoadingIndicator';
import ErrorToast from '../../components/ErrorToast';

export default function ForgotPassword() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState({ visible: false, message: '' });
  const [success, setSuccess] = useState(false);

  const isValidEmail = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email);

  const handleSend = async () => {
    if (!isValidEmail) {
      setError({
        visible: true,
        message: STRINGS.invalidEmailErrorMessage,
      });
      return;
    }

    try {
      setLoading(true);
      setError({ visible: false, message: '' });

      const response = await ApiService.forgotPassword(email);

      if (response.success) {
        setSuccess(true);
        Alert.alert(
          'Success',
          STRINGS.forgotPwdSuccessMessage,
          [
            {
              text: 'OK',
              onPress: () => router.back(),
            },
          ]
        );
      } else {
        setError({
          visible: true,
          message: response.message || STRINGS.forgotPwdErrorMessage,
        });
      }
    } catch (err) {
      setError({
        visible: true,
        message: err.message || STRINGS.forgotPwdErrorMessage,
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
            <Text style={styles.title}>{STRINGS.forgotPasswordTitle}</Text>

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

            <TouchableOpacity
              style={[styles.sendButton, !isValidEmail && styles.sendButtonDisabled]}
              onPress={handleSend}
              disabled={!isValidEmail || loading}
            >
              <Text style={styles.sendButtonText}>{STRINGS.send}</Text>
            </TouchableOpacity>

            <View style={styles.linksContainer}>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.backToSignInText}>{STRINGS.backToSignIn}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.signUpContainer}>
              <Text style={styles.dontHaveAccountText}>{STRINGS.dontHaveAccount}</Text>
              <TouchableOpacity
                onPress={() => {
                  router.back();
                  router.push('/(auth)/signup');
                }}
              >
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
  sendButton: {
    height: SIZES.defaultTextFieldHeight,
    backgroundColor: COLORS.buttonColor,
    borderRadius: SIZES.cornerRadius12,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: SIZES.spacingL,
  },
  sendButtonDisabled: {
    opacity: 0.3,
  },
  sendButtonText: {
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
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SIZES.spacingLarge,
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
