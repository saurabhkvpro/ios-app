import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Image,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useRouter, useNavigation } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { COLORS, SIZES } from '../../constants/theme';

export default function Create() {
  const router = useRouter();
  const navigation = useNavigation();
  const [permission, requestPermission] = useCameraPermissions();
  const [cameraRef, setCameraRef] = useState(null);
  const [showCamera, setShowCamera] = useState(false);
  const [alertShown, setAlertShown] = useState(false);

  useEffect(() => {
    const focusUnsubscribe = navigation.addListener('focus', () => {
      // Small delay to ensure permission hook is ready
      setTimeout(() => {
        handleFocus();
      }, 100);
    });

    const blurUnsubscribe = navigation.addListener('blur', () => {
      setShowCamera(false);
      setCameraRef(null);
    });

    return () => {
      focusUnsubscribe();
      blurUnsubscribe();
    };
  }, [navigation]);

  const handleFocus = async () => {
    // Show alert only once
    if (!alertShown) {
      setAlertShown(true);

      Alert.alert(
        'Confirmation',
        'This feature requires access to your camera to take photos for the posts. Your camera will only be used for this purpose. Do you want to proceed?',
        [
          {
            text: 'Cancel',
            style: 'destructive',
            onPress: () => {
              navigation.navigate('home');
            },
          },
          {
            text: 'OK',
            onPress: async () => {
              await checkPermissions();
            },
          },
        ]
      );
    } else {
      await checkPermissions();
    }
  };

  const checkPermissions = async () => {
    try {
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      // Request camera permission directly
      const result = await requestPermission();

      if (result.granted) {
        setShowCamera(true);
      } else {
        Alert.alert(
          'Camera Permission Required',
          'This feature requires camera access to create posts.',
          [
            {
              text: 'OK',
              onPress: () => {
                navigation.navigate('home');
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('❌ Create - Error checking permissions:', error);
      navigation.navigate('home');
    }
  };

  const takePicture = async () => {
    if (cameraRef) {
      try {
        const photo = await cameraRef.takePictureAsync({
          quality: 0.8,
        });

        // Navigate to filter selection
        router.push({
          pathname: '/choose-filter',
          params: { imageUri: photo.uri }
        });
      } catch (error) {
        console.error('❌ Error taking picture:', error);
        Alert.alert('Error', 'Failed to take picture: ' + error.message);
      }
    } else {
      console.error('❌ Camera ref is null');
      Alert.alert('Error', 'Camera is not ready');
    }
  };

  const pickFromLibrary = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // Navigate to filter selection
        router.push({
          pathname: '/choose-filter',
          params: { imageUri: result.assets[0].uri }
        });
      }
    } catch (error) {
      console.error('❌ Error picking from library:', error);
      Alert.alert('Error', 'Failed to select photo');
    }
  };

  const handleClose = () => {
    navigation.navigate('home');
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Requesting permissions...</Text>
        </View>
      </View>
    );
  }

  if (!permission.granted && !showCamera) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.permissionContainer}>
          <Text style={styles.permissionText}>Camera permission not granted</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
          >
            <Image
              source={require('../../assets/images/backButton.png')}
              style={styles.closeIcon}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create New POST</Text>
          <View style={styles.closeButton} />
        </View>
      </SafeAreaView>

      {/* Camera View */}
      {showCamera && permission?.granted ? (
        <CameraView
          style={styles.camera}
          facing="back"
          ref={setCameraRef}
          onCameraReady={() => {}}
          onMountError={(error) => console.error('❌ Camera mount error:', error)}
        >
          <View style={styles.cameraOverlay}>
            {/* Camera controls at bottom */}
            <View style={styles.controlsContainer}>
              {/* Library button */}
              <TouchableOpacity
                style={styles.libraryButton}
                onPress={pickFromLibrary}
              >
                <Image
                  source={require('../../assets/images/iconEmptyProfile.png')}
                  style={styles.libraryIcon}
                />
              </TouchableOpacity>

              {/* Shutter button */}
              <TouchableOpacity
                style={styles.shutterButton}
                onPress={takePicture}
              >
                <View style={styles.shutterButtonInner} />
              </TouchableOpacity>

              {/* Placeholder for symmetry */}
              <View style={styles.libraryButton} />
            </View>
          </View>
        </CameraView>
      ) : (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>
            {!permission?.granted ? 'Waiting for camera permission...' : 'Loading camera...'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.black,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: COLORS.white,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.spacingM,
  },
  permissionText: {
    fontSize: 16,
    color: COLORS.white,
    textAlign: 'center',
  },
  headerSafeArea: {
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.spacingM,
    paddingVertical: SIZES.spacingM,
    backgroundColor: COLORS.white,
  },
  closeButton: {
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    width: 24,
    height: 24,
    tintColor: COLORS.purple1,
    resizeMode: 'contain',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.purple1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
    justifyContent: 'flex-end',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingBottom: 100,
    paddingHorizontal: SIZES.spacingXL,
  },
  shutterButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: COLORS.purple1,
  },
  shutterButtonInner: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: COLORS.purple1,
  },
  libraryButton: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  libraryIcon: {
    width: 30,
    height: 30,
    tintColor: COLORS.white,
    resizeMode: 'contain',
  },
});
