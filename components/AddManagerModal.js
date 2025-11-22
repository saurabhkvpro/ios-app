import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  ScrollView,
  Alert,
} from 'react-native';
import { COLORS, SIZES } from '../constants/theme';
import LoadingIndicator from './LoadingIndicator';
import ErrorToast from './ErrorToast';
import ApiService from '../services/api.service';

const AddManagerModal = ({ visible, profileId, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [selectedRelationship, setSelectedRelationship] = useState(0);
  const [relationshipTypes, setRelationshipTypes] = useState([]);
  const [relationshipPickerVisible, setRelationshipPickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState({ visible: false, message: '' });

  const hideError = useCallback(() => setError({ visible: false, message: '' }), []);
  const showError = useCallback((message) => setError({ visible: true, message }), []);

  useEffect(() => {
    if (!visible) return;

    const loadRelationships = async () => {
      try {
        setLoading(true);
        const list = await ApiService.getRelationshipTypes();
        if (Array.isArray(list) && list.length) {
          setRelationshipTypes(list);
        } else {
          setRelationshipTypes([]);
          showError('Unable to load relationship types.');
        }
      } catch (err) {
        setRelationshipTypes([]);
        showError('Unable to load relationship types.');
      } finally {
        setLoading(false);
      }
    };

    loadRelationships();
  }, [visible, showError]);

  const relationshipOptions = useMemo(() => {
    if (!Array.isArray(relationshipTypes) || relationshipTypes.length === 0) {
      return [];
    }

    return relationshipTypes
      .map((item) => ({
        id: Number(item.relationshipTypeId ?? item.id ?? 0),
        label: item.relationshipTypeName ?? item.label ?? '',
      }))
      .filter((option) => option.label && option.id > 0)
      .sort((a, b) => a.id - b.id);
  }, [relationshipTypes]);

  const selectedRelationshipLabel = useMemo(() => {
    const match = relationshipOptions.find((option) => option.id === Number(selectedRelationship));
    return match?.label || null;
  }, [relationshipOptions, selectedRelationship]);

  const openRelationshipPicker = useCallback(() => {
    hideError();
    if (relationshipOptions.length === 0) {
      showError('Relationship types are unavailable.');
      return;
    }
    setRelationshipPickerVisible(true);
  }, [hideError, relationshipOptions, showError]);

  const closeRelationshipPicker = useCallback(() => {
    setRelationshipPickerVisible(false);
  }, []);

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

    if (!selectedRelationship) {
      showError('Please select a relationship type.');
      return;
    }

    Alert.alert(
      'Confirmation',
      'Are you sure you want to add this manager for the connection?',
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
              const response = await ApiService.addManagerToNonAccount(
                profileId,
                email.trim(),
                selectedRelationship
              );

              if (response?.success) {
                Alert.alert('Success', 'Profile manager added successfully.', [
                  {
                    text: 'OK',
                    onPress: () => {
                      setEmail('');
                      setSelectedRelationship(0);
                      onSuccess?.();
                      onClose();
                    },
                  },
                ]);
              } else {
                showError(response?.message || 'Could not add manager.');
              }
            } catch (err) {
              showError(err?.message || 'Could not add manager.');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  }, [email, selectedRelationship, profileId, showError, onSuccess, onClose]);

  const handleClose = useCallback(() => {
    setEmail('');
    setSelectedRelationship(0);
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

              <Text style={styles.title}>Add Manager</Text>
              <Text style={styles.description}>
                Add a user to manage this profile by providing their email and relationship.
              </Text>

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

              <Text style={styles.label}>Relationship Type</Text>
              <TouchableOpacity
                style={[styles.input, styles.dropdownField]}
                onPress={openRelationshipPicker}
                activeOpacity={0.75}
              >
                <Text
                  style={
                    selectedRelationship && selectedRelationshipLabel
                      ? styles.inputValue
                      : styles.inputPlaceholder
                  }
                >
                  {selectedRelationshipLabel || 'Select relationship type'}
                </Text>
                <View style={styles.dropdownChevron} />
              </TouchableOpacity>

              <Modal
                visible={relationshipPickerVisible}
                transparent
                animationType="fade"
                onRequestClose={closeRelationshipPicker}
              >
                <TouchableWithoutFeedback onPress={closeRelationshipPicker}>
                  <View style={styles.pickerBackdrop}>
                    <TouchableWithoutFeedback onPress={() => {}}>
                      <View style={styles.pickerCard}>
                        <Text style={styles.pickerTitle}>Select Relationship</Text>
                        <ScrollView style={styles.pickerList}>
                          {relationshipOptions.map((option) => {
                            const isSelected = option.id === Number(selectedRelationship);
                            return (
                              <TouchableOpacity
                                key={option.id}
                                style={[styles.optionItem, isSelected && styles.optionItemSelected]}
                                activeOpacity={0.7}
                                onPress={() => {
                                  setSelectedRelationship(Number(option.id));
                                  hideError();
                                  closeRelationshipPicker();
                                }}
                              >
                                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                                  {option.label}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                    </TouchableWithoutFeedback>
                  </View>
                </TouchableWithoutFeedback>
              </Modal>

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
    justifyContent: 'center',
  },
  inputPlaceholder: {
    color: COLORS.lightGrayColor,
    fontSize: 14,
  },
  inputValue: {
    color: COLORS.textColor,
    fontSize: 14,
  },
  dropdownField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dropdownChevron: {
    width: 0,
    height: 0,
    marginLeft: SIZES.spacingS,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: COLORS.purple2,
  },
  pickerBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    justifyContent: 'center',
    paddingHorizontal: SIZES.spacingL,
  },
  pickerCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.cornerRadius16,
    paddingVertical: SIZES.spacingM,
    paddingHorizontal: SIZES.spacingM,
    maxHeight: 360,
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.purple2,
    marginBottom: SIZES.spacingM,
  },
  pickerList: {
    paddingBottom: SIZES.spacingXS,
  },
  optionItem: {
    paddingVertical: SIZES.spacingS,
    paddingHorizontal: SIZES.spacingS,
    borderRadius: SIZES.cornerRadius12,
    marginBottom: SIZES.spacingXS,
  },
  optionItemSelected: {
    backgroundColor: COLORS.purple0,
  },
  optionText: {
    fontSize: 14,
    color: COLORS.textColor,
  },
  optionTextSelected: {
    color: COLORS.purple2,
    fontWeight: '600',
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

export default AddManagerModal;
