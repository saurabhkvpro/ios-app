import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  StatusBar,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  AppState
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLORS, SIZES } from '../../constants/theme';
import LoadingIndicator from '../../components/LoadingIndicator';
import ErrorToast from '../../components/ErrorToast';
import ProfileHeader from '../../components/profile/ProfileHeader';
import ProfileTabs from '../../components/profile/ProfileTabs';
import { CircleItem, ConnectionItem, GroupCard, PostCard } from '../../components/profile/cards';
import ApiService from '../../services/api.service';
import NotificationService from '../../services/notification.service';
import { API_CONFIG } from '../../config/api';

const TAB_KEYS = ['POSTS', 'CONNECTS', 'GROUPS', 'CIRCLE'];
const CARD_GAP = SIZES.spacingS;
const CARD_HORIZONTAL_PADDING = SIZES.spacingM * 2;
const SCREEN_WIDTH = SIZES.screenWidth || 0;
const CARD_WIDTH = ((SCREEN_WIDTH || 0) - CARD_HORIZONTAL_PADDING - CARD_GAP) / 2;

const CACHE_KEYS = {
  account: 'profile_cache_account_v1',
  posts: 'profile_cache_posts_v1',
  connections: 'profile_cache_connections_v1',
  groups: 'profile_cache_groups_v1',
  circle: 'profile_cache_circle_v1',
};

const parseMaybeJson = (value) => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }
  return value;
};

const extractList = (payload, key) => {
  const parsed = parseMaybeJson(payload);
  if (!parsed || typeof parsed !== 'object') return [];

  const direct = parsed?.[key] ?? parsed?.[capitalizeFirst(key)];
  const normalized = parseMaybeJson(direct);

  if (Array.isArray(normalized)) return normalized;
  if (normalized && Array.isArray(normalized.$values)) return normalized.$values;
  return [];
};

const capitalizeFirst = (text) => {
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
};

