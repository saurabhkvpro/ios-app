import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  FlatList,
  Keyboard,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { COLORS, SIZES } from '../constants/theme';
import ApiService from '../services/api.service';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const WINDOW_HEIGHT = SIZES.screenHeight || Dimensions.get('window').height;
const SHEET_MAX_HEIGHT = Math.round((WINDOW_HEIGHT || 720) * 0.75);
const SHEET_MIN_HEIGHT = Math.round((WINDOW_HEIGHT || 720) * 0.45);

const normalizeComments = (payload) => {
  if (!payload) return [];

  const root = payload?.data ?? payload;

  const candidateList =
    root?.commentList ??
    root?.postCommentList ??
    root?.comments ??
    (Array.isArray(root) ? root : null) ??
    root?.commentDetails ??
    root?.data;

  let list = [];

  if (Array.isArray(candidateList)) {
    list = candidateList;
  } else if (candidateList?.$values && Array.isArray(candidateList.$values)) {
    list = candidateList.$values;
  } else if (root?.data && Array.isArray(root.data)) {
    list = root.data;
  }

  return list
    .filter(Boolean)
    .map((item, index) => {
      const commentText = item.commentText ?? item.comment ?? item.Comment ?? '';
      const commentDate =
        item.commentDate ??
        item.CommentDate ??
        item.createdDate ??
        item.creationDate ??
        item.dateCreated ??
        null;

      return {
        commentId:
          item.commentId ??
          item.groupPostCommentId ??
          item.id ??
          `${index}-${commentDate || Date.now()}`,
        commentText,
        commentDate,
        userName: item.userName ?? item.UserName ?? 'Unknown',
        userProfileId: item.userProfileId ?? item.UserProfileId ?? null,
        userProfilePic: item.userProfilePic ?? item.userProfileImage ?? item.profileImage ?? null,
      };
    })
    .filter((comment) => comment.commentText);
};

