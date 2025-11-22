import { useState, useCallback, useEffect } from 'react';
import ApiService from '../services/api.service';

/**
 * Custom hook for managing post creation logic
 * Handles user groups, post submission, and validation
 */
export const useCreatePost = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState({ visible: false, message: '' });
  const [userGroups, setUserGroups] = useState([]);
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [caption, setCaption] = useState('');
  const [hashTags, setHashTags] = useState([]);
  const [location, setLocation] = useState({
    address: '',
    placeId: '',
  });

  useEffect(() => {
    fetchUserGroups();
  }, []);

  const fetchUserGroups = useCallback(async () => {
    try {
      setLoading(true);
      const response = await ApiService.getUserInfo();

      if (response.success && response.data?.userGroups) {
        const toArray = (value) => {
          if (!value) return [];
          if (Array.isArray(value)) return value;
          if (Array.isArray(value.$values)) return value.$values;
          return [];
        };

        const collectGroups = (payload) => {
          if (!payload || typeof payload !== 'object') return [];

          const preferredKeys = [
            'userGroupList',
            'groupList',
            'createdGroupList',
            'ownedGroupList',
            'managedGroupList',
            'memberGroupList',
            'moderatorGroupList',
            'favoriteGroupList',
            'favouriteGroupList',
          ];

          const aggregated = [];
          preferredKeys.forEach((key) => {
            const candidates = toArray(payload[key]);
            if (candidates.length) {
              aggregated.push(...candidates);
            }
          });

          if (!aggregated.length) {
            Object.values(payload).forEach((value) => {
              const candidates = toArray(value);
              if (candidates.length) {
                aggregated.push(...candidates);
              }
            });
          }

          const deduped = [];
          const seen = new Set();
          aggregated.forEach((group) => {
            if (!group || typeof group !== 'object') return;
            const id = Number(
              group.groupId ??
                group.userConnectionGroupId ??
                group.id ??
                group.groupID
            );
            const key = Number.isFinite(id) && id > 0
              ? `id-${id}`
              : `name-${(group.groupName || group.name || '').toLowerCase()}`;

            if (!seen.has(key)) {
              seen.add(key);
              deduped.push(group);
            }
          });

          return deduped;
        };

        const groups = collectGroups(response.data.userGroups);

        // Drop only synthetic "All Groups" entry to keep member-only groups available
        let filteredGroups = groups.filter((group) => {
          const groupName = (group.groupName || group.name || '').toLowerCase().trim();
          const groupId = Number(group.groupId ?? group.userConnectionGroupId ?? group.id ?? 0);
          return groupId !== 0 && groupName !== 'all groups';
        });
        if (filteredGroups.length === 0 && groups.length > 0) {
          filteredGroups = groups;
        }

        const normalizedList = filteredGroups.map((group) => {
          if (!group || typeof group !== 'object') {
            return group;
          }

          const resolvedId = Number(
            group.groupId ??
              group.userConnectionGroupId ??
              group.id ??
              group.groupID ??
              0
          );

          const normalizedName = group.groupName || group.name || '';

          if (
            Number.isFinite(resolvedId) &&
            resolvedId > 0 &&
            group.groupId !== resolvedId
          ) {
            return {
              ...group,
              groupId: resolvedId,
              groupName: normalizedName,
            };
          }

          if (!group.groupName && normalizedName) {
            return {
              ...group,
              groupName: normalizedName,
            };
          }

          return group;
        });

        setUserGroups(normalizedList);

        // Don't auto-select any groups - user must manually select
        setSelectedGroups([]);
      }
    } catch (err) {
      console.error('Error fetching groups:', err);
      showError('Failed to load groups');
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleGroupSelection = useCallback((group) => {
    setSelectedGroups((prev) => {
      if (!group) return prev;

      const resolveId = (candidate) => Number(
        candidate?.groupId ??
        candidate?.userConnectionGroupId ??
        candidate?.id ??
        candidate?.groupID ??
        0
      );

      const targetId = resolveId(group);

      if (!Number.isFinite(targetId) || targetId <= 0) {
        return prev;
      }

      const isSelected = prev.some((existing) => resolveId(existing) === targetId);

      if (isSelected) {
        return prev.filter((existing) => resolveId(existing) !== targetId);
      }

      return [...prev, group];
    });
  }, []);

  const validatePost = useCallback(() => {
    if (!caption.trim()) {
      showError('Please enter a caption');
      return false;
    }

    const hasValidGroup = selectedGroups.some((group) => {
      const resolvedId = Number(
        group?.groupId ??
          group?.userConnectionGroupId ??
          group?.id ??
          group?.groupID ??
          0
      );
      return Number.isFinite(resolvedId) && resolvedId > 0;
    });

    if (!hasValidGroup) {
      showError('Please select at least one group');
      return false;
    }

    return true;
  }, [caption, selectedGroups]);

  const createPost = useCallback(async (imageData) => {
    if (!validatePost()) return { success: false };

    try {
      setLoading(true);

      const hashTagsString = hashTags
        .map((tag) => tag.startsWith('#') ? tag.substring(1) : tag)
        .join(',');

      const groupIds = selectedGroups
        .map((group) => {
          const resolvedId = Number(
            group?.groupId ??
              group?.userConnectionGroupId ??
              group?.id ??
              group?.groupID ??
              0
          );
          return Number.isFinite(resolvedId) && resolvedId > 0
            ? resolvedId
            : null;
        })
        .filter((id) => id !== null);

      const groupIdsString = groupIds.join(',');

      const postData = {
        GroupIds: groupIdsString,
        PostTitle: caption,
        PostBody: caption,
        HashTags: hashTagsString,
        GMSPlaceId: location.placeId || '',
        MediaFile: imageData,
      };

      const response = await ApiService.createPost(postData);

      if (response.success) {
        return { success: true, data: response.data };
      } else {
        showError(response.message || 'Failed to create post');
        return { success: false };
      }
    } catch (err) {
      showError(err.message || 'Failed to create post');
      return { success: false };
    } finally {
      setLoading(false);
    }
  }, [caption, hashTags, selectedGroups, location, validatePost]);

  const showError = useCallback((message) => {
    setError({ visible: true, message });
  }, []);

  const hideError = useCallback(() => {
    setError({ visible: false, message: '' });
  }, []);

  const parseHashTags = useCallback((text) => {
    const tags = text
      .split(/[,\s]+/)
      .filter((tag) => tag.trim())
      .map((tag) => (tag.startsWith('#') ? tag : `#${tag}`));
    setHashTags(tags);
  }, []);

  return {
    loading,
    error,
    userGroups,
    selectedGroups,
    caption,
    hashTags,
    location,
    setCaption,
    setLocation,
    parseHashTags,
    toggleGroupSelection,
    createPost,
    hideError,
  };
};
