import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  ScrollView,
} from 'react-native';
import { COLORS, SIZES } from '../constants/theme';
import ApiService from '../services/api.service';

const NOTIFICATION_TYPES = {
  AddGroup: 1,
  AddPost: 2,
  AddComment: 3,
  AddMember: 4,
  Reminder: 5,
};

const NotificationActionModal = ({ visible, notification, onClose, onAction }) => {
  const [loading, setLoading] = useState(false);
  const [groupDetails, setGroupDetails] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (visible && notification) {
      fetchNotificationDetails();
    }
  }, [visible, notification]);

  const fetchNotificationDetails = async () => {
    if (!notification) return;

    const type = getNotificationType(notification.notificationType);

    try {
      setLoading(true);
      setError(null);

      if (type === NOTIFICATION_TYPES.AddGroup) {
        // Handle case where we have invitationKey but no entityId (from email deep link)
        if (!notification.entityId && notification.invitationKey) {
          // For email invitations, we use the invitationKey directly
          setGroupDetails({
            groupName: extractGroupNameFromMessage(notification.message),
            groupId: null,
            message: notification.message,
            creationDate: notification.creationDate,
            invitationKey: notification.invitationKey,
            acceptedDate: '',
            rejectedDate: '',
            shouldShowJoinButton: true,
            totalMembers: 0,
          });
          setLoading(false);
          return;
        }

        const response = await ApiService.fetchGroupDetails(notification.entityId);

        if (response?.data) {
          const group = response.data;

          // Determine if user should see Join or Leave button (same logic as home.js)
          const acceptedDate = group.acceptedDate || '';
          const rejectedDate = group.rejectedDate || '';

          let shouldShowJoinButton = false;
          if (!acceptedDate && !rejectedDate) {
            shouldShowJoinButton = true;
          } else if (acceptedDate && !rejectedDate) {
            shouldShowJoinButton = false;
          } else {
            shouldShowJoinButton = !acceptedDate;
          }

          setGroupDetails({
            groupName: group.groupName || extractGroupNameFromMessage(notification.message),
            groupId: notification.entityId,
            message: notification.message,
            creationDate: group.creationDate || notification.creationDate,
            invitationKey: group.invitationKey || '',
            acceptedDate: acceptedDate,
            rejectedDate: rejectedDate,
            shouldShowJoinButton: shouldShowJoinButton,
            totalMembers: group.totalMembers || 0,
          });
        } else {
          throw new Error('Failed to load group details');
        }
      }
    } catch (err) {
      console.error('❌ Error processing notification:', err);
      console.error('Error details:', err.response?.data || err.message);
      setError('Failed to load group details');
    } finally {
      setLoading(false);
    }
  };

  const extractGroupNameFromMessage = (message) => {
    // Extract group name from message like "You have been invited to join Family Group"
    const match = message?.match(/join\s+(.+?)(?:\s+group)?$/i);
    return match ? match[1].trim() : 'Group';
  };

  const getNotificationType = (typeString) => {
    return NOTIFICATION_TYPES[typeString] || 0;
  };

  const handleAction = async (action) => {
    if (!notification || !groupDetails) return;

    const type = getNotificationType(notification.notificationType);

    try {
      setLoading(true);
      setError(null);

      if (type === NOTIFICATION_TYPES.AddGroup) {
        const invitationKey = groupDetails.invitationKey;

        if (!invitationKey) {
          throw new Error('Unable to update this group right now. Please try again later.');
        }

        if (action === 'reject') {
          // Use Leave API for reject/decline
          const removeResponse = await ApiService.removeGroupMembership(invitationKey);
          const removePayload = removeResponse ?? {};
          const removeSuccess = removePayload.success ?? removePayload.Success ?? false;

          if (!removeSuccess) {
            const message =
              removePayload.message ||
              removePayload.Message ||
              removePayload.ResponseMessage ||
              'Unable to decline invitation. Please try again later.';
            throw new Error(message);
          }
        } else {
          // Use Join/Leave API based on current membership status
          const isJoinAction = groupDetails.shouldShowJoinButton;
          const updateResponse = await ApiService.updateGroupMembership(invitationKey, isJoinAction);

          const responsePayload = updateResponse ?? {};
          const responseSuccess = responsePayload.success ?? responsePayload.Success ?? false;

          if (!responseSuccess) {
            const message =
              responsePayload.message ||
              responsePayload.Message ||
              responsePayload.ResponseMessage ||
              'Unable to update this group right now. Please try again later.';
            throw new Error(message);
          }
        }

        onAction?.(action, notification);
        onClose();
      }
      // Add more notification type handlers here
    } catch (err) {
      console.error('❌ Error performing action:', err);
      setError(err.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const renderGroupInvitationContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.purple1} />
          <Text style={styles.loadingText}>Loading details...</Text>
        </View>
      );
    }

    if (error) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      );
    }

    if (!groupDetails) return null;

    return (
      <View style={styles.detailsContainer}>
        <View style={styles.iconContainer}>
          <Image
            source={require('../assets/images/iconGroup.png')}
            style={styles.groupIcon}
          />
        </View>

        <Text style={styles.invitationTitle}>Group Invitation</Text>
        <Text style={styles.invitationMessage}>{notification.message}</Text>

        <View style={styles.groupInfo}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Group Name:</Text>
            <Text style={styles.infoValue}>{groupDetails.groupName || 'N/A'}</Text>
          </View>

          {groupDetails.creationDate && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Created:</Text>
              <Text style={styles.infoValue}>
                {new Date(groupDetails.creationDate).toLocaleDateString()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => handleAction('accept')}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.actionButtonText}>
                {groupDetails.shouldShowJoinButton ? 'Join' : 'Leave'}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.rejectButton]}
            onPress={() => handleAction('reject')}
            disabled={loading}
          >
            <Text style={styles.actionButtonText}>Decline</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderPostContent = () => {
    return (
      <View style={styles.detailsContainer}>
        <Text style={styles.invitationTitle}>New Post</Text>
        <Text style={styles.invitationMessage}>{notification.message}</Text>
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton, { marginTop: SIZES.spacingL }]}
          onPress={() => {
            onAction?.('view', notification);
            onClose();
          }}
        >
          <Text style={styles.actionButtonText}>View Post</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderCommentContent = () => {
    return (
      <View style={styles.detailsContainer}>
        <Text style={styles.invitationTitle}>New Comment</Text>
        <Text style={styles.invitationMessage}>{notification.message}</Text>
        <TouchableOpacity
          style={[styles.actionButton, styles.acceptButton, { marginTop: SIZES.spacingL }]}
          onPress={() => {
            onAction?.('view', notification);
            onClose();
          }}
        >
          <Text style={styles.actionButtonText}>View Comment</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderContent = () => {
    if (!notification) return null;

    const type = getNotificationType(notification.notificationType);

    switch (type) {
      case NOTIFICATION_TYPES.AddGroup:
        return renderGroupInvitationContent();
      case NOTIFICATION_TYPES.AddPost:
        return renderPostContent();
      case NOTIFICATION_TYPES.AddComment:
        return renderCommentContent();
      default:
        return (
          <View style={styles.detailsContainer}>
            <Text style={styles.invitationMessage}>{notification.message}</Text>
          </View>
        );
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {renderContent()}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SIZES.spacingL,
  },
  modalContainer: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.cornerRadius20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    overflow: 'hidden',
  },
  closeButton: {
    position: 'absolute',
    top: SIZES.spacingM,
    right: SIZES.spacingM,
    zIndex: 10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.purple0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 20,
    color: COLORS.purple3,
    fontWeight: 'bold',
  },
  scrollContent: {
    padding: SIZES.spacingXL,
  },
  detailsContainer: {
    alignItems: 'center',
  },
  loadingContainer: {
    padding: SIZES.spacingXL,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: SIZES.spacingM,
    fontSize: 16,
    color: COLORS.purple3,
  },
  errorContainer: {
    padding: SIZES.spacingXL,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: COLORS.errorCode,
    textAlign: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 16,
    backgroundColor: COLORS.purple0,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: SIZES.spacingL,
  },
  groupIcon: {
    width: 48,
    height: 48,
    tintColor: COLORS.purple1,
  },
  invitationTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: COLORS.purple1,
    marginBottom: SIZES.spacingM,
    textAlign: 'center',
  },
  invitationMessage: {
    fontSize: 16,
    color: COLORS.purple3,
    textAlign: 'center',
    marginBottom: SIZES.spacingL,
  },
  groupInfo: {
    width: '100%',
    backgroundColor: COLORS.bgColor,
    borderRadius: SIZES.cornerRadius16,
    padding: SIZES.spacingL,
    marginBottom: SIZES.spacingL,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SIZES.spacingS,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.purple3,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.purple1,
    flex: 1,
    textAlign: 'right',
  },
  actionButtons: {
    flexDirection: 'row',
    width: '100%',
    gap: SIZES.spacingM,
  },
  actionButton: {
    flex: 1,
    height: 50,
    borderRadius: SIZES.cornerRadius12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: COLORS.purple1,
  },
  rejectButton: {
    backgroundColor: COLORS.errorCode,
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});

export default NotificationActionModal;
