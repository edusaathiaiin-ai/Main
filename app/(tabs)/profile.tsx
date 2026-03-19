import { Text, View } from 'react-native';

export default function ProfilePlaceholder() {
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
        className="text-sm text-navy/50 mt-2 text-center px-8"
        style={{ fontFamily: 'DMSans-Regular' }}
      >
        Soul profile, settings, and data.{'\n'}Coming in Step 7.
      </Text>
    </View>
  );
}
