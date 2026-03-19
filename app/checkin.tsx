import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

export default function CheckinScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 bg-cream px-5 pt-16">
      <Text style={{ fontFamily: 'PlayfairDisplay-Bold', fontSize: 28, color: '#0B1F3A' }}>
        Saathi Check-in
      </Text>
      <Text
        style={{
          fontFamily: 'DMSans-Regular',
          fontSize: 14,
          color: '#0B1F3AAA',
          marginTop: 10,
          lineHeight: 22,
        }}
      >
        Your check-in flow will be available here.
      </Text>

      <Pressable
        onPress={() => router.back()}
        className="self-start mt-8 rounded-full px-4 py-2"
        style={{ backgroundColor: '#C9993A' }}
      >
        <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 13, color: '#0B1F3A' }}>
          Back to chat
        </Text>
      </Pressable>
    </View>
  );
}