const Profile = () => {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState(TAB_KEYS[0]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState({ visible: false, message: '' });
  const [cacheReady, setCacheReady] = useState(false);
  const [initialFetchAttempted, setInitialFetchAttempted] = useState(false);

  const [account, setAccount] = useState(null);
  const [posts, setPosts] = useState([]);
  const [connections, setConnections] = useState([]);
  const [groups, setGroups] = useState([]);
  const [circleMembers, setCircleMembers] = useState([]);
    const fetchCalledRef = useRef(false);


  const buildImageUri = useCallback((value) => {
    if (!value) return value;
    if (/^https?:/i.test(value)) return value;
    const base = API_CONFIG.BASE_URL.replace(/\/$/, '');
    const suffix = value.startsWith('/') ? value : `/${value}`;
    return `${base}${suffix}`;
  }, []);

  const hideError = useCallback(() => {
    setError({ visible: false, message: '' });
  }, []);

  const showError = useCallback((message) => {
    setError({ visible: true, message });
  }, []);

  const fetchProfileData = useCallback(
    async ({ showSpinner } = { showSpinner: true }) => {
      setError({ visible: false, message: '' });
      if (showSpinner) {
        setLoading(true);
      }

      try {
        const [accountRes, postsRes, connectionsRes, groupsRes, circleRes] = await Promise.all([
          ApiService.getAccountInfo(),
          ApiService.getUserProfilePosts(),
          ApiService.getNonAccountList(),
          ApiService.getUserGroups(),
          ApiService.getCircleList(),
        ]);

        // Helper function to safely parse API responses (handles null after retries)
        const parseApiData = (response, dataKey) => {
          // If response is null (all retries failed), return null
          if (response === null) {
            return null;
          }

          if (!response || typeof response !== 'object') {
            return null;
          }

          // Handle nested .data.data structure
          let data = response?.data?.data ?? response?.data;

          // If data is empty string, return null
          if (data === '' || data === null || data === undefined) {
            return null;
          }

          return data;
        };

        // Account: API returns {success, message, data: accountObject}
        const accountData = parseApiData(accountRes, 'account');
        if (accountData && typeof accountData === 'object') {
          setAccount(accountData);
        }

        // Posts: API returns {success, message, data: {totalPosts, postList}}
        const postsContainer = parseApiData(postsRes, 'posts');
        const postsList = Array.isArray(postsContainer?.postList)
          ? postsContainer.postList
          : extractList(postsContainer, 'postList');
        setPosts(postsList);

        // Prepare cache payloads (always cache posts/account)
        const cacheUpdates = [
          [CACHE_KEYS.account, JSON.stringify(accountData ?? null)],
          [CACHE_KEYS.posts, JSON.stringify(postsList)],
        ];

        // Connections: API returns {success, message, data: {totalRecords, nonAccountList}}
        const connectionsContainer = parseApiData(connectionsRes, 'connections');
        if (connectionsRes === null) {
          // Keep existing state when retries fail silently
        } else {
          const connectionsList = extractList(connectionsContainer, 'nonAccountList')
            .slice()
            .sort((a, b) => (b?.memberProfileId ?? 0) - (a?.memberProfileId ?? 0));
          setConnections(connectionsList);
          cacheUpdates.push([CACHE_KEYS.connections, JSON.stringify(connectionsList)]);
        }

        // Groups: API returns {success, message, data: {totalGroups, userGroupList}}
        const groupsContainer = parseApiData(groupsRes, 'groups');
        if (groupsRes === null) {
          // Keep existing state when retries fail silently
        } else {
          const groupsList = extractList(groupsContainer, 'userGroupList')
            .map(group => ({
              ...group,
              // Normalize isFollowed to isFavorite for consistency with GroupDetailsHeader
              isFavorite: Boolean(group.isFollowed || group.isFavorite || group.isFavourite),
              isFavourite: Boolean(group.isFollowed || group.isFavorite || group.isFavourite),
            }))
            .slice()
            .sort((a, b) => (b?.userConnectionGroupId ?? 0) - (a?.userConnectionGroupId ?? 0));
          setGroups(groupsList);
          cacheUpdates.push([CACHE_KEYS.groups, JSON.stringify(groupsList)]);
        }

        // Circle: API returns {success, message, data: {totalMembers, memberList}}
        const circleContainer = parseApiData(circleRes, 'circle');
        if (circleRes === null) {
          // Keep existing state when retries fail silently
        } else {
          const circleList = extractList(circleContainer, 'memberList')
            .slice()
            .sort((a, b) => (b?.userProfileId ?? 0) - (a?.userProfileId ?? 0));
          setCircleMembers(circleList);
          cacheUpdates.push([CACHE_KEYS.circle, JSON.stringify(circleList)]);
        }

        await AsyncStorage.multiSet(cacheUpdates);
      } catch (err) {
        // Silently log errors, don't show to user
        console.error('⚠️ Profile fetch error (handled gracefully):', err?.message);
      } finally {
        if (showSpinner) {
          setLoading(false);
        }
        setInitialFetchAttempted(true);
      }
    },
    []
  );

  const loadCachedData = useCallback(async () => {
    try {
      const results = await AsyncStorage.multiGet(Object.values(CACHE_KEYS));
      const map = Object.fromEntries(results);

      if (map[CACHE_KEYS.account]) {
        setAccount(JSON.parse(map[CACHE_KEYS.account]));
      }
      if (map[CACHE_KEYS.posts]) {
        const cachedPosts = JSON.parse(map[CACHE_KEYS.posts]);
        setPosts(Array.isArray(cachedPosts) ? cachedPosts : []);
      }
      if (map[CACHE_KEYS.connections]) {
        const cachedConnections = JSON.parse(map[CACHE_KEYS.connections]);
        setConnections(Array.isArray(cachedConnections) ? cachedConnections : []);
      }
      if (map[CACHE_KEYS.groups]) {
        const cachedGroups = JSON.parse(map[CACHE_KEYS.groups]);
        setGroups(Array.isArray(cachedGroups) ? cachedGroups : []);
      }
      if (map[CACHE_KEYS.circle]) {
        const cachedCircle = JSON.parse(map[CACHE_KEYS.circle]);
        setCircleMembers(Array.isArray(cachedCircle) ? cachedCircle : []);
      }
    } catch (err) {
      console.error('Failed to load profile cache', err);
    } finally {
      setCacheReady(true);
    }
  }, []);

  useEffect(() => {
    loadCachedData();
  }, [loadCachedData]);

  useEffect(() => {
    if (!cacheReady || initialFetchAttempted) return;

    // Always fetch on initial mount to ensure fresh data
    fetchProfileData();
  }, [cacheReady, initialFetchAttempted, fetchProfileData]);

  useFocusEffect(
    useCallback(() => {
      if (!fetchCalledRef.current) {
        fetchCalledRef.current = true;
        return;
      }

      if (cacheReady && initialFetchAttempted) {
        fetchProfileData({ showSpinner: false });
      }
    }, [cacheReady, initialFetchAttempted, fetchProfileData])
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchProfileData({ showSpinner: false });
    setRefreshing(false);
  }, [fetchProfileData]);


  const handleAddConnection = useCallback(() => {
    if (!account?.userProfileId) return;
router.push({
      pathname: '/add-connection',
      params: {
        userProfileId: account.userProfileId.toString()
      }
    });  }, [account?.userProfileId, router]);

  const handleOpenSettings = useCallback(() => {
    router.push('/settings');
  }, [router]);

  const handleOpenProfile = useCallback(
    ({ profileId, context }) => {
      if (!profileId) return;
      const params = { profileId: profileId.toString() };
      if (context) params.context = context;
      if (account?.userProfileId) params.viewerProfileId = account.userProfileId.toString();
      router.push({ pathname: '/user/[profileId]', params });
    },
    [account?.userProfileId, router]
  );

  const handleOpenGroup = useCallback(
    (group) => {
      const candidateId = Number(group?.groupId ?? group?.userConnectionGroupId);
      if (Number.isFinite(candidateId) && candidateId > 0) {
        router.push({
          pathname: '/(tabs)/home',
          params: { groupId: candidateId.toString() },
        });
        return;
      }

      router.push('/(tabs)/home');
    },
    [router]
  );

  const fullName = useMemo(() => {
    if (!account) return '';
    const firstName = account.firstName || '';
    const lastName = account.lastName || '';
    return `${firstName} ${lastName}`.trim();
  }, [account]);

  const aboutText = account?.aboutMe || 'Tell your story here.';
  const stats = useMemo(
    () => [
      { label: 'Groups', value: groups.length },
      { label: 'Posts', value: posts.length },
      { label: 'Connections', value: connections.length },
    ],
    [groups.length, connections.length, posts.length]
  );

  const renderPosts = () => (
    <View style={styles.gridContainer}>
      {posts.length === 0 ? (
        <EmptyState message="You haven't created any posts yet." />
      ) : (
        posts.map((item) => (
          <PostCard
            key={`post-${item.postId}`}
            item={item}
            width={styles.cardWidth.width}
            buildImageUri={buildImageUri}
          />
        ))
      )}
    </View>
  );

  const renderConnections = () => (
    <View style={styles.listStack}>
      <TouchableOpacity style={styles.listActionButton} onPress={handleAddConnection} activeOpacity={0.85}>
        <Text style={styles.listActionButtonText}>Add Connection</Text>
      </TouchableOpacity>

      <View style={styles.listCard}>
        {connections.length === 0 ? (
          <View style={styles.listEmptyPadding}>
            <EmptyState message="You don't have any non managed account yet!" />
          </View>
        ) : (
          connections.map((item, index) => (
            <ConnectionItem
              key={`connection-${item.memberProfileId}`}
              item={item}
              buildImageUri={buildImageUri}
              onPress={() => handleOpenProfile({ profileId: item.memberProfileId, context: 'connection' })}
              isLast={index === connections.length - 1}
            />
          ))
        )}
      </View>
    </View>
  );

  const renderGroups = () => (
    <View style={styles.gridContainer}>
      {groups.length === 0 ? (
        <EmptyState message="You are not part of any groups yet." />
      ) : (
        groups.map((item) => (
          <GroupCard
            key={`group-${item.userConnectionGroupId ?? item.groupId}`}
            item={item}
            width={styles.cardWidth.width}
            buildImageUri={buildImageUri}
            onPress={() => handleOpenGroup(item)}
          />
        ))
      )}
    </View>
  );

  const renderCircle = () => (
    <View style={styles.listStack}>
      <View style={styles.listCard}>
        {circleMembers.length === 0 ? (
          <View style={styles.listEmptyPadding}>
            <EmptyState message="You don't have any circle yet!" />
          </View>
        ) : (
          circleMembers.map((member, index) => (
            <CircleItem
              key={`circle-${member.userProfileId}`}
              item={member}
              buildImageUri={buildImageUri}
              onPress={() => handleOpenProfile({ profileId: member.userProfileId, context: 'circle' })}
              isLast={index === circleMembers.length - 1}
            />
          ))
        )}
      </View>
    </View>
  );

  const tabContentByKey = {
    POSTS: renderPosts,
    CONNECTS: renderConnections,
    GROUPS: renderGroups,
    CIRCLE: renderCircle,
  };

  const activeContent = tabContentByKey[activeTab] || (() => null);

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />
        <ErrorToast visible={error.visible} message={error.message} onClose={hideError} />
        <LoadingIndicator visible={loading && !refreshing} />

        <ProfileHeader
          account={account}
          fullName={fullName}
          aboutText={aboutText}
          stats={stats}
          buildImageUri={buildImageUri}
          onPressSettings={handleOpenSettings}
        />
        <View style={styles.tabsWrapper}>
          <ProfileTabs
            tabs={TAB_KEYS}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        </View>

        <ScrollView
          contentContainerStyle={styles.contentContainer}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={COLORS.purple1} />}
        >
          <View style={styles.contentWrapper}>{activeContent()}</View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

