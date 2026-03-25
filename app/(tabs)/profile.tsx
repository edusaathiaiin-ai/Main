import { Text, View, TouchableOpacity } from 'react-native';
import { useAuth } from '@/hooks/useAuth';

export default function ProfilePlaceholder() {
  const { signOut, isLoading } = useAuth();

  return (
    <View className="flex-1 items-center justify-center bg-cream">
      <Text className="text-4xl mb-4">👤</Text>
      <Text
        className="text-xl text-navy"
        style={{ fontFamily: 'PlayfairDisplay-Bold' }}
      >
        My Profile
      </Text>
      <Text
        className="text-sm text-navy/50 mt-2 mb-8 text-center px-8"
        style={{ fontFamily: 'DMSans-Regular' }}
      >
        Soul profile, settings, and data.{'\n'}Coming in Step 7.
      </Text>

      <TouchableOpacity
        onPress={signOut}
        disabled={isLoading}
        className="bg-rose-100 px-8 py-3 rounded-xl border border-rose-200 active:bg-rose-200 transition-colors"
      >
        <Text
          className="text-rose-600 text-base"
          style={{ fontFamily: 'DMSans-Bold' }}
        >
          {isLoading ? 'Signing Out...' : 'Sign Out'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
