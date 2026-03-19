import { Text, View } from 'react-native';

type QuotaBannerProps = {
  remaining: number;
  limit: number;
};

// Only visible when chats are running low — not shown when plenty remain.
export function QuotaBanner({ remaining, limit }: QuotaBannerProps) {
  if (remaining > 5) return null;

  const color = remaining <= 2 ? '#F97316' : '#C9993A';

  return (
    <View
      className="rounded-xl px-4 py-2 mb-3 flex-row items-center"
      style={{ backgroundColor: color + '18' }}
    >
      <Text style={{ fontSize: 14 }}>💬</Text>
      <Text
        className="ml-2 text-xs"
        style={{ fontFamily: 'DMSans-Medium', color, flex: 1 }}
      >
        {remaining === 0
          ? `All ${limit} chats used — your Saathi will be ready for you in 48 hours.`
          : `${remaining} ${remaining === 1 ? 'chat' : 'chats'} remaining for today`}
      </Text>
    </View>
  );
}
