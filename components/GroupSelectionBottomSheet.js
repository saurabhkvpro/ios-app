import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Modal,
  SafeAreaView,
} from 'react-native';
import { COLORS, SIZES } from '../constants/theme';

/**
 * Group Selection Sheet Component
 * Uses Modal with sheet presentation style to match LocationPicker
 * Replicates iOS sheet behavior
 */
const GroupSelectionBottomSheet = ({ visible, groups, selectedGroups, onToggleGroup, onClose }) => {
  const renderGroupItem = ({ item }) => {
    const resolveId = (group) =>
      Number(
        group?.groupId ??
          group?.userConnectionGroupId ??
          group?.id ??
          group?.groupID ??
          0
      );
    const isSelected = selectedGroups.some((g) => resolveId(g) === resolveId(item));
    const groupName = item.groupName || item.name || 'Group';
    const groupImage =
      item.groupImage ||
      item.groupPhoto ||
      item.groupPicture ||
      item.groupImageThumbnail ||
      null;

    return (
      <TouchableOpacity style={styles.groupItem} onPress={() => onToggleGroup(item)}>
        <View style={styles.groupInfo}>
          {groupImage ? (
            <Image source={{ uri: groupImage }} style={styles.groupIcon} />
          ) : (
            <View style={[styles.groupIcon, styles.groupIconPlaceholder]} />
          )}
          <Text style={styles.groupName}>{groupName}</Text>
        </View>
        <Image
          source={
            isSelected
              ? require('../assets/images/iconChecked.png')
              : require('../assets/images/iconUnChecked.png')
          }
          style={styles.checkbox}
        />
      </TouchableOpacity>
    );
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
          <Text style={styles.headerTitle}>Select Groups</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Group List */}
        <FlatList
          data={groups}
          renderItem={renderGroupItem}
          keyExtractor={(item, index) => {
            const candidate =
              item?.groupId ??
              item?.userConnectionGroupId ??
              item?.id ??
              item?.groupID;
            if (candidate != null) {
              return candidate.toString();
            }
            return `group-${index}`;
          }}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
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
  doneText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.purple1,
  },
  listContent: {
    paddingBottom: SIZES.spacingXL,
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SIZES.spacingM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.purple0,
  },
  groupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  groupIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: SIZES.spacingM,
  },
  groupIconPlaceholder: {
    backgroundColor: COLORS.lightGrayColor,
  },
  groupName: {
    fontSize: 16,
    color: COLORS.black,
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    tintColor: COLORS.purple1,
  },
});

export default GroupSelectionBottomSheet;
