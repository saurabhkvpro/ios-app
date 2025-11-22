import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  Modal,
  TouchableWithoutFeedback,
  Image,
  ImageBackground,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { COLORS, SIZES } from '../constants/theme';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorToast from '../components/ErrorToast';
import ApiService from '../services/api.service';
import { buildImageUri } from './user/[profileId]';

const formatDate = (date) => {
  if (!date) return '';

  // Check if it's a valid Date object
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }

  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');

  // Check for NaN values
  if (isNaN(year) || isNaN(month) || isNaN(day)) {

    return '';
  }

  return `${year}-${month}-${day}`;
};

const AddConnection = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const {
    userProfileId,
    isEdit,
    userId,
    firstName: paramFirstName,
    middleName: paramMiddleName,
    lastName: paramLastName,
    email: paramEmail,
    birthdate: paramBirthdate,
    relationshipTypeId: paramRelationshipTypeId,
    profileImage: paramProfileImage,
    backGroundImage: paramBackGroundImage,
    hideRelationshipField: paramHideRelationshipField,
    hideEmailField: paramHideEmailField,
    isProfileEdit: paramIsProfileEdit,
  } = params;

  const initialEmail = typeof paramEmail === 'string' ? paramEmail : '';

  const isEditMode = isEdit === 'true' || isEdit === true;
  const hideRelationshipFieldExplicit =
    paramHideRelationshipField === 'true' || paramHideRelationshipField === '1';
  const shouldShowRelationshipField = !hideRelationshipFieldExplicit;
  const hideEmailFieldExplicit =
    paramHideEmailField === 'true' || paramHideEmailField === '1';
  const shouldShowEmailField = !hideEmailFieldExplicit;
  const isProfileEditMode = paramIsProfileEdit === 'true' || paramIsProfileEdit === '1';


  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState(initialEmail);
  const [selectedRelationship, setSelectedRelationship] = useState(0);
  const [relationshipTypes, setRelationshipTypes] = useState([]);
  const [relationshipPickerVisible, setRelationshipPickerVisible] = useState(false);
  const [birthdate, setBirthdate] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [profileImage, setProfileImage] = useState(null);
  const [backgroundImage, setBackgroundImage] = useState(null);
  const [profileImageUri, setProfileImageUri] = useState(null);
  const [backgroundImageUri, setBackgroundImageUri] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState({ visible: false, message: '' });
  const [relationshipTypesLoaded, setRelationshipTypesLoaded] = useState(false);
  const [pendingRelationshipId, setPendingRelationshipId] = useState(null);

  const hideError = useCallback(() => setError({ visible: false, message: '' }), []);
  const showError = useCallback((message) => setError({ visible: true, message }), []);

  // Load relationship types first
  useEffect(() => {
    if (!shouldShowRelationshipField) {
      setRelationshipTypes([]);
      setRelationshipTypesLoaded(true);
      return;
    }

    const loadRelationships = async () => {
      try {
        setLoading(true);
        const list = await ApiService.getRelationshipTypes();
        if (Array.isArray(list) && list.length) {
          setRelationshipTypes(list);
          setRelationshipTypesLoaded(true);
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
  }, [showError, shouldShowRelationshipField]);

  // Set pending relationship once types are loaded
  useEffect(() => {
    if (!shouldShowRelationshipField) return;
    if (relationshipTypesLoaded && pendingRelationshipId !== null) {
      setSelectedRelationship(pendingRelationshipId);
      setPendingRelationshipId(null);
    }
  }, [relationshipTypesLoaded, pendingRelationshipId, shouldShowRelationshipField]);

  useEffect(() => {
    if (!isEditMode || !userId) {
      return;
    }

    const loadConnectionDetails = async () => {
      try {
        setLoading(true);
        const response = await ApiService.getConnectionDetails(userId);
        const data = response?.data ?? response;

        if (data) {

          setFirstName(data.firstName || '');
          setMiddleName(data.middleName || '');
          setLastName(data.lastName || '');
          setEmail(data.email || '');

          // Parse birthdate - handle ISO format
          if (data.birthdate) {
            try {
              let dateStr = data.birthdate;
              if (dateStr.includes('T')) {
                dateStr = dateStr.split('T')[0];
              }

              const parts = dateStr.split('-');

              if (parts.length === 3) {
                const year = parseInt(parts[0]);
                const month = parseInt(parts[1]) - 1;
                const day = parseInt(parts[2]);

                if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
                  const date = new Date(year, month, day);
                  setBirthdate(date);
                }
              }
            } catch (e) {
              setBirthdate(null);
            }
          }

          if (data.relationshipTypeId !== undefined && data.relationshipTypeId !== null) {
            const relationshipId = Number(data.relationshipTypeId);

            if (relationshipTypesLoaded) {
              setSelectedRelationship(relationshipId);
            } else {
              setPendingRelationshipId(relationshipId);
            }
          }

          if (data.profileImage) {
            const uri = buildImageUri(data.profileImage);
            setProfileImageUri(uri);
          }

          if (data.backGroundImage) {
            const uri = buildImageUri(data.backGroundImage);
            setBackgroundImageUri(uri);
          }
        } else {
          setError({ visible: true, message: 'Unable to load connection details.' });
        }
      } catch (err) {
        console.error('❌ Error loading connection details:', err);
        Alert.alert('Error', err?.message || 'Unable to load connection details.');
      } finally {
        setLoading(false);
      }
    };

    loadConnectionDetails();
  }, [isEditMode, userId, relationshipTypesLoaded]);

  const relationshipOptions = useMemo(() => {
    if (!shouldShowRelationshipField) {
      return [];
    }
    if (!Array.isArray(relationshipTypes) || relationshipTypes.length === 0) {
      return [];
    }

    return relationshipTypes
      .map((item) => ({
        id: Number(item.relationshipTypeId ?? item.id ?? 0),
        label: item.relationshipTypeName ?? item.label ?? '',
      }))
      .filter((option) => option.label)
      .sort((a, b) => a.id - b.id);
  }, [relationshipTypes, shouldShowRelationshipField]);

  const selectedRelationshipLabel = useMemo(() => {
    if (!shouldShowRelationshipField) return null;
    const match = relationshipOptions.find((option) => option.id === Number(selectedRelationship));
    return match?.label || null;
  }, [relationshipOptions, selectedRelationship, shouldShowRelationshipField]);

  const openRelationshipPicker = useCallback(() => {
    if (!shouldShowRelationshipField) return;
    hideError();
    if (relationshipOptions.length === 0) {
      showError('Relationship types are unavailable.');
      return;
    }
    setRelationshipPickerVisible(true);
  }, [hideError, relationshipOptions, showError, shouldShowRelationshipField]);

  const closeRelationshipPicker = useCallback(() => {
    setRelationshipPickerVisible(false);
  }, []);

  const pickProfileImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showError('Permission to access photos is required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setProfileImage(asset);
        setProfileImageUri(asset.uri);

        // Auto-upload profile image if in edit mode
        console.log('🔍 Auto-upload check - isEditMode:', isEditMode, 'userId:', userId);
        if (isEditMode && userId) {
          console.log('✅ Starting auto-upload for profile image...');
          try {
            setLoading(true);
            const response = await ApiService.uploadProfileImage(userId, asset.uri);
            console.log('✅ Profile image upload response:', response);
            Alert.alert('Success', 'Profile image uploaded successfully!');
          } catch (uploadErr) {
            console.error('❌ Error uploading profile image:', uploadErr);
            showError(uploadErr?.message || 'Failed to upload profile image.');
          } finally {
            setLoading(false);
          }
        } else {
          console.log('⚠️ Skipping auto-upload (not in edit mode or no userId)');
        }
      }
    } catch (err) {
      showError('Failed to pick image.');
    }
  }, [showError, isEditMode, userId]);

  const pickBackgroundImage = useCallback(async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        showError('Permission to access photos is required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]) {
        const asset = result.assets[0];
        setBackgroundImage(asset);
        setBackgroundImageUri(asset.uri);

        // Auto-upload background image if in edit mode
        console.log('🔍 Auto-upload check - isEditMode:', isEditMode, 'userId:', userId);
        if (isEditMode && userId) {
          console.log('✅ Starting auto-upload for background image...');
          try {
            setLoading(true);
            const response = await ApiService.uploadBackgroundImage(userId, asset.uri);
            console.log('✅ Background image upload response:', response);
            Alert.alert('Success', 'Background image uploaded successfully!');
          } catch (uploadErr) {
            console.error('❌ Error uploading background image:', uploadErr);
            showError(uploadErr?.message || 'Failed to upload background image.');
          } finally {
            setLoading(false);
          }
        } else {
          console.log('⚠️ Skipping auto-upload (not in edit mode or no userId)');
        }
      }
    } catch (err) {
      showError('Failed to pick image.');
    }
  }, [showError, isEditMode, userId]);

  const uploadImages = useCallback(async (targetProfileId) => {
    if (profileImage && profileImage.uri && profileImage.uri.startsWith('file://')) {
      await ApiService.uploadProfileImage(targetProfileId, profileImage.uri);
    }

    if (backgroundImage && backgroundImage.uri && backgroundImage.uri.startsWith('file://')) {
      await ApiService.uploadBackgroundImage(targetProfileId, backgroundImage.uri);
    }
  }, [profileImage, backgroundImage]);

  const handleSubmit = useCallback(async () => {
    if (!firstName.trim()) {
      showError('First name is required.');
      return;
    }
    if (!lastName.trim()) {
      showError('Last name is required.');
      return;
    }
    if (!birthdate) {
      showError('Date of birth is required.');
      return;
    }
    if (shouldShowRelationshipField && !selectedRelationship) {
      showError('Please select a relationship type.');
      return;
    }

    const payload = {
      isImmediateFamily: true,
      firstName: firstName.trim(),
      middleName: middleName.trim(),
      lastName: lastName.trim(),
      birthdate: birthdate ? formatDate(birthdate) : '',
    };

    if (isEditMode) {
      payload.email = email.trim();
    }

    if (shouldShowRelationshipField) {
      payload.relationshipTypeId = Number(selectedRelationship);
    }

    try {
      setLoading(true);
      let response;

      if (isEditMode) {
        payload.userProfileId = Number(userId);
        response = await ApiService.updateNonAccountProfile(userId, payload);
        if (response?.success) {
          await uploadImages(userId);
        }
      } else {
        payload.userProfileId = Number(userProfileId);
        response = await ApiService.createNonAccountProfile(payload);
        if (response?.success && response?.data?.userProfileId) {
          await uploadImages(response.data.userProfileId);
        }
      }

      if (response?.success) {
        Alert.alert('Success', `Connection ${isEditMode ? 'updated' : 'added'} successfully.`, [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      } else {
        showError(response?.message || `Could not ${isEditMode ? 'update' : 'create'} connection.`);
      }
    } catch (err) {
      showError(err?.message || `Could not ${isEditMode ? 'update' : 'create'} connection.`);
    } finally {
      setLoading(false);
    }
  }, [birthdate, firstName, middleName, lastName, email, selectedRelationship, isEditMode, userId, userProfileId, uploadImages, showError, router, shouldShowRelationshipField]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.bgColor} translucent={false} />
      <ErrorToast visible={error.visible} message={error.message} onClose={hideError} />
      <LoadingIndicator visible={loading} />

      <ScrollView
        contentContainerStyle={styles.content}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
      >
        <Text style={styles.screenTitle}>
          {isEditMode ? (isProfileEditMode ? 'Edit Profile' : 'Edit Connection') : 'Add Connection'}
        </Text>
        {isEditMode && (
          <View style={styles.imageSection}>
            <ImageBackground
              source={backgroundImageUri ? { uri: backgroundImageUri } : require('../assets/images/groupImage.png')}
              style={styles.backgroundImage}
              resizeMode="cover"
            >
              <View style={styles.imageOverlay}>
                <Image
                  source={
                    profileImageUri
                      ? { uri: profileImageUri }
                      : require('../assets/images/iconEmptyProfile.png')
                  }
                  style={styles.profileImageLarge}
                  resizeMode="cover"
                />

                <View style={styles.imageButtonRow}>
                  <TouchableOpacity style={styles.imageButton} onPress={pickBackgroundImage} activeOpacity={0.85}>
                    <Text style={styles.imageButtonText}>Edit Background</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.imageButton} onPress={pickProfileImage} activeOpacity={0.85}>
                    <Text style={styles.imageButtonText}>Edit Profile</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ImageBackground>
          </View>
        )}

        <Text style={styles.label}>First Name</Text>
        <TextInput
          style={styles.input}
          placeholder="First name"
          placeholderTextColor={COLORS.lightGrayColor}
          value={firstName}
          onChangeText={setFirstName}
        />

        <Text style={styles.label}>Middle Name (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="Middle name"
          placeholderTextColor={COLORS.lightGrayColor}
          value={middleName}
          onChangeText={setMiddleName}
        />

        <Text style={styles.label}>Last Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Last name"
          placeholderTextColor={COLORS.lightGrayColor}
          value={lastName}
          onChangeText={setLastName}
        />

        {isEditMode && shouldShowEmailField ? (
          <>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[styles.input, styles.inputReadOnly]}
              placeholder="Email address"
              placeholderTextColor={COLORS.lightGrayColor}
              value={email || ''}
              editable={false}
            />
          </>
        ) : null}

        <Text style={styles.label}>Date of Birth</Text>
        <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
          <Text style={birthdate ? styles.inputValue : styles.inputPlaceholder}>
            {birthdate ? formatDate(birthdate) : 'Select birthdate'}
          </Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={birthdate || new Date()}
            mode="date"
            display="default"
            maximumDate={new Date()}
            onChange={(event, date) => {
              setShowDatePicker(false);
              if (date) {
                setBirthdate(date);
              }
            }}
          />
        )}

        {shouldShowRelationshipField ? (
          <>
            <Text style={styles.label}>Relationship</Text>
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
                <View style={styles.modalBackdrop}>
                  <TouchableWithoutFeedback onPress={() => { }}>
                    <View style={styles.modalCard}>
                      <Text style={styles.modalTitle}>Select Relationship</Text>
                      <ScrollView style={styles.modalList}>
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
          </>
        ) : null}


        <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} activeOpacity={0.85}>
          <Text style={styles.submitButtonText}>{isEditMode ? 'Save Changes' : 'Save Connection'}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelButton} onPress={() => router.back()} activeOpacity={0.7}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgColor,
  },
  content: {
    padding: SIZES.spacingL,
    paddingTop: SIZES.spacingXXL * 1.5,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.purple2,
    marginBottom: SIZES.spacingL,
  },
  imageSection: {
    marginBottom: SIZES.spacingL,
    borderRadius: SIZES.cornerRadius16,
    overflow: 'hidden',
  },
  backgroundImage: {
    width: '100%',
    height: 260,
  },
  imageOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 86, 104, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SIZES.spacingL,
  },
  profileImageLarge: {
    width: 120,
    height: 120,
    borderRadius: 28,
    backgroundColor: COLORS.white,
    borderWidth: 3,
    borderColor: COLORS.white,
    marginBottom: SIZES.spacingM,
  },
  imageButtonRow: {
    flexDirection: 'row',
    gap: SIZES.spacingS,
  },
  imageButton: {
    backgroundColor: COLORS.buttonColor,
    paddingHorizontal: SIZES.spacingM,
    paddingVertical: SIZES.spacingS,
    borderRadius: SIZES.cornerRadius12,
  },
  imageButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
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
  inputReadOnly: {
    backgroundColor: COLORS.purple3,
    color: COLORS.textColor,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    justifyContent: 'center',
    paddingHorizontal: SIZES.spacingL,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.cornerRadius16,
    paddingVertical: SIZES.spacingM,
    paddingHorizontal: SIZES.spacingM,
    maxHeight: 360,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.purple2,
    marginBottom: SIZES.spacingM,
  },
  modalList: {
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
  submitButton: {
    backgroundColor: COLORS.buttonColor,
    paddingVertical: SIZES.spacingM,
    borderRadius: SIZES.cornerRadius12,
    alignItems: 'center',
    marginTop: SIZES.spacingL,
  },
  submitButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    paddingVertical: SIZES.spacingM,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.purple1,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default AddConnection;
