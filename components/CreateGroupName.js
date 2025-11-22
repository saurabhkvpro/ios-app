import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SIZES } from '../constants/theme';

export default function CreateGroupName({
  onNext,
  onBack,
  onSkip,
  initialGroupName = '',
  initialImage = null,
}) {
  const [groupName, setGroupName] = useState(initialGroupName);
  const [groupImage, setGroupImage] = useState(initialImage);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled) {
      setGroupImage(result.assets[0].uri);
    }
  };

  const handleNext = () => {
    if (groupName.trim()) {
      onNext({ groupName: groupName.trim(), groupImage });
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
          <Image
            source={
              groupImage
                ? { uri: groupImage }
                : require('../assets/images/groupImage.png')
            }
            style={[
              styles.groupImage,
              !groupImage && { tintColor: COLORS.purple1 },
            ]}
          />
        </TouchableOpacity>

        <Text style={styles.title}>Create your new group.</Text>

        <View style={styles.formSection}>
          <Text style={styles.label}>Group Name</Text>

          <View style={styles.inputContainer}>
            <Image
              source={require('../assets/images/addGroup.png')}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="Group Name"
              value={groupName}
              onChangeText={setGroupName}
              placeholderTextColor={COLORS.lightGrayColor}
              autoFocus
            />
          </View>

        <TouchableOpacity
          style={[
            styles.nextButton,
            !groupName.trim() && styles.nextButtonDisabled,
          ]}
          onPress={handleNext}
          disabled={!groupName.trim()}
        >
          <Text style={styles.nextButtonText}>Next</Text>
        </TouchableOpacity>

        {onSkip ? (
          <View style={styles.optionalContainer}>
            <Text style={styles.optionalHint}>You can skip this step for now.</Text>
            <TouchableOpacity style={styles.skipButton} onPress={onSkip} activeOpacity={0.8}>
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
      </ScrollView>

      {onBack && (
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Image
            source={require('../assets/images/backButton.png')}
            style={styles.backIcon}
          />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.purple0,
  },
  scrollContent: {
    flexGrow: 1,
    paddingTop: 80,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: SIZES.spacingM,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    width: 24,
    height: 24,
    tintColor: COLORS.purple1,
  },
  imageContainer: {
    alignItems: 'center',
    marginTop: SIZES.spacingXXL,
  },
  groupImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.titleColor,
    textAlign: 'center',
    marginVertical: SIZES.spacingL,
  },
  formSection: {
    paddingHorizontal: SIZES.spacingM,
    marginTop: SIZES.spacingM,
  },
  label: {
    fontSize: 14,
    color: COLORS.purple3,
    marginBottom: SIZES.spacingS,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.cornerRadius12,
    paddingHorizontal: SIZES.spacingM,
    height: SIZES.defaultTextFieldHeight,
  },
  inputIcon: {
    width: 26,
    height: 18,
    tintColor: COLORS.purple1,
    marginRight: SIZES.spacingS,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.black,
    padding: SIZES.spacingM,
    outlineStyle: 'none',
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
    fontSize: 14,
    fontWeight: '600',
  },
  optionalContainer: {
    marginTop: SIZES.spacingM,
    alignItems: 'center',
  },
  optionalHint: {
    fontSize: 13,
    color: COLORS.purple3,
    marginBottom: SIZES.spacingS,
    textAlign: 'center',
  },
  skipButton: {
    paddingHorizontal: SIZES.spacingL,
    paddingVertical: SIZES.spacingS,
  },
  skipButtonText: {
    color: COLORS.purple2,
    fontSize: 14,
    fontWeight: '600',
  },
});
