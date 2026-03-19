import { Text, View } from 'react-native';

export default function BoardPlaceholder() {
  return (
    <View className="flex-1 items-center justify-center bg-cream">
      <Text className="text-4xl mb-4">💬</Text>
      <Text
        className="text-xl text-navy"
        style={{ fontFamily: 'PlayfairDisplay-Bold' }}
      >
        Community Board
      </Text>
      <Text
        className="text-sm text-navy/50 mt-2 text-center px-8"
        style={{ fontFamily: 'DMSans-Regular' }}
      >
        Ask questions, share answers.{'\n'}Coming in Step 8.
      </Text>
    </View>
  );
}
