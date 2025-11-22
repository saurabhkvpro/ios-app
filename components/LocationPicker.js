import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Modal,
  SafeAreaView,
  Image,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { GooglePlacesAutocomplete } from 'react-native-google-places-autocomplete';
import { COLORS, SIZES } from '../constants/theme';

/**
 * Location Picker Component using Google Places Autocomplete
 * Replicates PlacePicker from Swift app
 * NOTE: Requires a valid Google Places API key configured in the query below
 */
const LocationPicker = ({ visible, onClose, onSelectLocation }) => {
  const ref = useRef();
  const [searchText, setSearchText] = useState('');

  useEffect(() => {
    if (visible) {
      // Clear text when modal opens
      ref.current?.setAddressText('');
      setSearchText('');
    }
  }, [visible]);

  const handleClearSearch = () => {
    ref.current?.setAddressText('');
    setSearchText('');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Image
              source={require('../assets/images/backButton.png')}
              style={styles.closeIcon}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Location</Text>
          <View style={styles.closeButton} />
        </View>

        {/* Google Places Autocomplete */}
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <GooglePlacesAutocomplete
            ref={ref}
            placeholder="Search for a place"
            minLength={2}
            autoFocus={true}
            returnKeyType={'search'}
            listViewDisplayed="auto"
            fetchDetails={false}
            onPress={(data, details = null) => {
              const placeName = data.description || data.structured_formatting?.main_text || '';
              const placeId = data.place_id || '';
              onSelectLocation(placeName, placeId);
              onClose();
            }}
            query={{
              key: 'AIzaSyAQStu1VFIzSD0e_yKvhx2Iv-ZK6R_S5NQ',
              language: 'en',
            }}
            nearbyPlacesAPI="GooglePlacesSearch"
            debounce={300}
            enablePoweredByContainer={false}
            suppressDefaultStyles={true}
            keepResultsAfterBlur={true}
            predefinedPlaces={[]}
            listEmptyComponent={() => (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>Search for a place</Text>
                <Text style={styles.emptySubtitle}>Start typing to see nearby suggestions</Text>
              </View>
            )}
            styles={{
              container: styles.autocompleteContainer,
              textInputContainer: styles.textInputContainer,
              textInput: styles.textInput,
              listView: styles.listView,
              row: styles.row,
              description: styles.description,
              poweredContainer: {
                display: 'none',
              },
            }}
            textInputProps={{
              placeholderTextColor: COLORS.lightGrayColor,
              returnKeyType: 'search',
              autoCorrect: false,
              selectionColor: COLORS.purple1,
              clearButtonMode: 'while-editing',
              onChangeText: setSearchText,
            }}
            renderRightButton={() =>
              searchText.trim().length > 0 ? (
                <TouchableOpacity style={styles.clearButton} onPress={handleClearSearch}>
                  <Text style={styles.clearButtonText}>Clear</Text>
                </TouchableOpacity>
              ) : null
            }
            renderRow={(rowData) => {
              const title = rowData.structured_formatting?.main_text || rowData.description;
              const subtitle = rowData.structured_formatting?.secondary_text || rowData.secondary_text;
              return (
                <View style={styles.rowContent}>
                  <View style={styles.rowIcon}>
                    <View style={styles.rowIconInner} />
                  </View>
                  <View style={styles.rowTextContainer}>
                    <Text style={styles.rowTitle}>{title}</Text>
                    {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
                  </View>
                </View>
              );
            }}
          />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
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
    paddingVertical: SIZES.spacingM,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGrayColor,
  },
  closeButton: {
    width: 60,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    width: 24,
    height: 24,
    tintColor: COLORS.purple1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.black,
  },
  keyboardView: {
    flex: 1,
  },
  autocompleteContainer: {
    flex: 1,
    paddingHorizontal: SIZES.spacingM,
    paddingTop: SIZES.spacingM,
  },
  textInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.purple0,
    borderRadius: 16,
    paddingHorizontal: 0,
    overflow: 'hidden',
    height: 54,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  textInput: {
    flex: 1,
    height: 54,
    color: COLORS.black,
    fontSize: 16,
    paddingHorizontal: SIZES.spacingM,
    backgroundColor: 'transparent',
    paddingVertical: 0,
  },
  listView: {
    backgroundColor: COLORS.white,
    marginTop: SIZES.spacingS,
    borderRadius: 16,
    paddingVertical: 6,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    overflow: 'hidden',
  },
  row: {
    padding: 0,
  },
  description: {
    fontSize: 16,
    color: COLORS.black,
  },
  rowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.spacingM,
    paddingVertical: SIZES.spacingM,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.purple0,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.purple0,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SIZES.spacingM,
  },
  rowIconInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.purple1,
  },
  rowTextContainer: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
  },
  rowSubtitle: {
    fontSize: 14,
    color: COLORS.black,
    opacity: 0.6,
    marginTop: 4,
  },
  clearButton: {
    paddingHorizontal: SIZES.spacingM,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearButtonText: {
    color: COLORS.purple1,
    fontWeight: '600',
    fontSize: 14,
  },
  emptyState: {
    paddingHorizontal: SIZES.spacingM,
    paddingVertical: SIZES.spacingXXL,
    alignItems: 'center',
    marginTop: SIZES.spacingS,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.lightGrayColor,
  },
});

export default LocationPicker;
