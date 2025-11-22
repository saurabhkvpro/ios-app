import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StatusBar,
  Modal,
  Pressable,
  Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ApiService from '../../services/api.service';
import LoadingIndicator from '../../components/LoadingIndicator';
import ErrorToast from '../../components/ErrorToast';
import { COLORS, SIZES } from '../../constants/theme';
import SettingsCard from '../../components/settings/SettingsCard';

const EVENT_TYPES = [
  { id: 1, label: 'Birthday' },
  { id: 2, label: 'Sports' },
  { id: 3, label: 'Meeting' },
  { id: 4, label: 'Anniversary' },
];

const VISIBILITY_TYPES = [
  { id: 1, label: 'Public' },
  { id: 2, label: 'Private' },
  { id: 3, label: 'Shared' },
];

const parseEventParam = (raw) => {
  if (!raw) return null;
  try {
    const decoded = decodeURIComponent(raw);
    return JSON.parse(decoded);
  } catch (err) {
    console.error('Failed to parse event param', err);
    return null;
  }
};

const parseTagsResponse = (payload) => {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;
  if (payload.tagList) return Array.isArray(payload.tagList) ? payload.tagList : [];
  if (payload.data) return parseTagsResponse(payload.data);
  return [];
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

const EventEditorScreen = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const eventData = useMemo(() => parseEventParam(params?.event), [params?.event]);
  const isEditMode = Boolean(eventData?.id);

  const [title, setTitle] = useState(eventData?.title || '');
  const [description, setDescription] = useState(eventData?.description || '');
  const [location, setLocation] = useState(eventData?.location || '');

  const [startTime, setStartTime] = useState(() => {
    if (eventData?.startTime) {
      const parsed = new Date(eventData.startTime);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  });

  const [endTime, setEndTime] = useState(() => {
    if (eventData?.endTime) {
      const parsed = new Date(eventData.endTime);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    const defaultEnd = new Date();
    defaultEnd.setHours(defaultEnd.getHours() + 1);
    return defaultEnd;
  });

  const [firstReminder, setFirstReminder] = useState(() => {
    if (eventData?.firstReminder) {
      const parsed = new Date(eventData.firstReminder);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    const defaultReminder = new Date();
    defaultReminder.setHours(defaultReminder.getHours() - 1);
    return defaultReminder;
  });

  const [secondReminder, setSecondReminder] = useState(() => {
    if (eventData?.secondReminder) {
      const parsed = new Date(eventData.secondReminder);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    const defaultReminder = new Date();
    defaultReminder.setDate(defaultReminder.getDate() - 1);
    return defaultReminder;
  });

  const [eventType, setEventType] = useState(eventData?.eventType || 1);
  const [visibilityType, setVisibilityType] = useState(eventData?.visibilityType || 2);
  const [selectedTags, setSelectedTags] = useState(eventData?.tags || []);
  const [selectedMembers, setSelectedMembers] = useState(eventData?.shareWithId || []);

  const [availableTags, setAvailableTags] = useState([]);
  const [circleMembers, setCircleMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState({ visible: false, message: '' });

  const [eventTypeModalVisible, setEventTypeModalVisible] = useState(false);
  const [visibilityModalVisible, setVisibilityModalVisible] = useState(false);
  const [tagsModalVisible, setTagsModalVisible] = useState(false);
  const [membersModalVisible, setMembersModalVisible] = useState(false);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState('date');
  const [pickerField, setPickerField] = useState('startTime');
  const [pickerValue, setPickerValue] = useState(new Date());

  const hideError = useCallback(() => setError({ visible: false, message: '' }), []);
  const showError = useCallback((message) => setError({ visible: true, message }), []);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [tagsResponse, circleResponse] = await Promise.all([
          ApiService.fetchAllTags(),
          ApiService.getCircleList(),
        ]);

        const tags = parseTagsResponse(tagsResponse);
        setAvailableTags(Array.isArray(tags) ? tags : []);

        const members = parseCircleMembers(circleResponse);
        setCircleMembers(Array.isArray(members) ? members : []);
      } catch (err) {
        console.error('⚠️ Load data error', err);
        showError('Unable to load tags or circle members.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [showError]);

  const openPicker = useCallback((field, mode) => {
    setPickerField(field);
    setPickerMode(mode);

    let currentValue;
    switch (field) {
      case 'startTime': currentValue = startTime; break;
      case 'endTime': currentValue = endTime; break;
      case 'firstReminder': currentValue = firstReminder; break;
      case 'secondReminder': currentValue = secondReminder; break;
      default: currentValue = new Date();
    }

    setPickerValue(new Date(currentValue));
    setPickerVisible(true);
  }, [startTime, endTime, firstReminder, secondReminder]);

  const closePicker = useCallback(() => {
    setPickerVisible(false);
  }, []);

  const handlePickerChange = useCallback((_, value) => {
    if (value) {
      setPickerValue(value);
    }
  }, []);

  const handlePickerConfirm = useCallback(() => {
    const setter = {
      startTime: setStartTime,
      endTime: setEndTime,
      firstReminder: setFirstReminder,
      secondReminder: setSecondReminder,
    }[pickerField];

    if (setter) {
      setter((prev) => {
        const base = new Date(prev || new Date());
        const next = new Date(pickerValue || new Date());
        if (pickerMode === 'date') {
          base.setFullYear(next.getFullYear(), next.getMonth(), next.getDate());
        } else {
          base.setHours(next.getHours(), next.getMinutes(), 0, 0);
        }
        return base;
      });
    }

    closePicker();
  }, [closePicker, pickerField, pickerMode, pickerValue]);

  const handleToggleTag = useCallback((tagId) => {
    setSelectedTags((prev) => {
      if (prev.includes(tagId)) {
        return prev.filter((id) => id !== tagId);
      }
      return [...prev, tagId];
    });
  }, []);

  const handleToggleMember = useCallback((memberId) => {
    setSelectedMembers((prev) => {
      if (prev.includes(memberId)) {
        return prev.filter((id) => id !== memberId);
      }
      return [...prev, memberId];
    });
  }, []);

  const canSave = useMemo(() => {
    return Boolean(title.trim()) && Boolean(startTime) && Boolean(endTime);
  }, [title, startTime, endTime]);

  const handleSave = useCallback(async () => {
    if (!canSave) return;

    try {
      hideError();
      setLoading(true);

      const payload = {
        id: eventData?.id,
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        firstReminder: firstReminder.toISOString(),
        secondReminder: secondReminder.toISOString(),
        eventType,
        tags: selectedTags,
        visibilityType,
        shareType: 2,
        shareWithId: selectedMembers,
      };

      const response = isEditMode
        ? await ApiService.updateEvent(payload)
        : await ApiService.addEvent(payload);

      const success = response?.success ?? false;
      if (success) {
        router.back();
      } else {
        showError(response?.message || 'Unable to save event.');
      }
    } catch (err) {
      console.error('Save event error', err);
      showError(err?.message || 'Unable to save event.');
    } finally {
      setLoading(false);
    }
  }, [
    canSave, hideError, isEditMode, eventData?.id, title, description, location,
    startTime, endTime, firstReminder, secondReminder, eventType,
    selectedTags, visibilityType, selectedMembers, showError, router
  ]);

  const formatDateTime = (date) => {
    if (!date) return 'Not set';
    try {
      return `${date.toLocaleDateString()} • ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return 'Invalid date';
    }
  };

  const eventTypeLabel = EVENT_TYPES.find((t) => t.id === eventType)?.label || 'Select';
  const visibilityLabel = VISIBILITY_TYPES.find((v) => v.id === visibilityType)?.label || 'Select';

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
          <Text style={styles.headerTitle}>{isEditMode ? 'Edit Event' : 'New Event'}</Text>
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
              Create an event by filling in the details below. Choose event type, visibility, tags, and share with circle members.
            </Text>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Event Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter event title"
                placeholderTextColor={COLORS.purple3}
                value={title}
                onChangeText={setTitle}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Add description"
                placeholderTextColor={COLORS.purple3}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Location</Text>
              <TextInput
                style={styles.input}
                placeholder="Add location"
                placeholderTextColor={COLORS.purple3}
                value={location}
                onChangeText={setLocation}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Event Type</Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setEventTypeModalVisible(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.selectorText}>{eventTypeLabel}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Start Time *</Text>
              <View style={styles.dateTimeGroup}>
                <TouchableOpacity style={styles.dateTimeButton} onPress={() => openPicker('startTime', 'date')} activeOpacity={0.85}>
                  <Text style={styles.dateTimeText}>{startTime.toLocaleDateString()}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dateTimeButton} onPress={() => openPicker('startTime', 'time')} activeOpacity={0.85}>
                  <Text style={styles.dateTimeText}>{startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>End Time *</Text>
              <View style={styles.dateTimeGroup}>
                <TouchableOpacity style={styles.dateTimeButton} onPress={() => openPicker('endTime', 'date')} activeOpacity={0.85}>
                  <Text style={styles.dateTimeText}>{endTime.toLocaleDateString()}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dateTimeButton} onPress={() => openPicker('endTime', 'time')} activeOpacity={0.85}>
                  <Text style={styles.dateTimeText}>{endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>First Reminder</Text>
              <View style={styles.dateTimeGroup}>
                <TouchableOpacity style={styles.dateTimeButton} onPress={() => openPicker('firstReminder', 'date')} activeOpacity={0.85}>
                  <Text style={styles.dateTimeText}>{firstReminder.toLocaleDateString()}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dateTimeButton} onPress={() => openPicker('firstReminder', 'time')} activeOpacity={0.85}>
                  <Text style={styles.dateTimeText}>{firstReminder.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Second Reminder</Text>
              <View style={styles.dateTimeGroup}>
                <TouchableOpacity style={styles.dateTimeButton} onPress={() => openPicker('secondReminder', 'date')} activeOpacity={0.85}>
                  <Text style={styles.dateTimeText}>{secondReminder.toLocaleDateString()}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dateTimeButton} onPress={() => openPicker('secondReminder', 'time')} activeOpacity={0.85}>
                  <Text style={styles.dateTimeText}>{secondReminder.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Visibility</Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setVisibilityModalVisible(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.selectorText}>{visibilityLabel}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Tags</Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setTagsModalVisible(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.selectorText}>
                  {selectedTags.length > 0 ? `${selectedTags.length} tag(s) selected` : 'Select tags'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Share With</Text>
              <TouchableOpacity
                style={styles.selector}
                onPress={() => setMembersModalVisible(true)}
                activeOpacity={0.85}
              >
                <Text style={styles.selectorText}>
                  {selectedMembers.length > 0 ? `${selectedMembers.length} member(s) selected` : 'Select members'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
              onPress={handleSave}
              activeOpacity={canSave ? 0.85 : 1}
              disabled={!canSave}
            >
              <Text style={styles.saveButtonText}>{isEditMode ? 'Update Event' : 'Create Event'}</Text>
            </TouchableOpacity>
          </SettingsCard>
        </ScrollView>

        {/* Event Type Modal */}
        <Modal visible={eventTypeModalVisible} transparent animationType="fade">
          <Pressable style={styles.modalOverlay} onPress={() => setEventTypeModalVisible(false)}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Select Event Type</Text>
              <ScrollView>
                {EVENT_TYPES.map((type) => (
                  <TouchableOpacity
                    key={`type-${type.id}`}
                    style={[styles.modalRow, eventType === type.id && styles.modalRowSelected]}
                    onPress={() => {
                      setEventType(type.id);
                      setEventTypeModalVisible(false);
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.modalRowText, eventType === type.id && styles.modalRowTextSelected]}>
                      {type.label}
                    </Text>
                    {eventType === type.id ? <Text style={styles.modalSelectedBadge}>Selected</Text> : null}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>

        {/* Visibility Modal */}
        <Modal visible={visibilityModalVisible} transparent animationType="fade">
          <Pressable style={styles.modalOverlay} onPress={() => setVisibilityModalVisible(false)}>
            <View style={styles.modalCard}>
              <Text style={styles.modalTitle}>Select Visibility</Text>
              <ScrollView>
                {VISIBILITY_TYPES.map((visibility) => (
                  <TouchableOpacity
                    key={`visibility-${visibility.id}`}
                    style={[styles.modalRow, visibilityType === visibility.id && styles.modalRowSelected]}
                    onPress={() => {
                      setVisibilityType(visibility.id);
                      setVisibilityModalVisible(false);
                    }}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.modalRowText, visibilityType === visibility.id && styles.modalRowTextSelected]}>
                      {visibility.label}
                    </Text>
                    {visibilityType === visibility.id ? <Text style={styles.modalSelectedBadge}>Selected</Text> : null}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>

        {/* Tags Modal */}
        <Modal visible={tagsModalVisible} transparent animationType="fade">
          <Pressable style={styles.modalOverlay} onPress={() => setTagsModalVisible(false)}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Tags</Text>
                <TouchableOpacity onPress={() => setTagsModalVisible(false)}>
                  <Text style={styles.modalCloseText}>Done</Text>
                </TouchableOpacity>
              </View>
              <ScrollView>
                {availableTags.map((tag) => {
                  const tagId = tag.id || tag.tagId;
                  const tagName = tag.name || tag.tagName || `Tag ${tagId}`;
                  const isSelected = selectedTags.includes(tagId);
                  return (
                    <TouchableOpacity
                      key={`tag-${tagId}`}
                      style={[styles.modalRow, isSelected && styles.modalRowSelected]}
                      onPress={() => handleToggleTag(tagId)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.modalRowText, isSelected && styles.modalRowTextSelected]}>
                        {tagName}
                      </Text>
                      {isSelected ? <Text style={styles.modalSelectedBadge}>✓</Text> : null}
                    </TouchableOpacity>
                  );
                })}
                {availableTags.length === 0 ? (
                  <Text style={styles.modalEmpty}>No tags available.</Text>
                ) : null}
              </ScrollView>
            </View>
          </Pressable>
        </Modal>

        {/* Members Modal */}
        <Modal visible={membersModalVisible} transparent animationType="fade">
          <Pressable style={styles.modalOverlay} onPress={() => setMembersModalVisible(false)}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Share With</Text>
                <TouchableOpacity onPress={() => setMembersModalVisible(false)}>
                  <Text style={styles.modalCloseText}>Done</Text>
                </TouchableOpacity>
              </View>
              <ScrollView>
                {circleMembers.map((member) => {
                  const memberId = member.userConnectionId || member.userProfileId;
                  const isSelected = selectedMembers.includes(memberId);
                  return (
                    <TouchableOpacity
                      key={`member-${memberId}`}
                      style={[styles.modalRow, isSelected && styles.modalRowSelected]}
                      onPress={() => handleToggleMember(memberId)}
                      activeOpacity={0.85}
                    >
                      <Text style={[styles.modalRowText, isSelected && styles.modalRowTextSelected]}>
                        {resolveMemberName(member)}
                      </Text>
                      {isSelected ? <Text style={styles.modalSelectedBadge}>✓</Text> : null}
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

        {/* DateTime Picker Modal */}
        <Modal visible={pickerVisible} transparent animationType="fade">
          <Pressable style={styles.sheetOverlay} onPress={closePicker}>
            <Pressable style={styles.sheetContainer} onPress={(event) => event.stopPropagation()}>
              <View style={styles.sheetHandle} />
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>
                  {pickerMode === 'date' ? 'Select Date' : 'Select Time'}
                </Text>
                <TouchableOpacity onPress={closePicker} activeOpacity={0.7}>
                  <Text style={styles.sheetCloseText}>Cancel</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                key={`${pickerField}-${pickerMode}`}
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
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
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
  dateTimeGroup: {
    flexDirection: 'row',
    gap: SIZES.spacingS,
  },
  dateTimeButton: {
    flex: 1,
    backgroundColor: COLORS.purple0,
    borderRadius: SIZES.cornerRadius12,
    paddingHorizontal: SIZES.spacingM,
    paddingVertical: SIZES.spacingM,
    alignItems: 'center',
  },
  dateTimeText: {
    fontSize: 14,
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
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.spacingM,
    paddingBottom: SIZES.spacingS,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.purple2,
    paddingHorizontal: SIZES.spacingM,
    paddingBottom: SIZES.spacingS,
  },
  modalCloseText: {
    fontSize: 14,
    color: COLORS.buttonColor,
    fontWeight: '600',
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

export default EventEditorScreen;
