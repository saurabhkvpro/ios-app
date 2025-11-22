import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  Modal,
  Pressable,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import LoadingIndicator from '../../components/LoadingIndicator';
import ErrorToast from '../../components/ErrorToast';
import ApiService from '../../services/api.service';
import { COLORS, SIZES } from '../../constants/theme';
import { normalizeProfilePayload, buildImageUri } from './[profileId]';

const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_GUTTER = SIZES.spacingS;
const GRID_COLUMNS = 3;
const ITEM_SIZE = Math.floor(
  (SCREEN_WIDTH - SIZES.spacingM * 2 - GRID_GUTTER * (GRID_COLUMNS - 1)) / GRID_COLUMNS
);

const PhotosScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const profileIdParam = Array.isArray(params.profileId) ? params.profileId[0] : params.profileId;
  const allowUploadParam = Array.isArray(params.allowUpload) ? params.allowUpload[0] : params.allowUpload;
  const profileIdNumber = useMemo(() => {
    const numeric = Number(profileIdParam);
    return Number.isFinite(numeric) ? numeric : null;
  }, [profileIdParam]);
  const allowUpload = useMemo(() => allowUploadParam === '1' || allowUploadParam === 'true', [allowUploadParam]);

  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [previewUri, setPreviewUri] = useState(null);
  const [deleteMode, setDeleteMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!profileIdNumber) {
      setError('Missing profile reference.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const response = await ApiService.getUserPublicProfile(profileIdNumber);
      const normalized = normalizeProfilePayload(response);
      const list = Array.isArray(normalized?.uploadedImages) ? normalized.uploadedImages : [];
      setPhotos(list.slice().reverse());
    } catch (err) {
      setError(err?.message || 'Unable to load photos.');
    } finally {
      setLoading(false);
    }
  }, [profileIdNumber]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleUpload = useCallback(async () => {
    if (!allowUpload || !profileIdNumber) {
      return;
    }

    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError('Media library permission is required to upload photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: false,
        quality: 0.9,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      setUploading(true);
      await ApiService.uploadUserImage(profileIdNumber, result.assets[0]);
      await loadProfile();
    } catch (err) {
      setError(err?.message || 'Failed to upload photo.');
    } finally {
      setUploading(false);
    }
  }, [allowUpload, loadProfile, profileIdNumber]);

  const handleLongPress = useCallback(() => {
    if (allowUpload) {
      setDeleteMode(true);
    }
  }, [allowUpload]);

  const toggleItemSelection = useCallback((item) => {
    setSelectedItem((prev) => {
      // If clicking the same item, deselect it
      if (prev?.userProfileImageId === item.userProfileImageId) {
        return null;
      }
      // Otherwise, select the new item (deselecting any previous selection)
      return item;
    });
  }, []);

  const cancelDeleteMode = useCallback(() => {
    setDeleteMode(false);
    setSelectedItem(null);
  }, []);

  const handleDeleteSelected = useCallback(async () => {
    if (!selectedItem) return;

    try {
      setDeleting(true);
      setError(null);

      await ApiService.deleteUserImage(selectedItem.userProfileImageId);
      await loadProfile();
      setDeleteMode(false);
      setSelectedItem(null);
    } catch (err) {
      setError(err?.message || 'Failed to delete photo.');
    } finally {
      setDeleting(false);
    }
  }, [selectedItem, loadProfile]);

  const renderItem = ({ item }) => {
    const uri = item.userImageSrcUrl ? buildImageUri(item.userImageSrcUrl) : null;
    const isSelected = selectedItem?.userProfileImageId === item.userProfileImageId;

    return (
      <TouchableOpacity
        style={styles.gridItem}
        activeOpacity={0.8}
        onPress={() => {
          if (deleteMode) {
            toggleItemSelection(item);
          } else if (uri) {
            setPreviewUri(uri);
          }
        }}
        onLongPress={handleLongPress}
        delayLongPress={500}
      >
        {uri ? (
          <Image source={{ uri }} style={styles.photo} resizeMode="cover" />
        ) : (
          <View style={styles.photoPlaceholder}>
            <Text style={styles.placeholderText}>No Preview</Text>
          </View>
        )}
        {deleteMode && (
          <View style={styles.selectionOverlay}>
            <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
              {isSelected && <Text style={styles.checkmark}>✓</Text>}
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <StatusBar barStyle="light-content" />
      <View style={styles.container}>
        <View style={styles.header}>
          {deleteMode ? (
            <>
              <TouchableOpacity onPress={cancelDeleteMode} style={styles.headerButton}>
                <Text style={styles.headerButtonText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>
                {selectedItem ? '1 Selected' : 'Select Photo'}
              </Text>
              <TouchableOpacity
                onPress={handleDeleteSelected}
                style={[styles.headerButton, styles.deleteButton, !selectedItem && styles.disabledButton]}
                disabled={!selectedItem}
              >
                <Text style={[styles.headerButtonText, !selectedItem && styles.disabledButtonText]}>
                  Delete
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity onPress={() => router.back()} style={styles.headerButton}>
                <Text style={styles.headerButtonText}>Close</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle}>Photos</Text>
              {allowUpload ? (
                <TouchableOpacity onPress={handleUpload} style={styles.headerButton}>
                  <Text style={styles.headerButtonText}>Upload</Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.headerButtonPlaceholder} />
              )}
            </>
          )}
        </View>

        {photos.length === 0 && !loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>You don't have any photo yet!</Text>
          </View>
        ) : (
          <FlatList
            data={photos}
            keyExtractor={(item, index) => `${item.userProfileImageId ?? index}`}
            numColumns={GRID_COLUMNS}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.listContent}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <Modal visible={!!previewUri} transparent animationType="fade">
        <View style={styles.previewBackdrop}>
          <Pressable style={styles.previewBackdrop} onPress={() => setPreviewUri(null)}>
            <Image source={{ uri: previewUri }} style={styles.previewImage} resizeMode="contain" />
          </Pressable>
        </View>
      </Modal>

      <LoadingIndicator visible={loading || uploading || deleting} />
      <ErrorToast visible={Boolean(error)} message={error || ''} onClose={() => setError(null)} />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgColor,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bgColor,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.spacingM,
    paddingVertical: SIZES.spacingM,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.purple2,
  },
  headerButton: {
    paddingHorizontal: SIZES.spacingS,
    paddingVertical: SIZES.spacingXS,
    borderRadius: SIZES.cornerRadius12,
    backgroundColor: COLORS.buttonColor,
  },
  headerButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  headerButtonPlaceholder: {
    width: 60,
  },
  listContent: {
    paddingHorizontal: SIZES.spacingM,
    paddingBottom: SIZES.spacingXXL,
  },
  columnWrapper: {
    justifyContent: 'space-between',
    marginBottom: GRID_GUTTER,
  },
  gridItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: SIZES.cornerRadius12,
    overflow: 'hidden',
    backgroundColor: COLORS.white,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.purple0,
  },
  placeholderText: {
    color: COLORS.purple2,
    fontSize: 12,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    color: COLORS.purple2,
    fontSize: 16,
    fontWeight: '600',
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: SCREEN_WIDTH - SIZES.spacingL * 2,
    height: SCREEN_WIDTH - SIZES.spacingL * 2,
  },
  selectionOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    padding: SIZES.spacingXS,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.white,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: COLORS.buttonColor,
    borderColor: COLORS.buttonColor,
  },
  checkmark: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
  },
  disabledButton: {
    backgroundColor: COLORS.purple3,
    opacity: 0.5,
  },
  disabledButtonText: {
    color: COLORS.white,
    opacity: 0.7,
  },
});

export default PhotosScreen;
