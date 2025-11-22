import React from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, SIZES } from '../constants/theme';

const { width } = Dimensions.get('window');

export default function ImageCarousel({ images = [] }) {
  if (!images || images.length === 0) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={['#0891B2', '#00687B', '#005568']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <Text style={styles.emptyText}>You don't have any memory post yet!</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#0891B2', '#00687B', '#005568']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {images.map((item, index) => (
            <View key={index} style={styles.imageWrapper}>
              <Image
                source={{ uri: item.url || item.imageUrl }}
                style={styles.image}
                resizeMode="cover"
              />
            </View>
          ))}
        </ScrollView>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 130,
    marginTop: 0,
  },
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '500',
    opacity: 0.9,
  },
  scrollContent: {
    paddingHorizontal: SIZES.spacingM,
    paddingVertical: SIZES.spacingS,
    alignItems: 'center',
  },
  imageWrapper: {
    marginRight: SIZES.spacingS,
    borderRadius: SIZES.spacingS,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  image: {
    width: 90,
    height: 115,
    borderRadius: SIZES.spacingS,
    backgroundColor: COLORS.white,
  },
});