const PostCommentsModal = ({
  visible,
  postId,
  postTitle,
  onClose,
  onCommentAdded,
  onCommentsLoaded,
  currentUserProfileId,
  currentUserName,
}) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const insets = useSafeAreaInsets();
  const keyboardOffset = useRef(new Animated.Value(0)).current;
  const basePadding = useRef(new Animated.Value(insets.bottom + SIZES.spacingS)).current;
  const combinedPadding = useMemo(
    () => Animated.add(basePadding, keyboardOffset),
    [basePadding, keyboardOffset]
  );

  const canSubmit = useMemo(() => {
    return Boolean(
      visible &&
        currentUserProfileId &&
        inputValue.trim().length > 0 &&
        !submitting
    );
  }, [visible, currentUserProfileId, inputValue, submitting]);

  const resetState = useCallback(() => {
    setComments([]);
    setInputValue('');
    setErrorMessage('');
    setSubmitting(false);
    setLoading(false);
  }, []);

  const loadComments = useCallback(
    async (withSpinner = true) => {
      if (!postId) {
        return;
      }
      try {
        if (withSpinner) {
          setLoading(true);
        }
        setErrorMessage('');
        const response = await ApiService.fetchPostComments(postId);
        const normalized = normalizeComments(response);
        setComments(normalized);
        onCommentsLoaded?.(postId, normalized);
      } catch (error) {
        console.error('❌ Failed to load comments:', error);
        setErrorMessage(error?.message || 'Unable to load comments right now.');
      } finally {
        if (withSpinner) {
          setLoading(false);
        }
      }
    },
    [onCommentsLoaded, postId]
  );

  useEffect(() => {
    if (visible && postId) {
      loadComments();
    } else if (!visible) {
      resetState();
    }
  }, [visible, postId, loadComments, resetState]);

  useEffect(() => {
    basePadding.setValue(insets.bottom + SIZES.spacingS);
  }, [basePadding, insets.bottom]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const handleShow = (event) => {
      if (!event?.endCoordinates) {
        return;
      }
      const height = event.endCoordinates.height;
      Animated.timing(keyboardOffset, {
        toValue: height,
        duration: Platform.OS === 'ios' ? event.duration || 160 : 160,
        useNativeDriver: false,
      }).start();
    };

    const handleHide = (event) => {
      Animated.timing(keyboardOffset, {
        toValue: 0,
        duration: Platform.OS === 'ios' ? event?.duration || 140 : 140,
        useNativeDriver: false,
      }).start();
    };

    const showListener = Keyboard.addListener(showEvent, handleShow);
    const hideListener = Keyboard.addListener(hideEvent, handleHide);

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, [keyboardOffset]);

  const handleSubmitComment = useCallback(async () => {
    const trimmed = inputValue.trim();
    if (!canSubmit || !trimmed) {
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage('');

      const response = await ApiService.savePostComment(
        postId,
        currentUserProfileId,
        trimmed
      );

      const serverPayload =
        response?.data ??
        response?.comment ??
        response?.commentDetails ??
        response?.payload ??
        null;

      const newComment = {
        commentId: serverPayload?.commentId ?? `local-${Date.now()}`,
        commentText:
          serverPayload?.commentText ??
          serverPayload?.comment ??
          trimmed,
        commentDate:
          serverPayload?.commentDate ??
          serverPayload?.createdDate ??
          new Date().toISOString(),
        userName:
          serverPayload?.userName ??
          currentUserName ??
          'You',
        userProfileId:
          serverPayload?.userProfileId ??
          currentUserProfileId ??
          null,
        userProfilePic: serverPayload?.userProfilePic ?? null,
      };

      setComments((prev) => [...prev, newComment]);
      setInputValue('');
      onCommentAdded?.(postId, newComment);

      // Close modal after successful comment submission
      onClose?.();
    } catch (error) {
      console.error('❌ Failed to post comment:', error);
      setErrorMessage(error?.message || 'Unable to post comment. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, currentUserName, currentUserProfileId, inputValue, onCommentAdded, postId, onClose]);

  const renderCommentItem = useCallback(({ item }) => {
    return (
      <View style={styles.commentItem}>
        <Text style={styles.commentAuthor}>{item.userName || 'Unknown'}</Text>
        <Text style={styles.commentBody}>{item.commentText}</Text>
        {item.commentDate ? (
          <Text style={styles.commentDate}>{item.commentDate}</Text>
        ) : null}
      </View>
    );
  }, []);

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={styles.sheetWrapper}>
          <Animated.View
            style={[
              styles.sheet,
              {
                minHeight: SHEET_MIN_HEIGHT,
                maxHeight: SHEET_MAX_HEIGHT,
                paddingBottom: combinedPadding,
              },
            ]}
          >
            <View style={styles.handle} />

            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{postTitle || 'Comments'}</Text>
              <TouchableOpacity onPress={onClose} style={styles.sheetCloseButton}>
                <Text style={styles.sheetCloseText}>Close</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.listContainer}>
              {loading && comments.length === 0 ? (
                <View style={styles.loaderContainer}>
                  <ActivityIndicator size="large" color={COLORS.purple1} />
                </View>
              ) : (
                <FlatList
                  data={comments}
                  keyExtractor={(item) => String(item.commentId)}
                  renderItem={renderCommentItem}
                  style={styles.list}
                  contentContainerStyle={
                    comments.length === 0 ? styles.emptyContent : styles.listContent
                  }
                  ListEmptyComponent={
                    <View style={styles.emptyState}>
                      <Text style={styles.emptyTitle}>No comments yet</Text>
                      <Text style={styles.emptyMessage}>
                        Be the first to share your thoughts.
                      </Text>
                    </View>
                  }
                  refreshing={loading}
                  onRefresh={() => loadComments(true)}
                  keyboardDismissMode="interactive"
                  keyboardShouldPersistTaps="handled"
                />
              )}
            </View>

            {!!errorMessage && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            )}

            <Animated.View style={[styles.inputOuter, { marginBottom: insets.bottom }]}>
              <TextInput
                style={styles.input}
                placeholder={
                  currentUserProfileId ? 'Add a comment...' : 'Login required to comment'
                }
                placeholderTextColor={COLORS.purple3}
                value={inputValue}
                onChangeText={setInputValue}
                editable={Boolean(currentUserProfileId)}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[styles.sendButton, !canSubmit && styles.sendButtonDisabled]}
                onPress={handleSubmitComment}
                disabled={!canSubmit}
                activeOpacity={0.85}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={COLORS.white} />
                ) : (
                  <Text style={styles.sendButtonText}>Send</Text>
                )}
              </TouchableOpacity>
            </Animated.View>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
};

