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
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, SIZES } from '../../constants/theme';
import { STRINGS } from '../../constants/strings';
import ApiService from '../../services/api.service';
import LoadingIndicator from '../../components/LoadingIndicator';
import ErrorToast from '../../components/ErrorToast';
import CreateGroupName from '../../components/CreateGroupName';
import MakingMemories from '../../components/MakingMemories';
import AddMember from '../../components/AddMember';

export default function SignUpFlow() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState({ visible: false, message: '' });

  // Get data from signup screen
  const [userName, setUserName] = useState(params.userName || '');
  const [email, setEmail] = useState(params.email || '');
  const [password, setPassword] = useState(params.password || '');
  const [confirmPassword, setConfirmPassword] = useState(params.confirmPassword || '');

  // Step 1: Profile Info
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [profileImage, setProfileImage] = useState(null);

  // Step 2: Additional Info
  const [hobbies, setHobbies] = useState('');
  const [aboutMe, setAboutMe] = useState('');

  // Step 3: Group Creation
  const [groupName, setGroupName] = useState('');
  const [groupImage, setGroupImage] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [showAddMember, setShowAddMember] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setProfileImage(result.assets[0].uri);
    }
  };

  const formatDate = (date) => {
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}-${day}-${year}`;
  };

  const handleNext = async () => {
    if (currentStep === 0) {
      // Step 0: Profile Info (name and birthday)
      if (!firstName.trim() || !lastName.trim()) {
        setError({ visible: true, message: 'Please enter your name' });
        return;
      }

      // Register user
      try {
        setLoading(true);

        const registerData = {
          email,
          userName,
          firstName,
          lastName,
          password,
          confirmPassword,
          dateOfBirth: formatDate(dateOfBirth),
        };

        const response = await ApiService.register(registerData);

        if (response.success) {
          // Auto login
          await ApiService.login(userName, password);
          setLoading(false);
          setCurrentStep(1);
        } else {
          setError({ visible: true, message: response.message || STRINGS.registerErrorMessage });
          setLoading(false);
        }
      } catch (err) {
        setError({ visible: true, message: err.message || STRINGS.registerErrorMessage });
        setLoading(false);
      }
    } else if (currentStep === 1) {
      // Step 1: About (hobbies, about me) - Optional
      setCurrentStep(2);
    }
  };

  const handleGroupNameNext = (data) => {
    setGroupName(data.groupName);
    setGroupImage(data.groupImage);
    setCurrentStep(3); // Go to making memories screen
  };

  const handleAddMemberPress = () => {
    setShowAddMember(true);
  };

  const handleMemberAdded = (member) => {
    setGroupMembers([...groupMembers, member]);
  };

  const handleRemoveMember = (index) => {
    setGroupMembers(groupMembers.filter((_, i) => i !== index));
  };

  const handleCreateGroup = async () => {
    const trimmedName = groupName.trim();
    if (!trimmedName) {
      setError({ visible: true, message: 'Please enter a group name before continuing' });
      return;
    }

    if (trimmedName !== groupName) {
      setGroupName(trimmedName);
    }

    const groupData = {
      groupName: trimmedName,
      invitedMembers: Array.isArray(groupMembers) ? groupMembers : [],
    };

    try {
      setLoading(true);
      const response = await ApiService.createGroup(groupData);

      if (response?.success) {
        setCurrentStep(4); // Go to welcome screen
        return;
      }

      const message = response?.message || 'Failed to create group';
      setError({ visible: true, message });
    } catch (err) {
      setError({ visible: true, message: err.message || 'Failed to create group' });
    } finally {
      setLoading(false);
    }
  };

  const handleWelcomeNext = () => {
    router.replace('/(tabs)/home');
  };

  const handleSkip = () => {
    if (currentStep === 1) {
      // Skip about me, go to group creation
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Skip group creation, go to home
      router.replace('/(tabs)/home');
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <View style={styles.formContainer}>
            <TouchableOpacity onPress={pickImage} style={styles.imagePickerContainer}>
              <Image
                source={profileImage ? { uri: profileImage } : require('../../assets/images/iconProfile.png')}
                style={styles.profileImage}
              />
              <Text style={styles.imagePickerText}>Tap to add photo</Text>
            </TouchableOpacity>

            <Text style={styles.title}>What's your name{'\n'}and birthday?</Text>

            <TextInput
              style={styles.input}
              placeholder="First Name"
              value={firstName}
              onChangeText={setFirstName}
              placeholderTextColor={COLORS.lightGrayColor}
            />

            <TextInput
              style={styles.input}
              placeholder="Last Name"
              value={lastName}
              onChangeText={setLastName}
              placeholderTextColor={COLORS.lightGrayColor}
            />

            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={styles.dateText}>{formatDate(dateOfBirth)}</Text>
              <Ionicons
                name="calendar-outline"
                size={24}
                color={COLORS.purple1}
              />
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={dateOfBirth}
                mode="date"
                display="default"
                onChange={(event, selectedDate) => {
                  setShowDatePicker(false);
                  if (selectedDate) {
                    setDateOfBirth(selectedDate);
                  }
                }}
                maximumDate={new Date()}
              />
            )}

            <TouchableOpacity
              style={[styles.nextButton, (!firstName.trim() || !lastName.trim()) && styles.nextButtonDisabled]}
              onPress={handleNext}
              disabled={!firstName.trim() || !lastName.trim() || loading}
            >
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>
          </View>
        );

      case 1:
        return (
          <View style={styles.formContainer}>
            <TouchableOpacity onPress={pickImage} style={styles.imagePickerContainer}>
              <Image
                source={profileImage ? { uri: profileImage } : require('../../assets/images/iconProfile.png')}
                style={styles.profileImage}
              />
            </TouchableOpacity>

            <Text style={styles.title}>What do you like to do?</Text>

            <Text style={styles.label}>Hobbies</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Hobbies"
              value={hobbies}
              onChangeText={setHobbies}
              multiline
              numberOfLines={4}
              placeholderTextColor={COLORS.lightGrayColor}
            />

            <Text style={styles.label}>About Me</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="About Me"
              value={aboutMe}
              onChangeText={setAboutMe}
              multiline
              numberOfLines={4}
              placeholderTextColor={COLORS.lightGrayColor}
            />

            <TouchableOpacity
              style={[styles.nextButton, (!hobbies.trim() && !aboutMe.trim()) && styles.nextButtonDisabled]}
              onPress={handleNext}
              disabled={!hobbies.trim() && !aboutMe.trim()}
            >
              <Text style={styles.nextButtonText}>Next</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.skipButton} onPress={handleSkip}>
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
          </View>
        );

      case 2:
        return (
          <CreateGroupName
            onNext={handleGroupNameNext}
            onBack={() => setCurrentStep(1)}
            onSkip={() => handleSkip()}
            initialGroupName={groupName}
            initialImage={groupImage}
          />
        );

      case 3:
        return (
          <>
            <MakingMemories
              groupName={groupName}
              groupImage={groupImage}
              members={groupMembers}
              onAddMember={handleAddMemberPress}
              onRemoveMember={handleRemoveMember}
              onCreateGroup={handleCreateGroup}
              onSkip={handleSkip}
              showSkip={true}
            />
            <AddMember
              visible={showAddMember}
              groupName={groupName}
              groupImage={groupImage}
              onClose={() => setShowAddMember(false)}
              onAddMember={handleMemberAdded}
              existingMembers={groupMembers}
            />
          </>
        );

      case 4:
        // Welcome screen
        return (
          <View style={styles.formContainer}>
            <Image
              source={require('../../assets/images/logoImg.png')}
              style={styles.welcomeLogo}
              resizeMode="contain"
            />

            <Text style={styles.welcomeTitle}>Welcome to {groupName}!</Text>
            <Text style={styles.welcomeSubtitle}>
              Start making some memories and{'\n'}share them in your private groups!
            </Text>

            <TouchableOpacity style={styles.nextButton} onPress={handleWelcomeNext}>
              <Text style={styles.nextButtonText}>Start making memories</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
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

      {/* Progress Indicator - only show for first 3 steps */}
      {currentStep < 3 && (
        <View style={styles.progressContainer}>
          {[0, 1, 2].map((step) => (
            <View
              key={step}
              style={[
                styles.progressDot,
                currentStep >= step && styles.progressDotActive,
              ]}
            />
          ))}
        </View>
      )}

      {currentStep < 2 ? (
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            {renderStep()}
          </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        renderStep()
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.purple0,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
  },
  progressDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.lightGrayColor,
    marginHorizontal: 6,
  },
  progressDotActive: {
    backgroundColor: COLORS.purple1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },
  formContainer: {
    padding: SIZES.spacingM,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.titleColor,
    textAlign: 'center',
    marginBottom: SIZES.spacingL,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.titleColor,
    textAlign: 'center',
    marginBottom: SIZES.spacingL,
    opacity: 0.7,
  },
  input: {
    height: SIZES.defaultTextFieldHeight,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.cornerRadius12,
    paddingHorizontal: SIZES.spacingM,
    marginVertical: SIZES.spacingS,
    fontSize: 16,
    color: COLORS.black,
    borderWidth: 0,
    borderColor: 'transparent',
    outlineStyle: 'none',
  },
  textArea: {
    height: 100,
    paddingTop: SIZES.spacingM,
    textAlignVertical: 'top',
  },
  imagePickerContainer: {
    alignItems: 'center',
    marginVertical: SIZES.spacingL,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.lightGrayColor,
  },
  groupImageLarge: {
    width: 120,
    height: 120,
  },
  imagePickerText: {
    marginTop: SIZES.spacingS,
    color: COLORS.purple1,
    fontSize: 14,
  },
  dateInput: {
    height: SIZES.defaultTextFieldHeight,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.cornerRadius12,
    paddingHorizontal: SIZES.spacingM,
    marginVertical: SIZES.spacingS,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  dateText: {
    fontSize: 16,
    color: COLORS.black,
  },
  nextButton: {
    height: SIZES.defaultTextFieldHeight,
    backgroundColor: COLORS.buttonColor,
    borderRadius: SIZES.cornerRadius12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SIZES.spacingL,
  },
  nextButtonDisabled: {
    opacity: 0.3,
  },
  nextButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    marginTop: SIZES.spacingM,
    padding: SIZES.spacingM,
    alignItems: 'center',
  },
  skipButtonText: {
    color: COLORS.purple3,
    fontSize: 14,
    fontWeight: 'bold',
  },
  skipContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SIZES.spacingM,
  },
  skipLaterText: {
    color: COLORS.purple3,
    fontSize: 14,
  },
  label: {
    fontSize: 14,
    color: COLORS.purple3,
    marginTop: SIZES.spacingM,
    marginBottom: SIZES.spacingS,
    alignSelf: 'flex-start',
  },
  groupInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.cornerRadius12,
    marginVertical: SIZES.spacingS,
    paddingHorizontal: SIZES.spacingM,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  groupIcon: {
    width: 26,
    height: 18,
    tintColor: COLORS.purple1,
    marginRight: SIZES.spacingS,
  },
  groupInput: {
    flex: 1,
    height: SIZES.defaultTextFieldHeight,
    fontSize: 16,
    color: COLORS.black,
    padding: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    outlineStyle: 'none',
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.cornerRadius12,
    padding: SIZES.spacingM,
    marginVertical: SIZES.spacingS,
  },
  groupIconSmall: {
    width: 30,
    height: 30,
    tintColor: COLORS.purple1,
    marginRight: SIZES.spacingM,
  },
  groupNameText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.black,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.lightGrayColor,
    marginVertical: SIZES.spacingM,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.cornerRadius12,
    padding: SIZES.spacingM,
    marginVertical: SIZES.spacingS,
  },
  removeButton: {
    padding: SIZES.spacingS,
  },
  memberName: {
    fontSize: 16,
    color: COLORS.black,
    fontWeight: '600',
  },
  relationshipText: {
    fontSize: 14,
    color: COLORS.purple3,
    marginTop: 2,
  },
  addMemberButton: {
    height: SIZES.defaultTextFieldHeight,
    backgroundColor: COLORS.purple1,
    borderRadius: SIZES.cornerRadius12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SIZES.spacingM,
  },
  relationshipScroll: {
    marginVertical: SIZES.spacingS,
  },
  relationshipChip: {
    paddingHorizontal: SIZES.spacingM,
    paddingVertical: SIZES.spacingS,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    marginRight: SIZES.spacingS,
    borderWidth: 1,
    borderColor: COLORS.lightGrayColor,
  },
  relationshipChipSelected: {
    backgroundColor: COLORS.purple1,
    borderColor: COLORS.purple1,
  },
  relationshipChipText: {
    fontSize: 14,
    color: COLORS.black,
  },
  relationshipChipTextSelected: {
    color: COLORS.white,
  },
  welcomeLogo: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginVertical: SIZES.spacingXL,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: COLORS.titleColor,
    textAlign: 'center',
    marginBottom: SIZES.spacingM,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: COLORS.titleColor,
    textAlign: 'center',
    marginBottom: SIZES.spacingXL,
    opacity: 0.8,
    lineHeight: 24,
  },
});
