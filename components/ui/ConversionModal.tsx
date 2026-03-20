/**
 * components/ui/ConversionModal.tsx
 *
 * Conversion popup — slides up from bottom on trigger.
 * Navy background, 72% screen height, spring animation.
 * Backdrop tap does NOT dismiss (intentional — use dismiss button).
 * Uses pre-selected NudgeMessage for personalised Hinglish copy.
 */

import { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';

import type { NudgeMessage } from '@/constants/nudges';
import type { TriggerType } from '@/constants/copy';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.72;

const NAVY = '#0B1F3A';
const GOLD = '#C9993A';
const WHITE = '#FFFFFF';
const WHITE_70 = 'rgba(255,255,255,0.70)';
const WHITE_15 = 'rgba(255,255,255,0.15)';

type Props = {
  visible: boolean;
  triggerType: TriggerType;
  /** Pre-selected nudge from selectNudge() */
  nudge: NudgeMessage;
  /** For day_45: show two plan cards */
  showAnnualPlan?: boolean;
  /** Active Saathi primary colour — used for CTA button */
  accentColor?: string;
  onDismiss: () => void;
  onCta: () => void;
};

export function ConversionModal({
  visible,
  nudge,
  showAnnualPlan = false,
  accentColor = GOLD,
  onDismiss,
  onCta,
}: Props) {
  const translateY = useRef(new Animated.Value(MODAL_HEIGHT)).current;

  useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : MODAL_HEIGHT,
      useNativeDriver: true,
      tension: 60,
      friction: 10,
    }).start();
  }, [visible, translateY]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      {/* Backdrop — intentionally non-dismissable on tap */}
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' }}>
        <Animated.View
          style={{
            height: MODAL_HEIGHT,
            backgroundColor: NAVY,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            transform: [{ translateY }],
            overflow: 'hidden',
          }}
        >
          {/* Drag indicator */}
          <View
            style={{
              alignSelf: 'center',
              marginTop: 12,
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: WHITE_15,
            }}
          />

          <ScrollView
            contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 20, paddingBottom: 32 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Tone badge */}
            <View
              style={{
                alignSelf: 'flex-start',
                backgroundColor: WHITE_15,
                borderRadius: 99,
                paddingHorizontal: 10,
                paddingVertical: 4,
                marginBottom: 16,
              }}
            >
              <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 10, color: WHITE_70, letterSpacing: 0.5 }}>
                {nudge.category.replace(/_/g, ' ').toUpperCase()}
              </Text>
            </View>

            {/* Hindi — primary, large, bold */}
            <Text
              style={{
                fontFamily: 'PlayfairDisplay-Bold',
                fontSize: 22,
                color: WHITE,
                lineHeight: 32,
                marginBottom: 10,
              }}
            >
              {nudge.hindi}
            </Text>

            {/* English — subtitle, italic, muted */}
            <Text
              style={{
                fontFamily: 'DMSans-Regular',
                fontSize: 13,
                color: WHITE_70,
                lineHeight: 20,
                fontStyle: 'italic',
                marginBottom: 24,
              }}
            >
              {nudge.english}
            </Text>

            {/* Price card — monthly */}
            <View
              style={{
                backgroundColor: WHITE_15,
                borderRadius: 12,
                paddingHorizontal: 16,
                paddingVertical: 12,
                marginBottom: showAnnualPlan ? 8 : 20,
              }}
            >
              <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 14, color: WHITE }}>
                Monthly — \u20B9199/month
              </Text>
            </View>

            {/* Annual plan — day_45 only */}
            {showAnnualPlan ? (
              <View
                style={{
                  backgroundColor: WHITE_15,
                  borderRadius: 12,
                  paddingHorizontal: 16,
                  paddingVertical: 12,
                  marginBottom: 20,
                  borderWidth: 1,
                  borderColor: GOLD,
                }}
              >
                <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 11, color: GOLD, marginBottom: 2 }}>
                  BEST VALUE
                </Text>
                <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 14, color: WHITE }}>
                  Annual — \u20B9125/month (billed \u20B91,499/year)
                </Text>
              </View>
            ) : null}

            {/* CTA — uses nudge's cta text */}
            <Pressable
              onPress={onCta}
              style={({ pressed }) => ({
                backgroundColor: accentColor,
                borderRadius: 14,
                paddingVertical: 16,
                alignItems: 'center',
                marginBottom: 12,
                opacity: pressed ? 0.85 : 1,
              })}
            >
              <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 16, color: NAVY }}>
                {nudge.cta}
              </Text>
            </Pressable>

            {/* Dismiss */}
            <Pressable onPress={onDismiss} style={{ alignItems: 'center', paddingVertical: 10 }}>
              <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 14, color: WHITE_70 }}>
                Maybe later
              </Text>
            </Pressable>
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}
