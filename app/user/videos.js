import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  StatusBar,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Video, ResizeMode } from 'expo-av';
import LoadingIndicator from '../../components/LoadingIndicator';
import ErrorToast from '../../components/ErrorToast';
import ApiService from '../../services/api.service';
import { COLORS, SIZES } from '../../constants/theme';
import { normalizeProfilePayload, buildImageUri } from './[profileId]';

const { width, height } = Dimensions.get('window');
const SCREEN_WIDTH = Dimensions.get('window').width;
const GRID_GUTTER = SIZES.spacingS;
const GRID_COLUMNS = 3;
const ITEM_SIZE = Math.floor(
  (SCREEN_WIDTH - SIZES.spacingM * 2 - GRID_GUTTER * (GRID_COLUMNS - 1)) / GRID_COLUMNS
);

const VideosScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const profileIdParam = Array.isArray(params.profileId) ? params.profileId[0] : params.profileId;
  const allowUploadParam = Array.isArray(params.allowUpload) ? params.allowUpload[0] : params.allowUpload;
  const profileIdNumber = useMemo(() => {
    const numeric = Number(profileIdParam);
    return Number.isFinite(numeric) ? numeric : null;
  }, [profileIdParam]);
  const allowUpload = useMemo(() => allowUploadParam === '1' || allowUploadParam === 'true', [allowUploadParam]);

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const videoRef = useRef(null);
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
      const list = Array.isArray(normalized?.uploadedVideos) ? normalized.uploadedVideos : [];
      setVideos(list.slice().reverse());
    } catch (err) {
      setError(err?.message || 'Unable to load videos.');
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
        setError('Media library permission is required to upload videos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsMultipleSelection: false,
        quality: 1,
      });

      if (result.canceled || !result.assets?.length) {
        return;
      }

      setUploading(true);
      await ApiService.uploadUserVideo(profileIdNumber, result.assets[0]);
      await loadProfile();
    } catch (err) {
      setError(err?.message || 'Failed to upload video.');
    } finally {
      setUploading(false);
    }
  }, [allowUpload, loadProfile, profileIdNumber]);

  const handlePlayVideo = useCallback((videoUri) => {
    if (!videoUri) return;
    setSelectedVideo(videoUri);
  }, []);

  const handleCloseVideo = useCallback(async () => {
    if (videoRef.current) {
      await videoRef.current.stopAsync();
      await videoRef.current.unloadAsync();
    }
    setSelectedVideo(null);
  }, []);

  const handleLongPress = useCallback(() => {
    if (allowUpload) {
      setDeleteMode(true);
    }
  }, [allowUpload]);

  const toggleItemSelection = useCallback((item) => {
    setSelectedItem((prev) => {
      const prevId = prev?.userProfileVideoId || prev?.userVideoId;
      const itemId = item.userProfileVideoId || item.userVideoId;
      // If clicking the same item, deselect it
      if (prevId === itemId) {
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

      const videoId = selectedItem.userProfileVideoId || selectedItem.userVideoId;
      await ApiService.deleteUserVideo(videoId);
      await loadProfile();
      setDeleteMode(false);
      setSelectedItem(null);
    } catch (err) {
      setError(err?.message || 'Failed to delete video.');
    } finally {
      setDeleting(false);
    }
  }, [selectedItem, loadProfile]);

  const renderItem = ({ item }) => {
    const thumbnail = item.userVideoImageUrl ? buildImageUri(item.userVideoImageUrl) : null;
    const source = item.userVideoSrcUrl ? buildImageUri(item.userVideoSrcUrl) : null;
    const itemId = item.userProfileVideoId || item.userVideoId;
    const selectedItemId = selectedItem?.userProfileVideoId || selectedItem?.userVideoId;
    const isSelected = selectedItemId === itemId;

    return (
      <TouchableOpacity
        style={styles.gridItem}
        activeOpacity={0.8}
        onPress={() => {
          if (deleteMode) {
            toggleItemSelection(item);
          } else if (source) {
            handlePlayVideo(source);
          }
        }}
        onLongPress={handleLongPress}
        delayLongPress={500}
      >
        {thumbnail ? (
          <Image source={{ uri: thumbnail }} style={styles.videoThumbnail} resizeMode="cover" />
        ) : (
          <View style={styles.videoPlaceholder}>
            <Text style={styles.videoPlaceholderText}>▶</Text>
          </View>
        )}
        {!deleteMode && (
          <View style={styles.playIconOverlay}>
            <View style={styles.playIconCircle}>
              <Text style={styles.playIcon}>▶</Text>
            </View>
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
                {selectedItem ? '1 Selected' : 'Select Video'}
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
              <Text style={styles.headerTitle}>Videos</Text>
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

        {videos.length === 0 && !loading ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>You don't have any video yet!</Text>
          </View>
        ) : (
          <FlatList
            data={videos}
            keyExtractor={(item, index) => `${item.userProfileVideoId ?? item.userVideoId ?? index}`}
            numColumns={GRID_COLUMNS}
            columnWrapperStyle={styles.columnWrapper}
            contentContainerStyle={styles.listContent}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <Modal
        visible={Boolean(selectedVideo)}
        transparent
        animationType="fade"
        onRequestClose={handleCloseVideo}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalCloseArea} onPress={handleCloseVideo} activeOpacity={1} />
          <View style={styles.videoPlayerContainer}>
            <TouchableOpacity onPress={handleCloseVideo} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
            {selectedVideo && (
              <Video
                ref={videoRef}
                source={{ uri: selectedVideo }}
                style={styles.videoPlayer}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                isLooping
                shouldPlay
              />
            )}
          </View>
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
    borderWidth: 2,
    borderColor: COLORS.purple0,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  videoPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.purple0,
  },
  videoPlaceholderText: {
    color: COLORS.white,
    fontSize: 32,
  },
  playIconOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    color: COLORS.white,
    fontSize: 20,
    marginLeft: 4,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseArea: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  videoPlayerContainer: {
    width: width,
    height: height * 0.4,
    backgroundColor: COLORS.black,
  },
  videoPlayer: {
    width: '100%',
    height: '100%',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: '600',
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

export default VideosScreen;
