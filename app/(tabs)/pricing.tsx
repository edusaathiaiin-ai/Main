/**
 * app/(tabs)/pricing.tsx
 *
 * Pricing and upgrade screen — 4 tiers: Free, Plus, Pro, Unlimited.
 * Unlimited card has dark navy background, fire badge, zero-cooling highlight.
 */

import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Sentry from '@sentry/react-native';

import { PAID_PLANS, getPlan } from '@/constants/plans';
import type { Plan, RazorpayPlanId } from '@/constants/plans';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import {
  createOrder,
  openCheckout,
  isPaymentsActive,
  type PlanId as RzpPlanId,
} from '@/lib/razorpay';

const NAVY  = '#0B1F3A';
const GOLD  = '#C9993A';
const CREAM = '#FAF6F0';

// ── Plan card ─────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  isCurrent,
  onUpgrade,
  loading,
}: {
  plan: Plan;
  isCurrent: boolean;
  onUpgrade: (planId: RazorpayPlanId) => void;
  loading: boolean;
}) {
  const isUnlimited = plan.id === 'unlimited';
  const isPro = plan.id === 'pro';

  const cardBg = isCurrent ? '#FFFBEB' : isUnlimited ? NAVY : '#FFFFFF';
  const cardBorder = isCurrent ? GOLD : isUnlimited ? GOLD : '#0B1F3A12';
  const textColor = isUnlimited ? '#ffffff' : NAVY;
  const subColor = isUnlimited ? 'rgba(255,255,255,0.6)' : '#0B1F3A80';

  const featureLines = getPlanFeatureLines(plan);

  return (
    <View
      className="rounded-2xl p-5 mb-4"
      style={{ backgroundColor: cardBg, borderWidth: 1.5, borderColor: cardBorder }}
    >
      {/* Badges row */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
        {isCurrent && (
          <View className="self-start rounded-full px-3 py-1" style={{ backgroundColor: GOLD }}>
            <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 11, color: '#FAF7F2' }}>Current plan</Text>
          </View>
        )}
        {plan.id === 'plus' && !isCurrent && (
          <View className="self-start rounded-full px-3 py-1" style={{ backgroundColor: NAVY }}>
            <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 11, color: GOLD }}>Best value — save 37%</Text>
          </View>
        )}
        {isPro && (
          <View className="self-start rounded-full px-3 py-1" style={{ backgroundColor: '#0369A130' }}>
            <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 11, color: '#0369A1' }}>🚀 Priority responses</Text>
          </View>
        )}
        {isUnlimited && (
          <View className="self-start rounded-full px-3 py-1" style={{ backgroundColor: '#DC2626' }}>
            <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 11, color: '#fff' }}>🔥 Zero cooling</Text>
          </View>
        )}
      </View>

      {/* Plan name */}
      <Text style={{ fontFamily: 'PlayfairDisplay-Bold', fontSize: 20, color: textColor }}>
        {plan.name}
      </Text>

      {/* Price */}
      <View className="flex-row items-baseline mt-2 mb-1">
        <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 28, color: textColor }}>
          {plan.priceMonthly === 0 ? 'Free' : `₹${plan.priceMonthly.toLocaleString('en-IN')}`}
        </Text>
        {plan.priceMonthly > 0 && (
          <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 13, color: subColor, marginLeft: 4 }}>
            /month
          </Text>
        )}
      </View>
      {plan.priceAnnual && plan.priceAnnual > 0 && (
        <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 12, color: subColor, marginBottom: 2 }}>
          or ₹{plan.priceAnnual.toLocaleString('en-IN')}/year (save{' '}
          {Math.round(100 - (plan.priceAnnual / (plan.priceMonthly * 12)) * 100)}%)
        </Text>
      )}
      {plan.id === 'unlimited' && (
        <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 2 }}>
          Monthly only — no annual plan
        </Text>
      )}

      {/* Features */}
      <View style={{ marginTop: 10, marginBottom: 16 }}>
        {featureLines.map((line, i) => (
          <Text key={i} style={{ fontFamily: 'DMSans-Regular', fontSize: 13, color: subColor, lineHeight: 22 }}>
            {line}
          </Text>
        ))}
      </View>

      {/* No refunds notice for Unlimited */}
      {isUnlimited && (
        <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 12, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>
          No refunds — pause anytime instead
        </Text>
      )}

      {/* CTA */}
      {!isCurrent && plan.id !== 'free' && (
        <Pressable
          onPress={() => onUpgrade(plan.id as RazorpayPlanId)}
          disabled={loading}
          className="rounded-xl items-center py-3"
          style={{ backgroundColor: loading ? '#E5E7EB' : isUnlimited ? GOLD : NAVY }}
        >
          {loading ? (
            <ActivityIndicator color={isUnlimited ? NAVY : '#fff'} size="small" />
          ) : (
            <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 14, color: isUnlimited ? NAVY : '#fff' }}>
              {isPaymentsActive() ? `Upgrade to ${plan.name}` : 'Coming soon'}
            </Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

function getPlanFeatureLines(plan: Plan): string[] {
  switch (plan.id) {
    case 'free':
      return [
        '✦ 5 chats/day',
        '✦ Bot 1 + Bot 5 only',
        '✦ 1 Saathi, 1 check-in/month',
        '✦ 48h cooling after quota',
      ];
    case 'plus':
      return [
        '✦ 20 chats/day',
        '✦ All 5 bots unlocked',
        '✦ Up to 20 Saathis',
        '✦ Unlimited check-ins',
        '✦ Export notes',
        '✦ Pause anytime (2×/year)',
        '✦ Pro-rata refund policy',
      ];
    case 'pro':
      return [
        '✦ 50 chats/day',
        '✦ All 5 bots unlocked',
        '✦ 24h cooling (half of Plus)',
        '✦ Priority AI responses 🚀',
        '✦ Everything in Plus',
      ];
    case 'unlimited':
      return [
        '🔥 Zero cooling — ever',
        '✦ No daily cap',
        '✦ Fastest AI responses (priority queue)',
        '✦ All 5 bots at full speed',
        '✦ Everything in Pro',
      ];
    default:
      return [];
  }
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function PricingScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const {
    isPremium,
    isFoundingMember,
    planId: currentPlanId,
    daysUntilExpiry,
  } = useSubscription();

  const [loadingPlan, setLoadingPlan] = useState<RazorpayPlanId | null>(null);

  const handleUpgrade = async (planId: RazorpayPlanId) => {
    if (!isPaymentsActive()) {
      Alert.alert(
        'Payments coming soon',
        'We are completing Razorpay setup. Founding students get full access free for 60 days.',
        [{ text: 'Got it' }]
      );
      return;
    }
    if (!profile) return;

    setLoadingPlan(planId);
    try {
      const order = await createOrder(planId as RzpPlanId);
      const result = await openCheckout({
        ...order,
        userName: profile.full_name ?? 'Student',
        userEmail: profile.email ?? '',
        description: `EdUsaathiAI — ${order.planLabel}`,
      });

      switch (result.status) {
        case 'success':
          Alert.alert(
            `Welcome to ${getPlan(planId).name}! ✦`,
            'Your payment was successful.',
            [{ text: 'Start learning', onPress: () => router.push('/(tabs)/chat') }]
          );
          break;
        case 'dismissed':
          break;
        case 'payments_disabled':
          Alert.alert('Coming soon', 'Payments will be available soon.');
          break;
        case 'error':
          Alert.alert('Payment error', result.message);
          break;
      }
    } catch (err) {
      Sentry.captureException(err, { tags: { action: 'pricing_upgrade', planId } });
      const message = err instanceof Error ? err.message : 'Something went wrong';
      Alert.alert('Could not start payment', message);
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-cream"
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Pressable onPress={() => router.back()} className="mb-6">
        <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 14, color: NAVY + '80' }}>← Back</Text>
      </Pressable>

      <Text style={{ fontFamily: 'PlayfairDisplay-Bold', fontSize: 28, color: NAVY }}>
        Choose your Saathi
      </Text>
      <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 14, color: NAVY + '70', marginTop: 6, marginBottom: 28 }}>
        Every plan includes Soul Memory — your Saathi always remembers you.
      </Text>

      {/* Founding member banner */}
      {isFoundingMember && (
        <View className="rounded-2xl p-4 mb-6 flex-row items-center"
          style={{ backgroundColor: '#C9993A15', borderWidth: 1, borderColor: '#C9993A30' }}>
          <Text style={{ fontSize: 24, marginRight: 10 }}>⭐</Text>
          <View className="flex-1">
            <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 14, color: GOLD }}>
              Founding Student Access — Active
            </Text>
            <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 12, color: '#92400E', marginTop: 2 }}>
              {daysUntilExpiry !== null
                ? `Your free Premium expires in ${daysUntilExpiry} days`
                : 'All features unlocked at no charge for 60 days'}
            </Text>
          </View>
        </View>
      )}

      {/* Payments inactive warning */}
      {!isPaymentsActive() && (
        <View className="rounded-2xl p-4 mb-6"
          style={{ backgroundColor: '#FFF3E0', borderWidth: 1, borderColor: '#F9731620' }}>
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 13, color: '#F97316' }}>
            ☕ Payments launching soon
          </Text>
          <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 12, color: '#92400E', marginTop: 4 }}>
            Finalising Razorpay onboarding. All founding students have full access.
          </Text>
        </View>
      )}

      {/* Current plan chip */}
      {currentPlanId === 'free' && !isFoundingMember && (
        <View className="rounded-xl px-4 py-3 mb-6"
          style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#0B1F3A14' }}>
          <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 13, color: NAVY }}>
            Currently on: Saathi Free (Bot 1 + Bot 5, 5 chats/day)
          </Text>
        </View>
      )}

      {/* Plan cards — Free first, then paid */}
      {PAID_PLANS.map((plan) => (
        <PlanCard
          key={plan.id}
          plan={plan}
          isCurrent={currentPlanId === plan.id && isPremium}
          onUpgrade={handleUpgrade}
          loading={loadingPlan === plan.id}
        />
      ))}

      {/* Fine print */}
      <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 11, color: '#0B1F3A50',
        textAlign: 'center', marginTop: 8, lineHeight: 17 }}>
        Payments processed securely by Razorpay.{'\n'}
        Subscriptions auto-renew. Cancel or pause anytime.{'\n'}
        GST applicable as per Indian regulations.{'\n'}
        Unlimited plan: no refunds — you may pause instead.
      </Text>
    </ScrollView>
  );
}
