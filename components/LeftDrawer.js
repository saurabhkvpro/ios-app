import React, { useState , useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Platform,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SIZES } from '../constants/theme';
import CreateGroupFlow from './CreateGroupFlow';

export default function LeftDrawer({
  visible,
  onClose,
  groups = [],
  selectedGroupId,
  onSelectGroup,
  account,
  onCreateGroup,
  onRefresh, // New prop to refresh data
}) {
  const [activeTab, setActiveTab] = useState(0); // 0: All Groups, 1: Favorite, 2: My Groups
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const insets = useSafeAreaInsets();

  // Track previous visible state to only fetch when drawer opens (not closes)
  const [prevVisible, setPrevVisible] = useState(false);

  // Animation values
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    if (visible) {
      setIsRendered(true);
      // Reset values before animating in
      slideAnim.setValue(-300);
      fadeAnim.setValue(0);

      // Open animation
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    } else if (isRendered) {
      // Close animation
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -300,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Unmount after animation completes
        setIsRendered(false);
      });
    }
  }, [visible, slideAnim, fadeAnim]);

  useEffect(() => {
    if (visible && !prevVisible && onRefresh) {
      onRefresh();
    }
    setPrevVisible(visible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

   const isMember = (group) => {
    const acceptedValue = typeof group?.acceptedDate === 'string'
      ? group.acceptedDate.trim()
      : group?.acceptedDate;

    if (!acceptedValue) {
      return false;
    }

    if (typeof acceptedValue === 'string') {
      if (acceptedValue === '') {
        return false;
      }

      const normalized = acceptedValue.replace(/\s+/g, '').toLowerCase();
      if (normalized.includes('0001-01-01') || normalized.includes('1900-01-01')) {
        return false;
      }
    }

    return true;
  };

  useEffect(() => {
    if (!Array.isArray(groups)) {
      return;
    }

    const memberGroups = groups.filter((group) => isMember(group));
    const nonMemberGroups = groups.filter((group) => !isMember(group));

  }, [groups]);

  if (!visible) return null;

  const getFilteredGroups = () => {
    if (activeTab === 0) {
      return groups; // All groups
    } else if (activeTab === 1) {
      return groups.filter(g => g.isFavorite); // Favorite groups
    } else {
      return groups.filter(g => g.createdById === account?.userProfileId); // My groups
    }
  };

  const filteredGroups = getFilteredGroups();

  if (!isRendered && !visible) return null;

  return (
    <View style={styles.overlay}>
      <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
        <TouchableOpacity
          style={{ flex: 1 }}
          activeOpacity={1}
          onPress={onClose}
        />
      </Animated.View>
      <Animated.View
        style={[
          styles.drawer,
          {
            transform: [{ translateX: slideAnim }],
          }
        ]}
      >
        {/* Sticky Header - Three tabs */}
        <View style={[styles.stickyHeader, { paddingTop: insets.top + SIZES.spacingS }]}>
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 0 && styles.tabActive]}
              onPress={() => setActiveTab(0)}
            >
              <Text style={[styles.tabText, activeTab === 0 && styles.tabTextActive]}>
                All Groups
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 1 && styles.tabActive]}
              onPress={() => setActiveTab(1)}
            >
              <Text style={[styles.tabText, activeTab === 1 && styles.tabTextActive]}>
                Favorite Groups
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 2 && styles.tabActive]}
              onPress={() => setActiveTab(2)}
            >
              <Text style={[styles.tabText, activeTab === 2 && styles.tabTextActive]}>
                My Groups
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Scrollable Content */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 160 }}
        >
          {/* All Groups option */}
          <TouchableOpacity
            style={styles.groupItem}
            onPress={() => {
              onSelectGroup(-1);
              onClose();
            }}
          >
            <View style={[
              styles.selectionIndicator,
              selectedGroupId === -1 && styles.selectionIndicatorActive
            ]} />
            <Image
              source={require('../assets/images/empty.png')}
              style={styles.groupImage}
            />
            <View style={styles.groupInfo}>
              <Text style={styles.groupName}>All Groups</Text>
              <Text style={styles.groupActivity}>View all posts</Text>
            </View>
          </TouchableOpacity>

          {/* Group List */}
          {filteredGroups.map((group) => (
            <TouchableOpacity
              key={group.groupId}
              style={styles.groupItem}
              onPress={() => {
                onSelectGroup(group.groupId);
                onClose();
              }}
            >
              <View style={[
                styles.selectionIndicator,
                selectedGroupId === group.groupId && styles.selectionIndicatorActive
              ]} />
              {group.groupImage ? (
                <Image
                  source={{ uri: group.groupImage }}
                  style={styles.groupImage}
                />
              ) : (
                <Image
                  source={require('../assets/images/empty.png')}
                  style={styles.groupImage}
                />
              )}
              <View style={styles.groupInfo}>
                <Text style={styles.groupName}>{group.groupName}</Text>
                 {isMember(group) ? (
                  <Text style={styles.groupActivity}>{group.lastActivity || 'No activity'}</Text>
                ) : (
                  <Text style={[styles.groupActivity, styles.confirmationPending]}>
                    confirmation pending
                  </Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Sticky Footer - Create Group */}
        <View style={[styles.stickyFooter, { paddingBottom: 110 }]}>
          <View style={styles.bottomSection}>
            <Text style={styles.myGroupsHeading}>My Groups</Text>
            <Text style={styles.myGroupsDescription}>
              Become an admin or moderator of a group to see it listed here.
            </Text>
            <TouchableOpacity
              style={styles.createGroupButton}
              onPress={() => setShowCreateGroup(true)}
            >
              <Text style={styles.createGroupButtonText}>Create Group</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      <CreateGroupFlow
        visible={showCreateGroup}
        onClose={() => setShowCreateGroup(false)}
        onGroupCreated={(group) => {
          setShowCreateGroup(false);
          if (onRefresh) {
            onRefresh();
          }
          if (onCreateGroup) {
            onCreateGroup(group);
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: '85%',
    backgroundColor: COLORS.white,
    shadowColor: '#000',
    shadowOffset: {
      width: 4,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 16,
  },
  stickyHeader: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 10,
  },
  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SIZES.spacingS,
    paddingVertical: SIZES.spacingXS,
    justifyContent: 'space-between',
  },
  tab: {
    flex: 1,
    paddingVertical: SIZES.spacingS,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: {
    borderBottomColor: COLORS.purple1,
  },
  tabText: {
    fontSize: 12,
    color: COLORS.black,
  },
  tabTextActive: {
    color: COLORS.purple1,
    fontWeight: 'bold',
  },
  groupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SIZES.spacingM,
    paddingVertical: SIZES.spacingS,
  },
  selectionIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: 'transparent',
    marginRight: SIZES.spacingM,
  },
  selectionIndicatorActive: {
    backgroundColor: COLORS.purple1,
  },
  groupImage: {
    width: 44,
    height: 44,
    borderRadius: 4,
    marginRight: SIZES.spacingS,
  },
  groupImagePlaceholder: {
    backgroundColor: COLORS.lightGrayColor,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.purple1,
  },
  groupActivity: {
    fontSize: 13,
    color: COLORS.black,
    opacity: 0.7,
    marginTop: 2,
  },
  confirmationPending: {
    fontSize: 12,
    color: 'red',
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.lightGrayColor,
    marginVertical: SIZES.spacingM,
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 4,
    zIndex: 10,
  },
  bottomSection: {
    paddingHorizontal: SIZES.spacingM,
    paddingTop: SIZES.spacingS,
    paddingBottom: SIZES.spacingXS,
  },
  myGroupsHeading: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.purple3,
    marginBottom: SIZES.spacingM,
  },
  myGroupsDescription: {
    fontSize: 14,
    color: COLORS.black,
    marginBottom: SIZES.spacingM,
  },
  createGroupButton: {
    width: 120,
    height: 40,
    backgroundColor: COLORS.purple3,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createGroupButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.white,
  },
});
