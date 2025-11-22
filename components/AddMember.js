import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SIZES } from '../constants/theme';
import ApiService from '../services/api.service';

const CONNECTION_PLACEHOLDER = '- Select Connection -';
const RELATIONSHIP_OPTIONS = [
  { id: 0, name: '- Select Relationship -' },
  { id: 1, name: 'Mother' },
  { id: 2, name: 'Father' },
  { id: 3, name: 'Daughter' },
  { id: 4, name: 'Son' },
  { id: 5, name: 'Sister' },
  { id: 6, name: 'Brother' },
  { id: 7, name: 'Husband' },
  { id: 8, name: 'Wife' },
  { id: 9, name: 'Grandmother' },
  { id: 10, name: 'Grandfather' },
  { id: 11, name: 'Cousin' },
  { id: 12, name: 'Aunt' },
  { id: 13, name: 'Uncle' },
  { id: 14, name: 'Niece' },
  { id: 15, name: 'Nephew' },
  { id: 16, name: 'Personal Friend' },
  { id: 17, name: 'Family Friend' },
  { id: 18, name: 'Family Dog' },
];

export default function AddMember({
  visible,
  groupName,
  groupImage,
  onClose,
  onAddMember,
  existingMembers = [],
}) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedRelationship, setSelectedRelationship] = useState(RELATIONSHIP_OPTIONS[0].name);
  const [selectedRelationshipId, setSelectedRelationshipId] = useState(RELATIONSHIP_OPTIONS[0].id);
  const [selectedConnection, setSelectedConnection] = useState(CONNECTION_PLACEHOLDER);
  const [isManageAccount, setIsManageAccount] = useState(false);
  const [showManageAccountInfo, setShowManageAccountInfo] = useState(false);
  const [hideEmailField, setHideEmailField] = useState(false);
  const [enableFirstLastName, setEnableFirstLastName] = useState(true);
  const [showRelationshipPicker, setShowRelationshipPicker] = useState(false);
  const [showConnectionPicker, setShowConnectionPicker] = useState(false);

  const [connections, setConnections] = useState([]);
  const [connectionProfileId, setConnectionProfileId] = useState(null);
  const [relationTypeIdForConnection, setRelationTypeIdForConnection] = useState(null);
  const [nonAccountList, setNonAccountList] = useState([]);
  const [shouldShowManageAccount, setShouldShowManageAccount] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailCheckAvailable, setEmailCheckAvailable] = useState(false);
  const [autoFilledFromEmail, setAutoFilledFromEmail] = useState(false);
  const [lastCheckedEmail, setLastCheckedEmail] = useState(null);

  const isRelationshipPlaceholder = selectedRelationshipId === 0;
  const displayedRelationship = isRelationshipPlaceholder ? RELATIONSHIP_OPTIONS[0].name : selectedRelationship;
  const displayedConnection = selectedConnection || CONNECTION_PLACEHOLDER;
  const isConnectionPlaceholder = displayedConnection === CONNECTION_PLACEHOLDER;

  useEffect(() => {
    if (visible) {
      resetForm();
      fetchNonAccountList();
    }
  }, [visible]);

  useEffect(() => {
    if (!visible || hideEmailField) {
      setEmailCheckAvailable(false);
      return;
    }

    const trimmed = email.trim();
    const valid = validateEmail(trimmed);
    setEmailCheckAvailable(valid);

    if (!valid || (autoFilledFromEmail && trimmed !== lastCheckedEmail)) {
      if (autoFilledFromEmail) {
        setFirstName('');
        setLastName('');
        setEnableFirstLastName(true);
        setSelectedRelationship(RELATIONSHIP_OPTIONS[0].name);
        setSelectedRelationshipId(RELATIONSHIP_OPTIONS[0].id);
        setAutoFilledFromEmail(false);
        setLastCheckedEmail(null);
      }
    }
  }, [email, hideEmailField, autoFilledFromEmail, lastCheckedEmail, visible]);

  const fetchNonAccountList = async () => {
    try {
      setLoading(true);
      const response = await ApiService.getNonAccountList();

      if (response.success && response.data && response.data.nonAccountList) {
        const accounts = response.data.nonAccountList;
        setNonAccountList(accounts);

        // Build connections list
        const connectionsList = [CONNECTION_PLACEHOLDER];
        accounts.forEach((account) => {
          const fullName = `${account.firstName || ''} ${account.lastName || ''}`.trim();
          if (fullName) {
            connectionsList.push(fullName);
          }
        });
        setConnections(connectionsList);
        setShouldShowManageAccount(true); // Always show manage account toggle
      } else {
        setShouldShowManageAccount(true);
        setConnections([CONNECTION_PLACEHOLDER]);
      }
      setLoading(false);
    } catch (error) {
      console.error('Error fetching non-account list:', error);
      setShouldShowManageAccount(true); // Show toggle even on error (iOS behavior)
      setConnections([CONNECTION_PLACEHOLDER]);
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFirstName('');
    setLastName('');
    setEmail('');
    setSelectedRelationship(RELATIONSHIP_OPTIONS[0].name);
    setSelectedRelationshipId(RELATIONSHIP_OPTIONS[0].id);
    setSelectedConnection(CONNECTION_PLACEHOLDER);
    setIsManageAccount(false);
    setHideEmailField(false);
    setEnableFirstLastName(true);
    setConnectionProfileId(null);
    setRelationTypeIdForConnection(null);
    setCheckingEmail(false);
    setEmailCheckAvailable(false);
    setAutoFilledFromEmail(false);
    setLastCheckedEmail(null);
  };

  const handleManageAccountToggle = () => {
    const newValue = !isManageAccount;
    setIsManageAccount(newValue);
    setHideEmailField(newValue);

    if (newValue) {
      // When manage account is enabled, reset relationship
      setSelectedRelationship(RELATIONSHIP_OPTIONS[0].name);
      setSelectedRelationshipId(RELATIONSHIP_OPTIONS[0].id);
      setSelectedConnection(CONNECTION_PLACEHOLDER);
      setEmail('');
      setEmailCheckAvailable(false);
      setAutoFilledFromEmail(false);
      setLastCheckedEmail(null);
      setEnableFirstLastName(true);
    } else {
      // When disabled, reset connection data
      setSelectedConnection(CONNECTION_PLACEHOLDER);
      setConnectionProfileId(null);
      setRelationTypeIdForConnection(null);
      setFirstName('');
      setLastName('');
      setEnableFirstLastName(true);
      setSelectedRelationship(RELATIONSHIP_OPTIONS[0].name);
      setSelectedRelationshipId(RELATIONSHIP_OPTIONS[0].id);
    }
  };

  const handleConnectionSelect = (connection, index) => {
    if (index === 0) {
      setSelectedConnection(CONNECTION_PLACEHOLDER);
      setConnectionProfileId(null);
      setRelationTypeIdForConnection(null);
      setFirstName('');
      setLastName('');
      setEnableFirstLastName(true);
      return;
    }

    setSelectedConnection(connection);
    setShowConnectionPicker(false);

    // Get account data from nonAccountList (index-1 because first item is placeholder)
    const account = nonAccountList[index - 1];
    if (account) {
      setConnectionProfileId(account.memberProfileId);
      setRelationTypeIdForConnection(account.relationshipTypeId);
      setFirstName(account.firstName || '');
      setLastName(account.lastName || '');
      setEnableFirstLastName(false);

      // Set the relationship automatically based on the account
      const relationshipName = RELATIONSHIP_OPTIONS.find(
        (r) => r.id === account.relationshipTypeId
      )?.name || '';
      setSelectedRelationship(relationshipName || RELATIONSHIP_OPTIONS[0].name);
      setSelectedRelationshipId(account.relationshipTypeId || RELATIONSHIP_OPTIONS[0].id);
    }
  };

  const handleRelationshipSelect = (relationship) => {
    setSelectedRelationship(relationship.name);
    setSelectedRelationshipId(relationship.id);
    setShowRelationshipPicker(false);
    if (relationship.id === 0) {
      setEnableFirstLastName(true);
    }
  };

  const validateEmail = (email) => {
    return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email);
  };

  const handleEmailCheck = async () => {
    const trimmed = email.trim();
    if (!validateEmail(trimmed)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address before checking.');
      return;
    }

    try {
      setCheckingEmail(true);
      const response = await ApiService.fetchRelationshipByEmail(trimmed);

      if (response?.success && response?.data) {
        // Success case - matching iOS lines 176-192
        const fetchedFirstName = response.data.firstName || '';
        const fetchedLastName = response.data.lastName || '';
        const fetchedRelationId = Number(response.data.relationShipId ?? response.data.relationshipTypeId ?? 0);

        const hasName = Boolean(fetchedFirstName.trim()) || Boolean(fetchedLastName.trim());

        setFirstName(fetchedFirstName);
        setLastName(fetchedLastName);
        setEnableFirstLastName(!hasName);
        setAutoFilledFromEmail(hasName);
        setLastCheckedEmail(trimmed);

        if (Number.isFinite(fetchedRelationId) && fetchedRelationId > 0) {
          const relationMatch = RELATIONSHIP_OPTIONS.find((option) => option.id === fetchedRelationId);
          if (relationMatch) {
            setSelectedRelationship(relationMatch.name);
            setSelectedRelationshipId(relationMatch.id);
          } else {
            setSelectedRelationship(RELATIONSHIP_OPTIONS[0].name);
            setSelectedRelationshipId(RELATIONSHIP_OPTIONS[0].id);
          }
        } else {
          setSelectedRelationship(RELATIONSHIP_OPTIONS[0].name);
          setSelectedRelationshipId(RELATIONSHIP_OPTIONS[0].id);
        }
      } else {
        // Failure case - matching iOS lines 197-206
        // iOS doesn't show any alert here, just resets the fields silently
        setFirstName('');
        setLastName('');
        setEnableFirstLastName(true);
        setAutoFilledFromEmail(false);
        setLastCheckedEmail(null);
        setSelectedRelationship(RELATIONSHIP_OPTIONS[0].name);
        setSelectedRelationshipId(RELATIONSHIP_OPTIONS[0].id);
      }
    } catch (error) {
      // Network error - matching iOS lines 164-166
      console.error('Error fetching relationship from email:', error);
      setFirstName('');
      setLastName('');
      setEnableFirstLastName(true);
      setAutoFilledFromEmail(false);
      setLastCheckedEmail(null);
      setSelectedRelationship(RELATIONSHIP_OPTIONS[0].name);
      setSelectedRelationshipId(RELATIONSHIP_OPTIONS[0].id);
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleAddMember = async () => {
    const isManageAccount = shouldShowManageAccount && hideEmailField;


    if (hideEmailField) {
      // Manage account flow (connection)
      if (!firstName.trim() || !lastName.trim() || !relationTypeIdForConnection) {
        console.error('❌ AddMember - Validation failed: Missing required fields');
        Alert.alert('Error', 'Please enter all the required fields');
        return;
      }

      // Check for duplicate
      const isDuplicate = existingMembers.some(
        (member) => member.memberProfileId === connectionProfileId
      );
      if (isDuplicate) {
        console.error('❌ AddMember - Duplicate member detected');
        Alert.alert('Whoops', 'This member is already added to the Group');
        return;
      }

      const member = {
        memberProfileId: connectionProfileId,
        memberFirstName: firstName,
        memberLastName: lastName,
        memberEmail: '',
        nonAccountMember: true,
        relationshipTypeId: relationTypeIdForConnection,
        isImmediateFamily: true,
        isAdmin: false,
        shareSensitiveContent: true,
      };


      let shouldClose = true;
      try {
        setLoading(true);
        const callbackResult = onAddMember ? await onAddMember(member) : true;
        shouldClose = callbackResult !== false;
      } catch (error) {
        console.error('❌ AddMember - Failed to add connection member:', error);
        Alert.alert('Whoops', error?.message || 'Unable to add member right now.');
        shouldClose = false;
      } finally {
        setLoading(false);
      }

      if (!shouldClose) {
        return;
      }

      resetForm();
      onClose();
      return;
    }

    // Email flow
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !selectedRelationshipId) {
      console.error('❌ AddMember - Validation failed: Missing required fields');
      Alert.alert('Error', 'Please enter all the required fields');
      return;
    }

    if (!validateEmail(email)) {
      console.error('❌ AddMember - Validation failed: Invalid email');
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    // Check for duplicate
    const isDuplicate = existingMembers.some(
      (member) => member.memberEmail === email
    );
    if (isDuplicate) {
      console.error('❌ AddMember - Duplicate member detected');
      Alert.alert('Whoops', 'This member is already added to the Group');
      return;
    }

    const member = {
      memberProfileId: 0,
      memberFirstName: firstName,
      memberLastName: lastName,
      memberEmail: email,
      nonAccountMember: isManageAccount,
      relationshipTypeId: selectedRelationshipId,
      isImmediateFamily: true,
      isAdmin: false,
      shareSensitiveContent: true,
    };


    let shouldClose = true;
    try {
      setLoading(true);
      const callbackResult = onAddMember ? await onAddMember(member) : true;
      shouldClose = callbackResult !== false;
    } catch (error) {
      console.error('❌ AddMember - Failed to add email member:', error);
      Alert.alert('Whoops', error?.message || 'Unable to add member right now.');
      shouldClose = false;
    } finally {
      setLoading(false);
    }

    if (!shouldClose) {
      return;
    }

    resetForm();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.groupInfo}>
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

          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Image
              source={require('../assets/images/close.png')}
              style={styles.closeIcon}
            />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Image
            source={require('../assets/images/iconEmptyProfile.png')}
            style={styles.userIcon}
          />

          <Text style={styles.title}>Group Members</Text>

          <TextInput
            style={[styles.input, !enableFirstLastName && styles.inputDisabled]}
            placeholder="First Name (require)"
            value={firstName}
            onChangeText={setFirstName}
            placeholderTextColor={COLORS.lightGrayColor}
            editable={enableFirstLastName}
          />

          <TextInput
            style={[styles.input, !enableFirstLastName && styles.inputDisabled]}
            placeholder="Last Name (require)"
            value={lastName}
            onChangeText={setLastName}
            placeholderTextColor={COLORS.lightGrayColor}
            editable={enableFirstLastName}
          />

          {hideEmailField ? (
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowConnectionPicker(true)}
            >
              <Text
                style={[
                  styles.pickerText,
                  isConnectionPlaceholder && styles.pickerPlaceholder,
                ]}
              >
                {displayedConnection}
              </Text>
              <Image
                source={require('../assets/images/iconCreate.png')}
                style={styles.dropdownIcon}
              />
            </TouchableOpacity>
          ) : (
            <View style={styles.emailInputWrapper}>
              <TextInput
                style={[styles.input, styles.inputWithButton]}
                placeholder="Email"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor={COLORS.lightGrayColor}
              />
              {emailCheckAvailable ? (
                <TouchableOpacity
                  style={styles.emailCheckButton}
                  onPress={handleEmailCheck}
                  disabled={checkingEmail}
                >
                  {checkingEmail ? (
                    <ActivityIndicator size="small" color={COLORS.purple2} />
                  ) : (
                    <Text style={styles.emailCheckText}>Check</Text>
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.pickerButton,
              autoFilledFromEmail && styles.pickerButtonDisabled,
            ]}
            onPress={() => setShowRelationshipPicker(true)}
            disabled={autoFilledFromEmail}
          >
            <Text
              style={[
                styles.pickerText,
                isRelationshipPlaceholder && styles.pickerPlaceholder,
                autoFilledFromEmail && styles.pickerTextDisabled,
              ]}
            >
              {displayedRelationship}
            </Text>
            <Ionicons
              name="people-outline"
              size={20}
              color={autoFilledFromEmail ? COLORS.lightGrayColor : COLORS.lightGrayColor}
              style={styles.dropdownIcon}
            />
          </TouchableOpacity>

          {shouldShowManageAccount && (
            <View style={styles.manageAccountSection}>
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={handleManageAccountToggle}
              >
                <Image
                  source={
                    isManageAccount
                      ? require('../assets/images/iconChecked.png')
                      : require('../assets/images/iconUnChecked.png')
                  }
                  style={styles.checkbox}
                />
                <Text style={styles.checkboxLabel}>Manage this account</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowManageAccountInfo(true)}
                style={styles.infoButton}
              >
                <Text style={styles.infoButtonText}>What does this mean?</Text>
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity style={styles.addButton} onPress={handleAddMember}>
            <Text style={styles.addButtonText}>Add Member</Text>
          </TouchableOpacity>
        </ScrollView>

        {loading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.purple1} />
          </View>
        )}
      </View>

      {/* Relationship Picker Modal */}
      <Modal
        visible={showRelationshipPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowRelationshipPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModal}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Relationship</Text>
              <TouchableOpacity
                onPress={() => setShowRelationshipPicker(false)}
              >
                <Text style={styles.pickerCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {RELATIONSHIP_OPTIONS.map((relationship) => (
                <TouchableOpacity
                  key={relationship.id}
                  style={styles.pickerItem}
                  onPress={() => handleRelationshipSelect(relationship)}
                >
                  <Text style={styles.pickerItemText}>{relationship.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Connection Picker Modal */}
      <Modal
        visible={showConnectionPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowConnectionPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.pickerModal}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Connection</Text>
              <TouchableOpacity
                onPress={() => setShowConnectionPicker(false)}
              >
                <Text style={styles.pickerCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
            <ScrollView>
              {connections.map((connection, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.pickerItem}
                  onPress={() => handleConnectionSelect(connection, index)}
                >
                  <Text style={styles.pickerItemText}>{connection}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Manage Account Info Modal */}
      <Modal
        visible={showManageAccountInfo}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowManageAccountInfo(false)}
      >
        <TouchableOpacity
          style={styles.infoModalOverlay}
          activeOpacity={1}
          onPress={() => setShowManageAccountInfo(false)}
        >
          <View style={styles.infoModal}>
            <Text style={styles.infoTitle}>Manage Account</Text>
            <Text style={styles.infoText}>
              When you manage an account, you can create and share content on
              behalf of that person. This is useful for children, elderly family
              members, or pets who don't have their own account.
            </Text>
            <TouchableOpacity
              style={styles.infoCloseButton}
              onPress={() => setShowManageAccountInfo(false)}
            >
              <Text style={styles.infoCloseButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.purple0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.spacingM,
    paddingTop: 60,
    paddingBottom: SIZES.spacingM,
  },
  groupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  closeButton: {
    padding: SIZES.spacingS,
  },
  closeIcon: {
    width: 16,
    height: 16,
    tintColor: COLORS.purple1,
  },
  scrollContent: {
    padding: SIZES.spacingM,
    paddingBottom: 40,
  },
  userIcon: {
    width: 58,
    height: 58,
    tintColor: COLORS.purple3,
    alignSelf: 'center',
    marginTop: SIZES.spacingL,
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: COLORS.purple3,
    textAlign: 'center',
    marginBottom: SIZES.spacingL,
  },
  input: {
    height: SIZES.defaultTextFieldHeight,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.cornerRadius12,
    paddingHorizontal: SIZES.spacingM,
    marginTop: SIZES.spacingM,
    fontSize: 16,
    color: COLORS.black,
    outlineStyle: 'none',
  },
  inputWithButton: {
    paddingRight: SIZES.spacingXL,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  emailInputWrapper: {
    position: 'relative',
  },
  emailCheckButton: {
    position: 'absolute',
    right: SIZES.spacingS,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: SIZES.spacingS,
  },
  emailCheckText: {
    color: COLORS.purple2,
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  pickerButton: {
    height: SIZES.defaultTextFieldHeight,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.cornerRadius12,
    paddingHorizontal: SIZES.spacingM,
    marginTop: SIZES.spacingS,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerText: {
    fontSize: 16,
    color: COLORS.purple3,
  },
  pickerPlaceholder: {
    color: COLORS.lightGrayColor,
  },
  pickerButtonDisabled: {
    opacity: 0.6,
  },
  pickerTextDisabled: {
    color: COLORS.lightGrayColor,
  },
  dropdownIcon: {
    width: 16,
    height: 16,
    tintColor: COLORS.black,
  },
  manageAccountSection: {
    marginTop: SIZES.spacingM,
    alignItems: 'center',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 16,
    height: 16,
    tintColor: COLORS.purple1,
  },
  checkboxLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.purple3,
    marginLeft: SIZES.spacingS,
  },
  infoButton: {
    marginTop: SIZES.spacingS,
  },
  infoButtonText: {
    fontSize: 14,
    color: COLORS.purple3,
    textDecorationLine: 'underline',
  },
  addButton: {
    height: SIZES.defaultTextFieldHeight,
    backgroundColor: COLORS.buttonColor,
    borderRadius: SIZES.cornerRadius12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: SIZES.spacingL,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  pickerModal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '60%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: SIZES.spacingM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGrayColor,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: COLORS.black,
  },
  pickerCloseText: {
    fontSize: 16,
    color: COLORS.purple1,
  },
  pickerItem: {
    padding: SIZES.spacingM,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.purple0,
  },
  pickerItemText: {
    fontSize: 16,
    color: COLORS.black,
  },
  infoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'flex-end',
  },
  infoModal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: SIZES.spacingL,
  },
  infoTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: SIZES.spacingM,
  },
  infoText: {
    fontSize: 16,
    color: COLORS.black,
    lineHeight: 24,
    marginBottom: SIZES.spacingL,
  },
  infoCloseButton: {
    height: SIZES.defaultTextFieldHeight,
    backgroundColor: COLORS.buttonColor,
    borderRadius: SIZES.cornerRadius12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoCloseButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
