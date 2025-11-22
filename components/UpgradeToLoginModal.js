import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { COLORS, SIZES } from '../constants/theme';
import LoadingIndicator from './LoadingIndicator';
import ErrorToast from './ErrorToast';
import ApiService from '../services/api.service';

const UpgradeToLoginModal = ({ visible, profileId, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState({ visible: false, message: '' });

  const hideError = useCallback(() => setError({ visible: false, message: '' }), []);
  const showError = useCallback((message) => setError({ visible: true, message }), []);

  const handleSubmit = useCallback(async () => {
    if (!email.trim()) {
      showError('Email is required.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      showError('Please enter a valid email address.');
      return;
    }

    Alert.alert(
      'Confirmation',
      'Are you sure you want to upgrade this connection to a login account?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'OK',
          onPress: async () => {
            try {
              setLoading(true);
              const response = await ApiService.upgradeNonAccountToLogin(profileId, email.trim());

              if (response?.success) {
                Alert.alert('Success', 'Account upgraded successfully. The user will receive an email to set up their login.', [
                  {
                    text: 'OK',
                    onPress: () => {
                      setEmail('');
                      onSuccess?.();
                      onClose();
                    },
                  },
                ]);
              } else {
                showError(response?.message || 'Could not upgrade account.');
              }
            } catch (err) {
              showError(err?.message || 'Could not upgrade account.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }, [email, profileId, showError, onSuccess, onClose]);

  const handleClose = useCallback(() => {
    setEmail('');
    hideError();
    onClose();
  }, [hideError, onClose]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={handleClose}>
      <TouchableWithoutFeedback onPress={handleClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.modalCard}>
              <ErrorToast visible={error.visible} message={error.message} onClose={hideError} />
              <LoadingIndicator visible={loading} />

              <Text style={styles.title}>Upgrade Account</Text>
              <Text style={styles.description}>Add an email address for this account to enable login access.</Text>

              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter email address"
                placeholderTextColor={COLORS.lightGrayColor}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />

              <View style={styles.buttonRow}>
                <TouchableOpacity style={styles.cancelButton} onPress={handleClose} activeOpacity={0.7}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveButton} onPress={handleSubmit} activeOpacity={0.85}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    paddingHorizontal: SIZES.spacingL,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.cornerRadius16,
    padding: SIZES.spacingL,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.purple2,
    marginBottom: SIZES.spacingS,
  },
  description: {
    fontSize: 14,
    color: COLORS.purple2,
    marginBottom: SIZES.spacingL,
  },
  label: {
    fontSize: 14,
    color: COLORS.purple2,
    marginBottom: SIZES.spacingXS,
    fontWeight: '600',
  },
  input: {
    height: SIZES.defaultTextFieldHeight,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.cornerRadius12,
    paddingHorizontal: SIZES.spacingM,
    marginBottom: SIZES.spacingM,
    borderWidth: 1,
    borderColor: COLORS.purple0,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: SIZES.spacingS,
    marginTop: SIZES.spacingM,
  },
  cancelButton: {
    paddingHorizontal: SIZES.spacingL,
    paddingVertical: SIZES.spacingS,
  },
  cancelButtonText: {
    color: COLORS.purple2,
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: COLORS.buttonColor,
    paddingHorizontal: SIZES.spacingL,
    paddingVertical: SIZES.spacingS,
    borderRadius: SIZES.cornerRadius12,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default UpgradeToLoginModal;
