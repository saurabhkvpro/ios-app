import { Tabs } from 'expo-router';
import { Animated, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { HomeProvider, useHome } from '../../context/HomeContext';
import React, { useEffect, useCallback, memo } from 'react';

// Animated tab icon component with bounce and wiggle
const AnimatedTabIcon = memo(({ focused, name, outlineName, size = 26, uniqueKey }) => {
  // Create new animation values each time focused changes
  const scale = new Animated.Value(0.95);
  const opacity = new Animated.Value(0.7);
  const wiggle = new Animated.Value(0);
  const bounce = new Animated.Value(0);

  const runAnimation = useCallback(() => {
    if (focused) {

      // Run the animation sequence with wiggle
      Animated.sequence([
        // First: Bounce up and scale with wiggle
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1.3,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(bounce, {
            toValue: -12,
            duration: 200,
            useNativeDriver: true,
          }),
          // Wiggle left and right multiple times
          Animated.sequence([
            Animated.timing(wiggle, {
              toValue: 1,
              duration: 70,
              useNativeDriver: true,
            }),
            Animated.timing(wiggle, {
              toValue: -1,
              duration: 70,
              useNativeDriver: true,
            }),
            Animated.timing(wiggle, {
              toValue: 1,
              duration: 70,
              useNativeDriver: true,
            }),
            Animated.timing(wiggle, {
              toValue: -1,
              duration: 70,
              useNativeDriver: true,
            }),
            Animated.timing(wiggle, {
              toValue: 0.5,
              duration: 50,
              useNativeDriver: true,
            }),
            Animated.timing(wiggle, {
              toValue: -0.5,
              duration: 50,
              useNativeDriver: true,
            }),
            Animated.timing(wiggle, {
              toValue: 0,
              duration: 50,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(opacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),
        // Second: Settle down
        Animated.parallel([
          Animated.timing(scale, {
            toValue: 1.1,
            duration: 120,
            useNativeDriver: true,
          }),
          Animated.timing(bounce, {
            toValue: 0,
            duration: 120,
            useNativeDriver: true,
          }),
        ]),
      ]).start();
    } else {
      // Unfocused state - smooth transition
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 0.95,
          friction: 3,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(wiggle, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [focused, name, uniqueKey]);

  useEffect(() => {
    runAnimation();
  }, [runAnimation]);

  const wiggleRotation = wiggle.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: ['-15deg', '0deg', '15deg'],
  });

  return (
    <Animated.View
      style={{
        transform: [
          { scale },
          { translateY: bounce },
          { rotate: wiggleRotation },
        ],
        opacity,
      }}
    >
      <Ionicons
        name={focused ? name : outlineName}
        size={size}
        color={focused ? COLORS.purple1 : COLORS.lightGrayColor}
      />
    </Animated.View>
  );
}, (prevProps, nextProps) => {
  // Custom comparison to force re-render when focused changes
  return prevProps.focused === nextProps.focused && prevProps.uniqueKey === nextProps.uniqueKey;
});

function TabsContent() {
  const { selectedGroupId, handleSelectGroup } = useHome();
  const [tabClickCount, setTabClickCount] = React.useState({
    home: 0,
    create: 0,
    notifications: 0,
    profile: 0,
  });

  // Dynamic label: "Feed" when on All Groups (-1), "Home" when on specific group
  const homeTabLabel = selectedGroupId === -1 ? 'Feed' : 'Home';

  const incrementTabClick = (tabName) => {
    setTabClickCount(prev => ({
      ...prev,
      [tabName]: prev[tabName] + 1,
    }));
  };

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.purple1,
        tabBarInactiveTintColor: COLORS.lightGrayColor,
        tabBarStyle: {
          position: 'absolute',
          bottom: 20,
          left: 16,
          right: 16,
          marginHorizontal: 16,
          elevation: 10,
          backgroundColor: COLORS.white,
          borderRadius: 24,
          height: 75,
          paddingBottom: 15,
          paddingTop: 15,
          paddingHorizontal: 20,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 8,
          },
          shadowOpacity: 0.25,
          shadowRadius: 12,
          borderTopWidth: 0,
          borderWidth: Platform.OS === 'ios' ? 0.5 : 0,
          borderColor: 'rgba(0, 104, 123, 0.1)',
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '700',
          marginTop: 6,
          letterSpacing: 0.3,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: homeTabLabel,
          tabBarIcon: ({ focused }) => {
            // Different icons for Feed vs Home
            const isFeedMode = selectedGroupId === -1;
            console.log('🏠 Home tab - selectedGroupId:', selectedGroupId, 'isFeedMode:', isFeedMode);
            const iconOutline = isFeedMode ? 'newspaper-outline' : 'home-outline';
            const iconFilled = isFeedMode ? 'newspaper' : 'home';

            return (
              <AnimatedTabIcon
                focused={focused}
                name={iconFilled}
                outlineName={iconOutline}
                uniqueKey={`${tabClickCount.home}-${selectedGroupId}`}
              />
            );
          },
        }}
         listeners={{
          tabPress: () => {
            incrementTabClick('home');
            if (selectedGroupId > 0 && handleSelectGroup) {
              handleSelectGroup(-1);
            }
          },
        }}
      />
      <Tabs.Screen
        name="create"
        options={{
          title: 'Create',
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              focused={focused}
              name="add-circle"
              outlineName="add-circle-outline"
              uniqueKey={tabClickCount.create}
            />
          ),
          lazy: false,
        }}
        listeners={{
          tabPress: () => {
            incrementTabClick('create');
          },
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Notifications',
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              focused={focused}
              name="notifications"
              outlineName="notifications-outline"
              uniqueKey={tabClickCount.notifications}
            />
          ),
        }}
        listeners={{
          tabPress: () => {
            incrementTabClick('notifications');
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => (
            <AnimatedTabIcon
              focused={focused}
              name="person"
              outlineName="person-outline"
              uniqueKey={tabClickCount.profile}
            />
          ),
        }}
        listeners={{
          tabPress: () => {
            incrementTabClick('profile');
          },
        }}
      />
    </Tabs>
  );
}

export default function TabsLayout() {
  return (
    <HomeProvider>
      <TabsContent />
    </HomeProvider>
  );
}
