import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  StatusBar,
  Alert,
} from 'react-native';
import { COLORS, SIZES } from '../constants/theme';
import CreateGroupName from './CreateGroupName';
import MakingMemories from './MakingMemories';
import AddMember from './AddMember';
import ApiService from '../services/api.service';
import LoadingIndicator from './LoadingIndicator';
import ErrorToast from './ErrorToast';

export default function CreateGroupFlow({ visible, onClose, onGroupCreated }) {
  const [currentStep, setCurrentStep] = useState(0); // 0: group name, 1: making memories, 2: success
  const [groupName, setGroupName] = useState('');
  const [groupImage, setGroupImage] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  const [showAddMember, setShowAddMember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState({ visible: false, message: '' });
  const [createdGroupId, setCreatedGroupId] = useState(null);
  const [createdGroupData, setCreatedGroupData] = useState(null);

  const handleClose = () => {
    // Reset state
    setCurrentStep(0);
    setGroupName('');
    setGroupImage(null);
    setGroupMembers([]);
    setShowAddMember(false);
    setCreatedGroupId(null);
    setCreatedGroupData(null);
    onClose();
  };

  const handleGroupNameNext = (data) => {
    setGroupName(data.groupName);
    setGroupImage(data.groupImage);
    setCurrentStep(1);
  };

  const handleGroupNameBack = () => {
    handleClose();
  };

  const handleAddMemberPress = () => {
    setShowAddMember(true);
  };

  const handleMemberAdded = (member) => {
    const newMembers = [...groupMembers, member];
    setGroupMembers(newMembers);
  };

  const handleRemoveMember = (index) => {
    const newMembers = groupMembers.filter((_, i) => i !== index);
    setGroupMembers(newMembers);
  };

  const handleCreateGroup = async () => {
    try {
      setLoading(true);

      const groupData = {
        groupName: groupName,
        invitedMembers: groupMembers,
      };

      const response = await ApiService.createGroup(groupData);

      if (response.success) {
        setCreatedGroupId(response.data?.groupId || null);
        setCreatedGroupData(response.data || null);
        setCurrentStep(2);
      } else {
        setError({ visible: true, message: response.message || 'Failed to create group' });
      }
      setLoading(false);

    } catch (err) {
      setError({ visible: true, message: err.message || 'Failed to create group' });
      setLoading(false);
    }
  };

  const handleSuccessComplete = () => {
    if (onGroupCreated) {
      const payload =
        (createdGroupData && { ...createdGroupData }) ||
        {
          groupId: createdGroupId,
          groupName,
          groupImage,
        };
      onGroupCreated(payload);
    }
    handleClose();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <CreateGroupName
            onNext={handleGroupNameNext}
            onBack={handleGroupNameBack}
            initialGroupName={groupName}
            initialImage={groupImage}
          />
        );

      case 1:
        return (
          <>
            <MakingMemories
              groupName={groupName}
              groupImage={groupImage}
              members={groupMembers}
              onAddMember={handleAddMemberPress}
              onRemoveMember={handleRemoveMember}
              onCreateGroup={handleCreateGroup}
              showSkip={false}
            />
            <AddMember
              visible={showAddMember}
              groupName={groupName}
              groupImage={groupImage}
              onClose={() => setShowAddMember(false)}
              onAddMember={handleMemberAdded}
              existingMembers={groupMembers}
            />

            {/* Back button for Making Memories screen */}
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setCurrentStep(0)}
            >
              <Image
                source={require('../assets/images/backButton.png')}
                style={styles.backIcon}
              />
            </TouchableOpacity>
          </>
        );

      case 2:
        // Success screen
        return (
          <View style={styles.successContainer}>
            <Image
              source={require('../assets/images/logoImg.png')}
              style={styles.successLogo}
              resizeMode="contain"
            />

            <Text style={styles.successTitle}>Welcome to {groupName}!</Text>
            <Text style={styles.successSubtitle}>
              Start making some memories and{'\n'}share them in your private groups!
            </Text>

            <TouchableOpacity
              style={styles.successButton}
              onPress={handleSuccessComplete}
            >
              <Text style={styles.successButtonText}>Start making memories</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={handleClose}
    >
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <LoadingIndicator visible={loading} />
        <ErrorToast
          visible={error.visible}
          message={error.message}
          onClose={() => setError({ visible: false, message: '' })}
        />

        {renderStep()}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.purple0,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: SIZES.spacingM,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  backIcon: {
    width: 24,
    height: 24,
    tintColor: COLORS.purple1,
  },
  successContainer: {
    flex: 1,
    padding: SIZES.spacingM,
    justifyContent: 'center',
    alignItems: 'center',
  },
  successLogo: {
    width: 180,
    height: 180,
    marginBottom: SIZES.spacingXL,
  },
  successTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.purple3,
    textAlign: 'center',
    marginBottom: SIZES.spacingL,
  },
  successSubtitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.purple3,
    textAlign: 'center',
    marginBottom: SIZES.spacingXL,
    lineHeight: 24,
  },
  successButton: {
    height: SIZES.defaultTextFieldHeight,
    backgroundColor: COLORS.buttonColor,
    borderRadius: SIZES.cornerRadius12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SIZES.spacingXL,
    minWidth: 200,
  },
  successButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
