import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  Alert,
  Image,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Video } from 'expo-av';
import { COLORS, SIZES } from '../constants/theme';
import ApiService from '../services/api.service';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const VIDEO_WIDTH = (SCREEN_WIDTH - 48) / 2;

export default function BirthdayVideoSelector() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const nudgeId = params.nudgeId;
  const memberName = params.memberName || 'Birthday Person';

  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [playingVideo, setPlayingVideo] = useState(null);
  const [userProfileId, setUserProfileId] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetchUserProfile();
    fetchVideos();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await ApiService.getUserInfo();
      if (response?.success && response?.data) {
        setUserProfileId(response.data.userProfileId);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchVideos = async (isRefreshing = false) => {
    try {
      if (isRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await ApiService.fetchBirthdayVideos();

      if (response?.success && response?.data && Array.isArray(response.data)) {
        setVideos(response.data);
      } else {
        setVideos([]);
      }
    } catch (error) {
      console.error('Error fetching birthday videos:', error);
      setVideos([]);
    } finally {
      if (isRefreshing) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handleRefresh = () => {
    fetchVideos(true);
  };

  const handleUploadVideo = async () => {
    try {
      // Request permission
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission?.granted) {
        Alert.alert('Permission needed', 'Please allow media access to upload a video.');
        return;
      }

      // Pick video
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
        videoMaxDuration: 60, // 60 seconds max
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets && result.assets[0];
      if (!asset?.uri) {
        Alert.alert('Error', 'Unable to read the selected video.');
        return;
      }

      if (!userProfileId) {
        Alert.alert('Error', 'User profile not found. Please try again.');
        return;
      }

      setUploading(true);

      // Upload with Birthday category (2)
      const uploadResponse = await ApiService.uploadUserVideo(userProfileId, asset, 2);

      if (uploadResponse?.success && uploadResponse?.data) {
        // Extract video URL - handle both string and object responses
        let videoUrl = uploadResponse.data;

        // If data is an object, try to extract URL from common properties
        if (typeof videoUrl === 'object') {
          videoUrl = videoUrl.url || videoUrl.videoUrl || videoUrl.mediaUrl || videoUrl.path || '';
        }

        if (!videoUrl || typeof videoUrl !== 'string') {
          throw new Error('Invalid video URL received from upload');
        }

        // Refresh video list to show newly uploaded video
        await fetchVideos();

        // Auto-select the newly uploaded video
        setSelectedVideo(videoUrl);

        Alert.alert('Video Uploaded!', 'Your video has been added. Click "Send Birthday Video" to send it.');
      } else {
        Alert.alert('Error', 'Failed to upload video. Please try again.');
      }
    } catch (error) {
      console.error('Error uploading video:', error);
      Alert.alert('Error', error?.message || 'Failed to upload video. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleSendVideo = async () => {
    if (!selectedVideo) {
      Alert.alert('No Video Selected', 'Please select a video to send.');
      return;
    }

    try {
      setSending(true);

      // Save nudge action with selected video URL
      const response = await ApiService.saveNudgeAction(nudgeId, 3, selectedVideo);

      if (response?.success) {
        Alert.alert('Success!', 'Birthday video has been sent!', [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]);
      } else {
        Alert.alert('Error', response?.message || 'Failed to send video. Please try again.');
      }
    } catch (error) {
      console.error('Error sending video:', error);
      Alert.alert('Error', 'Failed to send video. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const renderVideoItem = ({ item, index }) => {
    const isPlaying = playingVideo === item;
    const isSelected = selectedVideo === item;

    return (
      <View style={styles.videoCardWrapper}>
        <TouchableOpacity
          style={[
            styles.videoCard,
            isSelected && styles.videoCardSelected,
          ]}
          onPress={() => {
            setSelectedVideo(isSelected ? null : item);
          }}
        >
          <Video
            source={{ uri: item }}
            style={styles.videoThumbnail}
            resizeMode="cover"
            shouldPlay={isPlaying}
            isLooping
          />

          {/* Play/Pause Button */}
          <TouchableOpacity
            style={styles.playButton}
            onPress={(e) => {
              e.stopPropagation();
              setPlayingVideo(isPlaying ? null : item);
            }}
          >
            <View style={styles.playButtonCircle}>
              <Text style={styles.playButtonIcon}>{isPlaying ? '⏸' : '▶'}</Text>
            </View>
          </TouchableOpacity>

          {/* Selection Indicator */}
          {isSelected && (
            <View style={styles.selectedBadge}>
              <Text style={styles.selectedBadgeText}>✓</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backButtonText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Send Birthday Video</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.content}>
        {/* Info Section */}
        <View style={styles.infoSection}>
          <Text style={styles.emoji}>🎂</Text>
          <Text style={styles.infoTitle}>Choose a Birthday Video</Text>
          <Text style={styles.infoSubtitle}>
            Send a special video message to {memberName}
          </Text>
        </View>

        {/* Upload Button */}
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={handleUploadVideo}
          disabled={uploading}
        >
          {uploading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <Text style={styles.uploadButtonIcon}>📹</Text>
              <Text style={styles.uploadButtonText}>Upload Your Own Video</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or choose from library</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Video List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.purple1} />
            <Text style={styles.loadingText}>Loading videos...</Text>
          </View>
        ) : videos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🎬</Text>
            <Text style={styles.emptyText}>No birthday videos available</Text>
            <Text style={styles.emptySubtext}>Upload your own video to get started!</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
              <Text style={styles.retryButtonText}>🔄 Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={videos}
            renderItem={renderVideoItem}
            keyExtractor={(item, index) => `video-${index}`}
            numColumns={2}
            columnWrapperStyle={styles.videoRow}
            contentContainerStyle={styles.videoList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={COLORS.purple1}
              />
            }
          />
        )}
      </View>

      {/* Send Button - Fixed at bottom */}
      {selectedVideo && (
        <View style={styles.sendButtonContainer}>
          <TouchableOpacity
            style={[styles.sendButton, sending && styles.sendButtonDisabled]}
            onPress={handleSendVideo}
            disabled={sending}
          >
            {sending ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <>
                <Text style={styles.sendButtonIcon}>🎁</Text>
                <Text style={styles.sendButtonText}>Send Birthday Video</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 24,
    color: COLORS.purple1,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.purple1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  infoSection: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.purple1,
    marginBottom: 8,
  },
  infoSubtitle: {
    fontSize: 14,
    color: COLORS.black,
    textAlign: 'center',
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.purple2,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 24,
    gap: 10,
  },
  uploadButtonIcon: {
    fontSize: 24,
  },
  uploadButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 12,
    color: '#888',
    fontSize: 14,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.purple1,
    fontSize: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: COLORS.purple0,
    borderRadius: 8,
  },
  retryButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  videoList: {
    paddingBottom: 100, // Space for send button
  },
  videoRow: {
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  videoCardWrapper: {
    width: VIDEO_WIDTH,
  },
  videoCard: {
    width: VIDEO_WIDTH,
    height: VIDEO_WIDTH * 1.5,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
    borderWidth: 3,
    borderColor: '#E0E0E0',
  },
  videoCardSelected: {
    borderColor: COLORS.purple1,
    borderWidth: 4,
  },
  videoThumbnail: {
    width: '100%',
    height: '100%',
  },
  playButton: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -30 }, { translateY: -30 }],
    zIndex: 10,
  },
  playButtonCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonIcon: {
    fontSize: 24,
    color: COLORS.white,
    marginLeft: 3,
  },
  selectedBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.purple0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  selectedBadgeText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  sendButtonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 10,
  },
  sendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.purple2,
    paddingVertical: 16,
    borderRadius: 12,
    gap: 10,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonIcon: {
    fontSize: 24,
  },
  sendButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
