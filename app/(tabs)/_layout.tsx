import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(active: IoniconName, inactive: IoniconName) {
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <Ionicons name={focused ? active : inactive} size={24} color={color} />
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0B1F3A',
          borderTopWidth: 0,
          paddingBottom: 4,
          height: 60,
        },
        tabBarActiveTintColor: '#C9993A',
        tabBarInactiveTintColor: '#FAF7F260',
        tabBarLabelStyle: { fontFamily: 'DMSans-Regular', fontSize: 11, marginTop: 2 },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ title: 'Home', tabBarIcon: tabIcon('home', 'home-outline') }}
      />
      <Tabs.Screen
        name="chat"
        options={{ title: 'Chat', tabBarIcon: tabIcon('chatbubbles', 'chatbubbles-outline') }}
      />
      <Tabs.Screen
        name="board"
        options={{ title: 'Board', tabBarIcon: tabIcon('people', 'people-outline') }}
      />
      <Tabs.Screen
        name="news"
        options={{ title: 'News', tabBarIcon: tabIcon('newspaper', 'newspaper-outline') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: tabIcon('person', 'person-outline') }}
      />
      <Tabs.Screen
        name="checkin"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="pricing"
        options={{ href: null }}
      />
    </Tabs>
  );
}
