import React from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import ImageFilterPicker from '../components/ImageFilterPicker';

/**
 * Choose Filter Screen
 * Replicates ChooseFilterView from Swift app
 * Allows users to apply filters to their images before posting
 */
export default function ChooseFilter() {
  const router = useRouter();
  const { imageUri } = useLocalSearchParams();

  const handleFilterSelected = (filteredImageUri) => {
    // Navigate to create post screen with the filtered image
    router.push({
      pathname: '/create-post',
      params: { imageUri: filteredImageUri },
    });
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <ImageFilterPicker
      imageUri={imageUri}
      onFilterSelected={handleFilterSelected}
      onBack={handleBack}
    />
  );
}
