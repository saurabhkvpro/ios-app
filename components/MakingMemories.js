import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
} from 'react-native';
import { COLORS, SIZES } from '../constants/theme';

export default function MakingMemories({
  groupName,
  groupImage,
  members = [],
  onAddMember,
  onRemoveMember,
  onCreateGroup,
  onSkip,
  showSkip = false,
}) {
  const relationshipList = [
    'Mother',
    'Father',
    'Daughter',
    'Son',
    'Sister',
    'Brother',
    'Husband',
    'Wife',
    'Grandmother',
    'Grandfather',
    'Cousin',
    'Aunt',
    'Uncle',
    'Niece',
    'Nephew',
    'Personal Friend',
    'Family Friend',
    'Family Dog',
  ];

  const getRelationshipName = (relationshipTypeId) => {
    if (relationshipTypeId > 0 && relationshipTypeId <= relationshipList.length) {
      return relationshipList[relationshipTypeId - 1];
    }
    return '';
  };

  const handleRemoveMember = (index) => {
    Alert.alert(
      'Confirmation',
      'Are you sure you want to delete this member?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => {},
        },
        {
          text: 'OK',
          onPress: () => {
            onRemoveMember(index);
          },
        },
      ]
    );
  };

  const handleAddMember = () => {
    onAddMember();
  };

  const handleCreateGroup = () => {
    onCreateGroup();
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Start making memories!</Text>

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>Groups</Text>

        <View style={styles.groupRow}>
          <Image
            source={
              groupImage
                ? { uri: groupImage }
                : require('../assets/images/groupImage.png')
            }
            style={[
              styles.groupIcon,
              !groupImage && { tintColor: COLORS.purple1 },
            ]}
          />
          <Text style={styles.groupName} numberOfLines={1}>
            {groupName}
          </Text>
        </View>

        {members.length > 0 && (
          <View style={styles.membersContainer}>
            {members.map((member, index) => (
              <View key={index} style={styles.memberRow}>
                <TouchableOpacity
                  onPress={() => handleRemoveMember(index)}
                  style={styles.removeButton}
                >
                  <Image
                    source={require('../assets/images/close.png')}
                    style={styles.minusIcon}
                  />
                </TouchableOpacity>

                <Text style={styles.memberName} numberOfLines={1}>
                  {member.memberFirstName || member.firstName}{' '}
                  {member.memberLastName || member.lastName}
                </Text>

                <View style={styles.spacer} />

                {(member.relationshipTypeId > 0 || member.relationship) && (
                  <Text style={styles.relationshipTag}>
                    {member.relationship ||
                      getRelationshipName(member.relationshipTypeId)}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.addMemberButton} onPress={handleAddMember}>
          <Image
            source={require('../assets/images/icPlus.png')}
            style={styles.plusIcon}
          />
          <Text style={styles.addMemberText}>Add Member</Text>
        </TouchableOpacity>

        <View style={styles.divider} />

        <TouchableOpacity style={styles.createButton} onPress={handleCreateGroup}>
          <Text style={styles.createButtonText}>Create a group</Text>
        </TouchableOpacity>

        {showSkip && (
          <View style={styles.skipContainer}>
            <TouchableOpacity onPress={onSkip}>
              <Text style={styles.skipText}>Skip</Text>
            </TouchableOpacity>
            <Text style={styles.skipLaterText}>, and do later.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.purple0,
  },
  scrollContent: {
    padding: SIZES.spacingM,
    paddingTop: 80,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.titleColor,
    textAlign: 'center',
    marginTop: SIZES.spacingXXL,
    marginBottom: SIZES.spacingL,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.purple3,
    marginVertical: SIZES.spacingM,
  },
  sectionLabel: {
    fontSize: 16,
    color: COLORS.purple1,
    marginVertical: SIZES.spacingM,
  },
  groupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SIZES.spacingM,
  },
  groupIcon: {
    width: 40,
    height: 40,
    borderRadius: SIZES.spacingS,
  },
  groupName: {
    fontSize: 18,
    color: COLORS.purple1,
    marginLeft: SIZES.spacingM,
    flex: 1,
  },
  membersContainer: {
    marginTop: SIZES.spacingM,
    paddingLeft: SIZES.spacingXL,
  },
  memberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: SIZES.defaultTextFieldHeight,
    marginBottom: SIZES.spacingS,
  },
  removeButton: {
    width: 30,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  minusIcon: {
    width: 16,
    height: 16,
    tintColor: COLORS.purple1,
  },
  memberName: {
    fontSize: 14,
    color: COLORS.black,
    marginLeft: SIZES.spacingS,
    flex: 1,
  },
  spacer: {
    flex: 1,
  },
  relationshipTag: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.black,
    paddingHorizontal: SIZES.spacingS,
  },
  addMemberButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginVertical: SIZES.spacingM,
  },
  plusIcon: {
    width: 20,
    height: 20,
    tintColor: COLORS.purple3,
    marginRight: SIZES.spacingS,
  },
  addMemberText: {
    fontSize: 16,
    color: COLORS.purple3,
  },
  createButton: {
    height: SIZES.defaultTextFieldHeight,
    backgroundColor: COLORS.buttonColor,
    borderRadius: SIZES.cornerRadius12,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: SIZES.spacingL,
  },
  createButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  skipContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.spacingM,
  },
  skipText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.purple3,
  },
  skipLaterText: {
    fontSize: 14,
    color: COLORS.purple3,
  },
});
