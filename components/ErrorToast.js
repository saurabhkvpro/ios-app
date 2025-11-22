import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS, SIZES } from '../constants/theme';

const ErrorToast = ({ visible, message, onClose }) => {
  useEffect(() => {
    if (!visible) {
      return;
    }

    const timeoutId = setTimeout(() => {
      if (typeof onClose === 'function') {
        onClose();
      }
    }, 4000);

    return () => clearTimeout(timeoutId);
  }, [visible, onClose, message]);

  if (!visible) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.message}>{message}</Text>
      <TouchableOpacity onPress={onClose} style={styles.closeButton}>
        <Text style={styles.closeText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: SIZES.spacing64,
    left: SIZES.spacingM,
    right: SIZES.spacingM,
    backgroundColor: COLORS.errorCode,
    borderRadius: SIZES.cornerRadius12,
    padding: SIZES.spacingM,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 1000,
  },
  message: {
    color: COLORS.white,
    flex: 1,
    fontSize: 14,
  },
  closeButton: {
    padding: SIZES.spacingS,
  },
  closeText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ErrorToast;
