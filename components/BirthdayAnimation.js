import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const BirthdayAnimation = ({ visible, onComplete }) => {
  const confettiPieces = useRef([...Array(80)].map(() => ({
    x: new Animated.Value(Math.random() * SCREEN_WIDTH),
    y: new Animated.Value(-50),
    rotateX: new Animated.Value(0),
    rotateY: new Animated.Value(0),
    rotateZ: new Animated.Value(0),
    scale: new Animated.Value(0),
  }))).current;

  useEffect(() => {
    if (visible) {
      // Animate all paper pieces with slower, more graceful motion
      const animations = confettiPieces.map((piece, index) => {
        const randomDirection = Math.random() > 0.5 ? 1 : -1;
        const duration = 5000 + Math.random() * 3000; // Slower: 5-8 seconds

        return Animated.parallel([
          // Fall down slowly
          Animated.timing(piece.y, {
            toValue: SCREEN_HEIGHT + 100,
            duration: duration,
            useNativeDriver: true,
          }),
          // Rotate on X-axis (flip like paper) - slower rotation
          Animated.timing(piece.rotateX, {
            toValue: randomDirection * (360 + Math.random() * 360), // Less rotation
            duration: duration * 1.5, // Even slower rotation
            useNativeDriver: true,
          }),
          // Rotate on Y-axis (side to side like paper) - slower
          Animated.timing(piece.rotateY, {
            toValue: randomDirection * -1 * (360 + Math.random() * 360),
            duration: duration * 1.3,
            useNativeDriver: true,
          }),
          // Rotate on Z-axis (spin like paper) - slower
          Animated.timing(piece.rotateZ, {
            toValue: randomDirection * (180 + Math.random() * 360),
            duration: duration * 1.8,
            useNativeDriver: true,
          }),
          // Scale in and stay visible longer
          Animated.sequence([
            Animated.timing(piece.scale, {
              toValue: 1,
              duration: 500,
              delay: index * 15,
              useNativeDriver: true,
            }),
            Animated.timing(piece.scale, {
              toValue: 0,
              duration: 500,
              delay: 3500 + Math.random() * 2000, // Stay visible longer
              useNativeDriver: true,
            }),
          ]),
          // Drift left/right more gently
          Animated.timing(piece.x, {
            toValue: piece.x._value + (Math.random() - 0.5) * 150,
            duration: duration,
            useNativeDriver: true,
          }),
        ]);
      });

      Animated.stagger(50, animations).start(() => {
        // Reset all animations
        confettiPieces.forEach(piece => {
          piece.x.setValue(Math.random() * SCREEN_WIDTH);
          piece.y.setValue(-50);
          piece.rotateX.setValue(0);
          piece.rotateY.setValue(0);
          piece.rotateZ.setValue(0);
          piece.scale.setValue(0);
        });

        if (onComplete) {
          onComplete();
        }
      });
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.container} pointerEvents="none">
      {confettiPieces.map((piece, index) => {
        const color = CONFETTI_COLORS[index % CONFETTI_COLORS.length];
        const width = 12 + Math.random() * 8; // Rectangular paper
        const height = 16 + Math.random() * 12;

        return (
          <Animated.View
            key={index}
            style={[
              styles.paper,
              {
                backgroundColor: color,
                width: width,
                height: height,
                borderRadius: 2, // Slight rounded corners for paper effect
                transform: [
                  { translateX: piece.x },
                  { translateY: piece.y },
                  { perspective: 1000 }, // Add perspective for 3D effect
                  {
                    rotateX: piece.rotateX.interpolate({
                      inputRange: [0, 360],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                  {
                    rotateY: piece.rotateY.interpolate({
                      inputRange: [0, 360],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                  {
                    rotateZ: piece.rotateZ.interpolate({
                      inputRange: [0, 360],
                      outputRange: ['0deg', '360deg'],
                    }),
                  },
                  { scale: piece.scale },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
};

const CONFETTI_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#FFA07A', // Light Salmon
  '#98D8C8', // Mint
  '#FFD93D', // Yellow
  '#6BCF7F', // Green
  '#C589E8', // Purple
  '#FF8ED4', // Pink
  '#FFB6B9', // Light Pink
];

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
  },
  paper: {
    position: 'absolute',
    top: 0,
    left: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default BirthdayAnimation;
