import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Modal,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { COLORS, SIZES } from '../constants/theme';

export default function CreateGroup({ visible, onClose, onCreateGroup }) {
  const [groupName, setGroupName] = useState('');

  const handleCreate = () => {
    if (groupName.trim()) {
      onCreateGroup(groupName.trim());
      setGroupName('');
      onClose();
    }
  };

  const handleClose = () => {
    setGroupName('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.content}>
            <Image
              source={require('../assets/images/groupImage.png')}
              style={[styles.groupImageLarge, { tintColor: COLORS.purple1 }]}
              resizeMode="contain"
            />

            <Text style={styles.title}>Create your first group.</Text>

            <Text style={styles.label}>Group Name</Text>

            <View style={styles.groupInputContainer}>
              <Image
                source={require('../assets/images/addGroup.png')}
                style={styles.groupIcon}
              />
              <TextInput
                style={styles.groupInput}
                placeholder="Group Name"
                value={groupName}
                onChangeText={setGroupName}
                placeholderTextColor={COLORS.lightGrayColor}
                autoFocus
              />
            </View>

            <TouchableOpacity
              style={[styles.createButton, !groupName.trim() && styles.createButtonDisabled]}
              onPress={handleCreate}
              disabled={!groupName.trim()}
            >
              <Text style={styles.createButtonText}>Create Group</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.cancelButton} onPress={handleClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.purple0,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  content: {
    padding: SIZES.spacingM,
    paddingTop: 80,
  },
  groupImageLarge: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: SIZES.spacingL,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.titleColor,
    textAlign: 'center',
    marginBottom: SIZES.spacingL,
  },
  label: {
    fontSize: 14,
    color: COLORS.purple3,
    marginTop: SIZES.spacingM,
    marginBottom: SIZES.spacingS,
  },
  groupInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.cornerRadius12,
    paddingHorizontal: SIZES.spacingM,
    height: SIZES.defaultTextFieldHeight,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  groupIcon: {
    width: 26,
    height: 26,
    tintColor: COLORS.purple1,
    marginRight: SIZES.spacingS,
  },
  groupInput: {
    flex: 1,
    height: SIZES.defaultTextFieldHeight,
    fontSize: 16,
    color: COLORS.black,
    borderWidth: 0,
    borderColor: 'transparent',
    outlineStyle: 'none',
  },
  createButton: {
    height: SIZES.defaultTextFieldHeight,
    backgroundColor: COLORS.buttonColor,
    borderRadius: SIZES.cornerRadius12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SIZES.spacingL,
  },
  createButtonDisabled: {
    opacity: 0.3,
  },
  createButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    marginTop: SIZES.spacingM,
    padding: SIZES.spacingM,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: COLORS.purple3,
    fontSize: 14,
    fontWeight: 'bold',
  },
});
