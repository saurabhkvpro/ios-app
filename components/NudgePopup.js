import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { COLORS } from '../constants/theme';

const NudgePopup = ({ visible, nudge, onClose, onSendMessage, onSendVideo }) => {
  const slideAnim = useRef(new Animated.Value(300)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Slide up with bounce effect
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        // Small bounce for attention
        Animated.sequence([
          Animated.delay(400),
          Animated.spring(bounceAnim, {
            toValue: 1,
            tension: 100,
            friction: 5,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    } else {
      // Slide down
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
      bounceAnim.setValue(0);
    }
  }, [visible]);

  if (!visible && slideAnim._value === 300) return null;

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (onClose) onClose();
    });
  };

  const closeWithoutCallback = () => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 300,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const bounceScale = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05],
  });

  return (
    <>
      {/* Backdrop */}
      <Animated.View
        style={[
          styles.backdrop,
          {
            opacity: opacityAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.5],
            }),
          },
        ]}
        pointerEvents={visible ? 'auto' : 'none'}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={handleClose}
        />
      </Animated.View>

      {/* Pop-up Card */}
      <Animated.View
        style={[
          styles.container,
          {
            transform: [
              { translateY: slideAnim },
              { scale: bounceScale },
            ],
            opacity: opacityAnim,
          },
        ]}
      >
        <View style={styles.card}>
          {/* Close Button */}
          <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>

          {/* Content */}
          <View style={styles.content}>
            <Text style={styles.emoji}>🎂</Text>
            <Text style={styles.title}>{nudge?.title || 'Happy Birthday'}</Text>
            <Text style={styles.body}>
              {nudge?.body || 'Wish you a very happy birthday!'}
            </Text>
            <Text style={styles.memberName}>{nudge?.memberName || ''}</Text>
          </View>

          {/* Action Buttons - Only show if handlers are provided */}
          {(onSendMessage || onSendVideo) && (
            <View style={styles.buttonContainer}>
              {onSendMessage && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.messageButton]}
                  onPress={() => {
                    closeWithoutCallback();
                    onSendMessage(nudge);
                  }}
                >
                  <Text style={styles.actionButtonIcon}>💬</Text>
                  <Text style={styles.actionButtonText}>Send Message</Text>
                </TouchableOpacity>
              )}

              {onSendVideo && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.videoButton]}
                  onPress={() => {
                    closeWithoutCallback();
                    onSendVideo(nudge);
                  }}
                >
                  <Text style={styles.actionButtonIcon}>🎥</Text>
                  <Text style={styles.actionButtonText}>Send Video</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </Animated.View>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 9997,
  },
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 110 : 110,
    left: 16,
    right: 16,
    zIndex: 9998,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.purple2,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  closeButtonText: {
    color: COLORS.white,
    fontSize: 24,
    fontWeight: 'bold',
    lineHeight: 28,
  },
  content: {
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 10,
  },
  emoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: COLORS.purple1,
    marginBottom: 8,
    textAlign: 'center',
  },
  body: {
    fontSize: 16,
    color: COLORS.black,
    textAlign: 'center',
    marginBottom: 8,
  },
  memberName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.purple2,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  messageButton: {
    backgroundColor: COLORS.purple2,
  },
  videoButton: {
    backgroundColor: '#ed2121ff',
  },
  actionButtonIcon: {
    fontSize: 20,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
});

export default NudgePopup;
