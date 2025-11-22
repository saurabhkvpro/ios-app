import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants/theme';
import { useCreatePost } from '../hooks/useCreatePost';
import LoadingIndicator from '../components/LoadingIndicator';
import ErrorToast from '../components/ErrorToast';
import GroupSelectionBottomSheet from '../components/GroupSelectionBottomSheet';
import LocationPicker from '../components/LocationPicker';

/**
 * Create Post Screen - Add Description
 * Replicates AddDescriptionView from Swift app
 * Allows users to add caption, tags, select groups, and add location before posting
 */
export default function CreatePost() {
  const router = useRouter();
  const { imageUri } = useLocalSearchParams();
  const [tagInput, setTagInput] = useState('');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showGroupPicker, setShowGroupPicker] = useState(false);

  const {
    loading,
    error,
    userGroups,
    selectedGroups,
    caption,
    location,
    setCaption,
    setLocation,
    parseHashTags,
    toggleGroupSelection,
    createPost,
    hideError,
  } = useCreatePost();

  const handleSelectLocation = (placeName, placeId) => {
    setLocation({ address: placeName, placeId: placeId });
  };

  const handleShare = async () => {
    const imageData = { uri: imageUri };
    const result = await createPost(imageData);

    if (result.success) {
      Alert.alert(
        'Success',
        'Your new post will be available soon!',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(tabs)/home'),
          },
        ]
      );
    }
  };

  const handleTagInputChange = (text) => {
    setTagInput(text);
    parseHashTags(text);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <LoadingIndicator visible={loading} />
      <ErrorToast visible={error.visible} message={error.message} onClose={hideError} />

      <Header onBack={() => router.back()} onShare={handleShare} />

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <ImageCaptionSection
            imageUri={imageUri}
            caption={caption}
            onCaptionChange={setCaption}
          />

          <TagsSection tagInput={tagInput} onTagInputChange={handleTagInputChange} />

          <SelectGroupSection
            selectedGroups={selectedGroups}
            onOpenSheet={() => setShowGroupPicker(true)}
          />

          <LocationSection
            location={location.address}
            onOpenPicker={() => setShowLocationPicker(true)}
          />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Group Selection Modal */}
      <GroupSelectionBottomSheet
        visible={showGroupPicker}
        groups={userGroups}
        selectedGroups={selectedGroups}
        onToggleGroup={toggleGroupSelection}
        onClose={() => setShowGroupPicker(false)}
      />

      {/* Location Picker Modal */}
      <LocationPicker
        visible={showLocationPicker}
        onClose={() => setShowLocationPicker(false)}
        onSelectLocation={handleSelectLocation}
      />
    </View>
  );
}

/**
 * Header Component
 */
const Header = ({ onBack, onShare }) => (
  <View style={styles.header}>
    <TouchableOpacity onPress={onBack} style={styles.headerButton}>
      <Image
        source={require('../assets/images/backButton.png')}
        style={styles.headerIcon}
      />
    </TouchableOpacity>
    <Text style={styles.headerTitle}>New Post</Text>
    <TouchableOpacity onPress={onShare} style={styles.headerButton}>
      <Text style={styles.shareButton}>Share</Text>
    </TouchableOpacity>
  </View>
);

/**
 * Image and Caption Section
 */
const ImageCaptionSection = ({ imageUri, caption, onCaptionChange }) => (
  <View style={styles.section}>
    <Image source={{ uri: imageUri }} style={styles.postImage} />
    <TextInput
      style={styles.captionInput}
      placeholder="Write a caption..."
      placeholderTextColor={COLORS.lightGrayColor}
      value={caption}
      onChangeText={onCaptionChange}
      multiline
      numberOfLines={4}
      textAlignVertical="top"
    />
  </View>
);

/**
 * Tags Section
 */
const TagsSection = ({ tagInput, onTagInputChange }) => (
  <View style={styles.inputSection}>
    <Text style={styles.sectionLabel}>Add Tags</Text>
    <TextInput
      style={styles.input}
      placeholder="Add tags (separated by comma or space)"
      placeholderTextColor={COLORS.lightGrayColor}
      value={tagInput}
      onChangeText={onTagInputChange}
    />
  </View>
);

/**
 * Select Group Section
 */
const SelectGroupSection = ({ selectedGroups, onOpenSheet }) => (
  <TouchableOpacity style={styles.selectionRow} onPress={onOpenSheet}>
    <View style={styles.selectionLeft}>
      <Ionicons name="people" size={24} color={COLORS.purple1} style={styles.sectionIcon} />
      <Text style={styles.selectionLabel}>Select Group</Text>
    </View>
    <View style={styles.selectionRight}>
      {selectedGroups.length > 0 && (
        <Text style={styles.selectionCount}>
          {selectedGroups.length} {selectedGroups.length === 1 ? 'group' : 'groups'} selected
        </Text>
      )}
      <Ionicons name="chevron-forward" size={20} color={COLORS.lightGrayColor} />
    </View>
  </TouchableOpacity>
);

/**
 * Location Section
 */
const LocationSection = ({ location, onOpenPicker }) => (
  <TouchableOpacity style={styles.selectionRow} onPress={onOpenPicker}>
    <View style={styles.selectionLeft}>
      <Ionicons name="location" size={24} color={COLORS.purple1} style={styles.sectionIcon} />
      <View style={styles.locationContent}>
        <Text style={styles.selectionLabel}>Add Location</Text>
        {location && (
          <Text style={styles.locationText} numberOfLines={1}>
            {location}
          </Text>
        )}
      </View>
    </View>
    <Ionicons name="chevron-forward" size={20} color={COLORS.lightGrayColor} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.purple0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.spacingM,
    paddingTop: 60,
    paddingBottom: SIZES.spacingM,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGrayColor,
  },
  headerButton: {
    width: 60,
  },
  headerIcon: {
    width: 24,
    height: 24,
    tintColor: COLORS.purple1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.black,
  },
  shareButton: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.purple1,
    textAlign: 'right',
  },
  content: {
    flex: 1,
  },
  section: {
    flexDirection: 'row',
    padding: SIZES.spacingM,
    backgroundColor: COLORS.white,
    marginBottom: SIZES.spacingS,
  },
  postImage: {
    width: 100,
    height: 100,
    borderRadius: SIZES.cornerRadius12,
  },
  captionInput: {
    flex: 1,
    marginLeft: SIZES.spacingM,
    fontSize: 16,
    color: COLORS.black,
    textAlignVertical: 'top',
    outlineStyle: 'none',
  },
  inputSection: {
    backgroundColor: COLORS.white,
    padding: SIZES.spacingM,
    marginBottom: SIZES.spacingS,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: SIZES.spacingS,
  },
  input: {
    height: SIZES.defaultTextFieldHeight,
    borderWidth: 1,
    borderColor: COLORS.purple1,
    borderRadius: SIZES.cornerRadius12,
    paddingHorizontal: SIZES.spacingM,
    fontSize: 16,
    color: COLORS.black,
    outlineStyle: 'none',
  },
  selectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.white,
    padding: SIZES.spacingM,
    marginBottom: SIZES.spacingS,
  },
  selectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionIcon: {
    marginRight: SIZES.spacingS,
  },
  selectionLabel: {
    fontSize: 16,
    color: COLORS.black,
  },
  selectionRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  selectionCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.purple1,
    marginRight: SIZES.spacingS,
  },
  locationContent: {
    flex: 1,
  },
  locationText: {
    fontSize: 14,
    color: COLORS.gray,
    marginTop: SIZES.spacingXS,
  },
});
