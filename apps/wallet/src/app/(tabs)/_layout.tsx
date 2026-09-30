import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Activity, ArrowLeftRight, CreditCard, Home, UserRound } from 'lucide-react-native';
import { Pressable, StyleSheet, View } from 'react-native';
import { colors, fonts } from '@/theme/tokens';
import { TextLabel } from '@/components/ui';

const tabItems = [
  { name: 'home', label: 'Accueil', icon: Home },
  { name: 'card', label: 'Carte', icon: CreditCard },
  { name: 'convert', label: 'Échanger', icon: ArrowLeftRight },
  { name: 'activity', label: 'Activité', icon: Activity },
  { name: 'profile', label: 'Profil', icon: UserRound },
];

function WalletTabBar({ state, navigation }: { state: { index: number; routes: { key: string; name: string }[] }; navigation: { navigate: (name: string) => void } }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.tabContainer, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.tabRow}>
        {tabItems.map((item) => {
          const focused = state.routes[state.index]?.name === item.name;
          const Icon = item.icon;
          return (
            <Pressable key={item.name} onPress={() => navigation.navigate(item.name)} style={styles.tabItem}>
              <View style={[styles.tabIcon, item.name === 'convert' && styles.convertIcon, focused && item.name !== 'convert' && styles.tabIconActive]}>
                <Icon size={20} color={focused || item.name === 'convert' ? colors.text : colors.textDim} strokeWidth={focused ? 2.2 : 1.8} />
              </View>
              <TextLabel size={10} weight={focused ? fonts.bodySemi : fonts.body} color={focused ? colors.text : colors.textDim}>{item.label}</TextLabel>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{ headerShown: false, sceneStyle: { backgroundColor: colors.bg } }}
      tabBar={(props) => <WalletTabBar state={props.state} navigation={props.navigation} />}>
      {tabItems.map((item) => <Tabs.Screen key={item.name} name={item.name} />)}
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopWidth: 1, borderTopColor: 'rgba(41,66,106,.65)', paddingTop: 10, backgroundColor: 'rgba(7,22,50,.83)' },
  tabRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around' },
  tabItem: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 4 },
  tabIcon: { width: 32, height: 28, alignItems: 'center', justifyContent: 'center' },
  tabIconActive: { backgroundColor: colors.primarySoft, borderRadius: 14 },
  convertIcon: { width: 52, height: 52, marginTop: -25, borderRadius: 26, backgroundColor: colors.primary, borderWidth: 4, borderColor: colors.bg, boxShadow: '0px 0px 10px rgba(36,88,237,0.4)' },
});
