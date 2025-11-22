import React, { useState, useRef } from 'react';
import {
  View,
  ScrollView,
  Image,
  StyleSheet,
  Dimensions,
  StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CircleProgressButton from '../components/CircleProgressButton';
import { COLORS, SIZES } from '../constants/theme';

const { width, height } = Dimensions.get('window');

const ONBOARDING_STEPS = [
  { id: 0, image: require('../assets/images/onboard1.png') },
  { id: 1, image: require('../assets/images/onboard2.png') },
  { id: 2, image: require('../assets/images/onboard3.png') },
];

export default function Onboarding() {
  const router = useRouter();
  const scrollViewRef = useRef(null);
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep >= 2) {
      // After 3 steps, go to login
      router.replace('/(auth)/login');
    } else {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      scrollViewRef.current?.scrollTo({
        x: width * nextStep,
        animated: true,
      });
    }
  };

  const progress = 0.1 + 0.33 * (currentStep + 1);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={styles.scrollView}
      >
        {ONBOARDING_STEPS.map((step) => (
          <View key={step.id} style={styles.slide}>
            <Image
              source={step.image}
              style={styles.image}
              resizeMode="cover"
            />
          </View>
        ))}
      </ScrollView>

      <View style={styles.contentOverlay}>
        <Image
          source={require('../assets/images/logoImageWhite.png')}
          style={styles.logo}
          resizeMode="contain"
        />

        <View style={styles.buttonContainer}>
          <CircleProgressButton
            progress={progress}
            onPress={handleNext}
            size={SIZES.buttonHeight}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.purple0,
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width,
    height,
  },
  image: {
    width,
    height,
  },
  contentOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SIZES.iconAppMarginTop,
    paddingBottom: SIZES.buttonMarginBottom,
  },
  logo: {
    width: width * 0.48,
    height: width * 0.34,
  },
  buttonContainer: {
    alignItems: 'center',
  },
});