export default PostCommentsModal;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheetWrapper: {
    width: '100%',
    paddingHorizontal: SIZES.spacingS,
    paddingBottom: SIZES.spacingS,
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: SIZES.cornerRadius20,
    borderTopRightRadius: SIZES.cornerRadius20,
    paddingTop: SIZES.spacingS,
    paddingBottom: SIZES.spacingS,
    paddingHorizontal: SIZES.spacingM,
    maxHeight: SHEET_MAX_HEIGHT,
    alignSelf: 'center',
    width: '100%',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 16,
  },
  handle: {
    alignSelf: 'center',
    width: 48,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.purple0,
    marginBottom: SIZES.spacingS,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SIZES.spacingS,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.titleColor,
    flex: 1,
    paddingRight: SIZES.spacingM,
  },
  sheetCloseButton: {
    paddingHorizontal: SIZES.spacingS,
    paddingVertical: SIZES.spacingXXS,
  },
  sheetCloseText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.purple1,
  },
  listContainer: {
    flex: 1,
    marginBottom: SIZES.spacingS,
    borderRadius: SIZES.cornerRadius16,
    overflow: 'hidden',
    backgroundColor: COLORS.bgColor,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: SIZES.spacingXL,
    paddingHorizontal: SIZES.spacingM,
  },
  loaderContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: SIZES.spacingL,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: SIZES.spacingL,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.titleColor,
    marginBottom: SIZES.spacingS,
  },
  emptyMessage: {
    fontSize: 13,
    color: COLORS.purple3,
    textAlign: 'center',
  },
  commentItem: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.cornerRadius16,
    padding: SIZES.spacingM,
    marginBottom: SIZES.spacingS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.purple0,
  },
  commentAuthor: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.titleColor,
    marginBottom: SIZES.spacingXXS,
  },
  commentBody: {
    fontSize: 14,
    color: COLORS.textColor,
  },
  commentDate: {
    marginTop: SIZES.spacingXXS,
    fontSize: 12,
    color: COLORS.purple3,
  },
  errorContainer: {
    paddingHorizontal: SIZES.spacingM,
    paddingBottom: SIZES.spacingS,
  },
  errorText: {
    color: COLORS.errorCode,
    fontSize: 13,
  },
  inputOuter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: SIZES.cornerRadius20,
    paddingHorizontal: SIZES.spacingS,
    paddingVertical: SIZES.spacingXXS,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.purple0,
    marginHorizontal: SIZES.spacingXS,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: COLORS.white,
    borderRadius: SIZES.cornerRadius16,
    paddingHorizontal: SIZES.spacingM,
    paddingVertical: SIZES.spacingXS,
    fontSize: 14,
    color: COLORS.titleColor,
    marginRight: SIZES.spacingS,
  },
  sendButton: {
    backgroundColor: COLORS.purple1,
    borderRadius: SIZES.cornerRadius12,
    paddingVertical: SIZES.spacingS,
    paddingHorizontal: SIZES.spacingL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: COLORS.purple3,
  },
  sendButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.white,
  },
});
