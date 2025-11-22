import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { COLORS, SIZES } from '../constants/theme';

/**
 * ImageFilterPicker Component
 * Simplified version - shows filter previews
 * All filters currently use original image (filters can be added later with proper library)
 */
const ImageFilterPicker = ({ imageUri, onFilterSelected, onBack }) => {
  const [selectedImage, setSelectedImage] = useState(imageUri);
  const [filteredImages, setFilteredImages] = useState([]);
  const [selectedFilterId, setSelectedFilterId] = useState('original');

  // Define filter configurations
  const FILTERS = [
    { id: 'original', name: 'Original' },
    { id: 'vintage', name: 'Vintage' },
    { id: 'bw', name: 'B&W' },
    { id: 'bright', name: 'Bright' },
    { id: 'fade', name: 'Fade' },
    { id: 'warm', name: 'Warm' },
    { id: 'cool', name: 'Cool' },
    { id: 'dramatic', name: 'Dramatic' },
    { id: 'soft', name: 'Soft' },
    { id: 'vivid', name: 'Vivid' },
  ];

  useEffect(() => {
    // For simplicity, just use the original image for all filters
    // In production, you would generate actual filtered versions
    const filters = FILTERS.map((filter) => ({
      id: filter.id,
      name: filter.name,
      uri: imageUri, // All use original for now
    }));
    setFilteredImages(filters);
  }, [imageUri]);

  const handleFilterPress = (filter) => {
    setSelectedFilterId(filter.id);
    setSelectedImage(imageUri); // Currently all filters show original
  };

  const handleNext = () => {
    onFilterSelected(selectedImage);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.headerButton}>
          <Image
            source={require('../assets/images/backButton.png')}
            style={styles.headerIcon}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Choose Filter</Text>
        <TouchableOpacity onPress={handleNext} style={styles.headerButton}>
          <Text style={styles.nextButton}>Next</Text>
        </TouchableOpacity>
      </View>

      {/* Main Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: selectedImage }}
          style={styles.mainImage}
          resizeMode="contain"
        />
      </View>

      {/* Filter Options */}
      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
            {filteredImages.map((filter) => (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.filterItem,
                  selectedFilterId === filter.id && styles.filterItemSelected,
                ]}
                onPress={() => handleFilterPress(filter)}
              >
                <Image
                  source={{ uri: filter.uri }}
                  style={styles.filterImage}
                  resizeMode="cover"
                />
                <Text style={styles.filterName}>{filter.name}</Text>
              </TouchableOpacity>
            ))}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
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
    height: 30,
    justifyContent: 'center',
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
  nextButton: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.purple1,
    textAlign: 'right',
  },
  imageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.black,
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  filterContainer: {
    height: 166,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.lightGrayColor,
    paddingVertical: SIZES.spacingM,
    justifyContent: 'center',
  },
  filterScrollContent: {
    paddingHorizontal: SIZES.spacingM,
    alignItems: 'center',
  },
  filterItem: {
    marginRight: SIZES.spacingM,
    alignItems: 'center',
    borderRadius: 8,
    padding: 4,
  },
  filterItemSelected: {
    borderColor: COLORS.purple1,
    borderWidth: 3,
  },
  filterImage: {
    width: 80,
    height: 100,
    borderRadius: 8,
  },
  filterName: {
    fontSize: 12,
    color: COLORS.black,
    marginTop: SIZES.spacingXS,
  },
});

export default ImageFilterPicker;
