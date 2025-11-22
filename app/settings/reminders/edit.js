import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  StatusBar,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ApiService from '../../../services/api.service';
import LoadingIndicator from '../../../components/LoadingIndicator';
import ErrorToast from '../../../components/ErrorToast';
import { COLORS, SIZES } from '../../../constants/theme';
import SettingsCard from '../../../components/settings/SettingsCard';

const parseReminderParam = (raw) => {
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw);
    return JSON.parse(decoded);
  } catch (err) {
    console.error('Failed to parse reminder param', err);
    return null;
  }
};

const parseCircleMembers = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (payload.memberList) return Array.isArray(payload.memberList) ? payload.memberList : [];
  if (payload.data) return parseCircleMembers(payload.data);
  return [];
};

const resolveMemberName = (member) => {
  if (!member) return 'Connection';
  const first = member.firstName || member.memberFirstName || '';
  const last = member.lastName || member.memberLastName || '';
  const composed = `${first} ${last}`.trim();
  if (composed) return composed;
  return member.fullName || member.memberName || member.name || 'Connection';
};

const ReminderEditorScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const reminderData = useMemo(() => parseReminderParam(params?.reminder), [params?.reminder]);
  const connectionIdParam = useMemo(() => {
    const raw = Array.isArray(params?.connectionId) ? params.connectionId[0] : params?.connectionId;
    if (raw == null) return null;
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }, [params?.connectionId]);
  const connectionNameParam = useMemo(() => {
    const raw = Array.isArray(params?.connectionName) ? params.connectionName[0] : params?.connectionName;
    if (!raw) return null;
    return String(raw);
  }, [params?.connectionName]);
  const isEditMode = Boolean(reminderData?.id);

  const [title, setTitle] = useState(reminderData?.title || '');
  const [selectedDateTime, setSelectedDateTime] = useState(() => {
    if (reminderData?.notificationDateTime) {
      const parsed = new Date(reminderData.notificationDateTime);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    return new Date();
  });
  const [remindEachYear, setRemindEachYear] = useState(Boolean(reminderData?.remindEachYear));
  const initialSelectedConnection = useMemo(() => {
    if (reminderData?.userConnectionId) {
      return {
        userConnectionId: reminderData.userConnectionId,
        userConnectionName:
          reminderData.userConnectionName || reminderData.connectionName || resolveMemberName(reminderData),
      };
    }
    if (connectionIdParam) {
      return {
        userConnectionId: connectionIdParam,
        userConnectionName: connectionNameParam || 'Selected connection',
      };
    }
    return null;
  }, [connectionIdParam, connectionNameParam, reminderData]);

  const [selectedConnection, setSelectedConnection] = useState(initialSelectedConnection);

  const [circleMembers, setCircleMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState({ visible: false, message: '' });
  const [connectionModalVisible, setConnectionModalVisible] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState('date');
  const [pickerValue, setPickerValue] = useState(() => selectedDateTime || new Date());

  const hideError = useCallback(() => setError({ visible: false, message: '' }), []);
  const showError = useCallback((message) => setError({ visible: true, message }), []);

  useEffect(() => {
    setSelectedConnection(initialSelectedConnection);
  }, [initialSelectedConnection]);

  useEffect(() => {
    const loadCircleMembers = async () => {
      try {
        setLoading(true);
        const response = await ApiService.getCircleList();
        const members = parseCircleMembers(response);
        setCircleMembers(Array.isArray(members) ? members : []);
      } catch (err) {
        console.error('⚠️ Fetch circle members error', err);
        showError('Unable to load circle members.');
      } finally {
        setLoading(false);
      }
    };

    loadCircleMembers();
  }, [showError]);

  const formattedDate = useMemo(() => {
    if (!selectedDateTime) return 'Select date';
    return selectedDateTime.toLocaleDateString();
  }, [selectedDateTime]);

  const formattedTime = useMemo(() => {
    if (!selectedDateTime) return 'Select time';
    return selectedDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [selectedDateTime]);

  const openPicker = useCallback(
    (mode) => {
      setPickerMode(mode);
      setPickerValue(selectedDateTime ? new Date(selectedDateTime) : new Date());
      setPickerVisible(true);
    },
    [selectedDateTime]
  );

  const closePicker = useCallback(() => {
    setPickerVisible(false);
  }, []);

  const handlePickerChange = useCallback(
    (_, value) => {
      if (value) {
        setPickerValue(value);
      }
    },
    []
  );

  const handlePickerConfirm = useCallback(() => {
    setSelectedDateTime((prev) => {
      const base = new Date(prev || new Date());
      const next = new Date(pickerValue || new Date());
      if (pickerMode === 'date') {
        base.setFullYear(next.getFullYear(), next.getMonth(), next.getDate());
      } else {
        base.setHours(next.getHours(), next.getMinutes(), 0, 0);
      }
      return base;
    });
    closePicker();
  }, [closePicker, pickerMode, pickerValue]);

  const handleSelectConnection = useCallback((member) => {
    setSelectedConnection({
      userConnectionId: member.userConnectionId || member.userProfileId,
      userConnectionName: resolveMemberName(member),
    });
    setConnectionModalVisible(false);
  }, []);

  const canSave = useMemo(() => {
    return Boolean(title.trim()) && Boolean(selectedConnection?.userConnectionId) && Boolean(selectedDateTime);
  }, [selectedConnection?.userConnectionId, selectedDateTime, title]);

  const payloadDateTime = useMemo(() => {
    if (!selectedDateTime) return null;
    try {
      return selectedDateTime.toISOString();
    } catch (err) {
      return null;
    }
  }, [selectedDateTime]);

  const handleSave = useCallback(async () => {
    if (!canSave || !payloadDateTime) return;

    try {
      hideError();
      setLoading(true);
      const payload = {
        id: reminderData?.id,
        title: title.trim(),
        notificationDateTime: payloadDateTime,
        userConnectionId: selectedConnection.userConnectionId,
        remindEachYear,
      };

      const response = isEditMode
        ? await ApiService.updateReminder(payload)
        : await ApiService.addReminder(payload);

      const success = response?.success ?? false;
      if (success) {
        router.back();
      } else {
        showError(response?.message || 'Unable to save reminder.');
      }
    } catch (err) {
      console.error('Save reminder error', err);
      showError(err?.message || 'Unable to save reminder.');
    } finally {
      setLoading(false);
    }
  }, [canSave, hideError, isEditMode, payloadDateTime, remindEachYear, reminderData?.id, selectedConnection, showError, title, router]);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <ErrorToast visible={error.visible} message={error.message} onClose={hideError} />
        <LoadingIndicator visible={loading} />

        <View style={styles.headerBar}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.headerAction}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{isEditMode ? 'Edit Reminder' : 'New Reminder'}</Text>
          <TouchableOpacity
            onPress={handleSave}
            activeOpacity={canSave ? 0.7 : 1}
            disabled={!canSave}
          >
            <Text style={[styles.headerAction, !canSave && styles.headerActionDisabled]}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <SettingsCard style={styles.formCard}>
            <Text style={styles.helperCopy}>
              Fill in the reminder details below. You can choose the date, time, and who this reminder is for.
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Reminder Title</Text>
              <TextInput
                style={styles.input}
                placeholder="Add title"
                placeholderTextColor={COLORS.purple3}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={styles.selectorGroup}>
              <TouchableOpacity style={styles.selectorRow} onPress={() => openPicker('date')} activeOpacity={0.85}>
                <View>
                  <Text style={styles.selectorLabel}>Date</Text>
                  <Text style={styles.selectorValue}>{formattedDate}</Text>
                </View>
                <Text style={styles.selectorAction}>Change</Text>
              </TouchableOpacity>
              <View style={styles.inlineDivider} />
              <TouchableOpacity style={styles.selectorRow} onPress={() => openPicker('time')} activeOpacity={0.85}>
                <View>
                  <Text style={styles.selectorLabel}>Time</Text>
                  <Text style={styles.selectorValue}>{formattedTime}</Text>
                </View>
                <Text style={styles.selectorAction}>Change</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Connection</Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setConnectionModalVisible(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.selectorText}>
                  {selectedConnection?.userConnectionName || 'Choose connection'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Repeat every year</Text>
              <Switch
                value={remindEachYear}
                onValueChange={setRemindEachYear}
                thumbColor={remindEachYear ? COLORS.buttonColor : COLORS.white}
                trackColor={{ false: COLORS.purple0, true: COLORS.buttonColor }}
              />
            </View>

            <TouchableOpacity
              style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
              onPress={handleSave}
              activeOpacity={canSave ? 0.85 : 1}
              disabled={!canSave}
            >
              <Text style={styles.saveButtonText}>{isEditMode ? 'Update Reminder' : 'Create Reminder'}</Text>
            </TouchableOpacity>
          </SettingsCard>
        </ScrollView>
        <Modal visible={connectionModalVisible} transparent animationType="fade">
          <Pressable style={styles.modalOverlay} onPress={() => setConnectionModalVisible(false)}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Select Connection</Text>
              <ScrollView>
                {circleMembers.map((member) => {
                  const memberId = member.userConnectionId || member.userProfileId;
                  const isSelected = selectedConnection?.userConnectionId === memberId;
                  return (
                  <TouchableOpacity
                    key={`member-${memberId}`}
                    style={[styles.modalRow, isSelected && styles.modalRowSelected]}
                    onPress={() => handleSelectConnection(member)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.modalRowText, isSelected && styles.modalRowTextSelected]}>
                      {resolveMemberName(member)}
                    </Text>
                    {isSelected ? <Text style={styles.modalSelectedBadge}>Selected</Text> : null}
                  </TouchableOpacity>
                );
                })}
                {circleMembers.length === 0 ? (
                  <Text style={styles.modalEmpty}>No circle members available.</Text>
                ) : null}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>

        <Modal visible={pickerVisible} transparent animationType="fade">
          <Pressable style={styles.sheetOverlay} onPress={closePicker}>
            <Pressable style={styles.sheetContainer} onPress={(event) => event.stopPropagation()}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>{pickerMode === 'date' ? 'Select Date' : 'Select Time'}</Text>
                <TouchableOpacity onPress={closePicker} activeOpacity={0.7}>
                  <Text style={styles.sheetCloseText}>Cancel</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                key={pickerMode} // forces remount when toggling between date and time to keep spinner visible
                mode={pickerMode}
                display="spinner"
                value={pickerValue || new Date()}
                onChange={handlePickerChange}
                style={styles.sheetPicker}
              />
              <TouchableOpacity style={styles.sheetConfirmButton} onPress={handlePickerConfirm} activeOpacity={0.8}>
                <Text style={styles.sheetConfirmText}>Done</Text>
              </TouchableOpacity>
            </Pressable>
          </Pressable>
        </Modal>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgColor,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bgColor,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.spacingM,
    paddingVertical: SIZES.spacingS,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.purple2,
  },
  headerAction: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.purple2,
  },
  headerActionDisabled: {
    opacity: 0.4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: SIZES.spacingXXL,
  },
  formCard: {
    paddingVertical: SIZES.spacingL,
  },
  helperCopy: {
    fontSize: 14,
    color: COLORS.purple3,
    paddingHorizontal: SIZES.spacingM,
    marginBottom: SIZES.spacingL,
  },
  formGroup: {
    marginBottom: SIZES.spacingM,
    paddingHorizontal: SIZES.spacingM,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.purple2,
    marginBottom: SIZES.spacingXS,
  },
  input: {
    backgroundColor: COLORS.purple0,
    borderRadius: SIZES.cornerRadius12,
    paddingHorizontal: SIZES.spacingM,
    paddingVertical: SIZES.spacingM,
    fontSize: 16,
    color: COLORS.textColor,
  },
  selectorGroup: {
    backgroundColor: COLORS.purple0,
    borderRadius: SIZES.cornerRadius12,
    marginHorizontal: SIZES.spacingM,
    paddingVertical: SIZES.spacingS,
    marginBottom: SIZES.spacingM,
  },
  selectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.spacingM,
    paddingVertical: SIZES.spacingS,
  },
  selectorLabel: {
    fontSize: 12,
    color: COLORS.purple3,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  selectorValue: {
    fontSize: 16,
    color: COLORS.purple2,
    marginTop: SIZES.spacingXS / 2,
    fontWeight: '600',
  },
  selectorAction: {
    fontSize: 14,
    color: COLORS.buttonColor,
    fontWeight: '600',
  },
  inlineDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.bgColor,
    marginHorizontal: SIZES.spacingM,
  },
  selector: {
    backgroundColor: COLORS.purple0,
    borderRadius: SIZES.cornerRadius12,
    paddingHorizontal: SIZES.spacingM,
    paddingVertical: SIZES.spacingM,
    justifyContent: 'center',
  },
  selectorText: {
    fontSize: 16,
    color: COLORS.purple2,
  },
  toggleRow: {
    marginTop: SIZES.spacingS,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.spacingM,
  },
  toggleLabel: {
    fontSize: 16,
    color: COLORS.purple2,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: COLORS.buttonColor,
    borderRadius: SIZES.cornerRadius12,
    paddingVertical: SIZES.spacingM,
    alignItems: 'center',
    marginTop: SIZES.spacingL,
    marginHorizontal: SIZES.spacingM,
  },
  saveButtonDisabled: {
    backgroundColor: COLORS.purple0,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: SIZES.spacingM,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.cornerRadius16,
    paddingVertical: SIZES.spacingM,
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.purple2,
    paddingHorizontal: SIZES.spacingM,
    paddingBottom: SIZES.spacingS,
  },
  modalRow: {
    paddingHorizontal: SIZES.spacingM,
    paddingVertical: SIZES.spacingM,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalRowSelected: {
    backgroundColor: COLORS.purple0,
  },
  modalRowText: {
    fontSize: 16,
    color: COLORS.textColor,
  },
  modalRowTextSelected: {
    fontWeight: '700',
    color: COLORS.purple2,
  },
  modalSelectedBadge: {
    fontSize: 12,
    color: COLORS.buttonColor,
    fontWeight: '600',
  },
  modalEmpty: {
    paddingHorizontal: SIZES.spacingM,
    paddingVertical: SIZES.spacingM,
    fontSize: 14,
    color: COLORS.purple3,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: SIZES.cornerRadius16,
    borderTopRightRadius: SIZES.cornerRadius16,
    paddingBottom: SIZES.spacingXL,
  },
  sheetHandle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: COLORS.purple0,
    alignSelf: 'center',
    marginTop: SIZES.spacingS,
    marginBottom: SIZES.spacingS,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.spacingM,
    paddingBottom: SIZES.spacingS,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.purple2,
  },
  sheetCloseText: {
    fontSize: 14,
    color: COLORS.purple3,
    fontWeight: '600',
  },
  sheetPicker: {
    width: '100%',
    ...Platform.select({
      ios: {
        height: 216,
      },
    }),
  },
  sheetConfirmButton: {
    marginTop: SIZES.spacingM,
    marginHorizontal: SIZES.spacingM,
    backgroundColor: COLORS.buttonColor,
    borderRadius: SIZES.cornerRadius12,
    paddingVertical: SIZES.spacingM,
    alignItems: 'center',
  },
  sheetConfirmText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ReminderEditorScreen;