const EmptyState = ({ message }) => (
  <View style={styles.emptyState}>
    <Text style={styles.emptyStateText}>{message}</Text>
  </View>
);

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.bgColor,
  },
  container: {
    flex: 1,
    backgroundColor: COLORS.bgColor,
  },
  tabsWrapper: {
    paddingHorizontal: SIZES.spacingM,
    marginBottom: SIZES.spacingS,
  },
  contentContainer: {
    paddingBottom: 120, // Extra padding for floating tab bar
  },
  contentWrapper: {
    paddingVertical: SIZES.spacingM,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.spacingM,
  },
  listStack: {
    paddingVertical: SIZES.spacingS,
    paddingHorizontal: SIZES.spacingM,
  },
  listActionButton: {
    backgroundColor: COLORS.buttonColor,
    borderRadius: SIZES.cornerRadius12,
    paddingVertical: SIZES.spacingM,
    alignItems: 'center',
    marginBottom: SIZES.spacingS,
  },
  listActionButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
  },
  listCard: {
    backgroundColor: COLORS.white,
    borderRadius: SIZES.cornerRadius16,
    overflow: 'hidden',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    marginBottom: SIZES.spacingL,
  },
  listEmptyPadding: {
    paddingVertical: SIZES.spacingXL,
  },
  cardWidth: {
    width: CARD_WIDTH > 0 ? CARD_WIDTH : 160,
  },
  emptyState: {
    paddingVertical: SIZES.spacingXL,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    color: COLORS.purple2,
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: SIZES.spacingL,
  },
});

export default Profile;
