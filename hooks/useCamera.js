import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import { useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';

/**
 * Custom hook for managing camera functionality
 * Handles permissions, camera operations, and image selection
 */
export const useCamera = () => {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaPermission, setMediaPermission] = useState(null);
  const [cameraRef, setCameraRef] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    requestMediaPermission();
  }, []);

  const requestMediaPermission = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    setMediaPermission(status === 'granted');
  }, []);

  const checkAndRequestPermissions = useCallback(async () => {
    if (!cameraPermission) return false;

    if (!cameraPermission.granted) {
      const result = await requestCameraPermission();
      if (!result.granted) {
        Alert.alert(
          'Camera Permission Required',
          'This feature requires camera access to create posts.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => {} },
          ]
        );
        return false;
      }
    }

    return cameraPermission.granted && mediaPermission;
  }, [cameraPermission, mediaPermission, requestCameraPermission]);

  const takePicture = useCallback(async () => {
    if (!cameraRef) {
      Alert.alert('Error', 'Camera is not ready');
      return null;
    }

    try {
      const photo = await cameraRef.takePictureAsync({
        quality: 0.8,
        skipProcessing: false,
      });
      return photo;
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Error', 'Failed to take picture');
      return null;
    }
  }, [cameraRef]);

  const pickFromLibrary = useCallback(async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        return result.assets[0];
      }
      return null;
    } catch (error) {
      console.error('Error picking from library:', error);
      Alert.alert('Error', 'Failed to select photo');
      return null;
    }
  }, []);

  return {
    cameraPermission,
    mediaPermission,
    cameraRef,
    setCameraRef,
    isReady,
    setIsReady,
    checkAndRequestPermissions,
    takePicture,
    pickFromLibrary,
  };
};
