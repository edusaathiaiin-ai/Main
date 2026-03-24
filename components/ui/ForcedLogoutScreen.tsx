import React from 'react';
import { View, Text, StyleSheet, Pressable, SafeAreaView } from 'react-native';
import { router } from 'expo-router';

/**
 * ForcedLogoutScreen
 *
 * Shown when the user is silently signed out because their account was
 * accessed from another device (single-device enforcement).
 */
export default function ForcedLogoutScreen() {
  function handleLoginPress() {
    router.replace('/(auth)/login');
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <Text style={styles.icon}>🔐</Text>

        {/* Title */}
        <Text style={styles.title}>Session ended</Text>

        {/* Body */}
        <Text style={styles.body}>
          Your account was accessed from another device and this session was
          ended automatically. This keeps your Saathi secure and your soul
          profile private.
        </Text>

        <Text style={styles.hint}>
          If this wasn&apos;t you — change your login email.{'\n'}
          If it was you — simply log back in.
        </Text>

        {/* CTA */}
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={handleLoginPress}
          accessibilityRole="button"
          accessibilityLabel="Log back in"
        >
          <Text style={styles.buttonText}>Log back in →</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1F3A',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  icon: {
    fontSize: 64,
    marginBottom: 28,
  },
  title: {
    fontFamily: 'Playfair Display',
    fontSize: 28,
    fontWeight: '700',
    color: '#FAF7F2',
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  body: {
    fontFamily: 'DM Sans',
    fontSize: 15,
    color: 'rgba(250, 247, 242, 0.65)',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  hint: {
    fontFamily: 'DM Sans',
    fontSize: 13,
    color: 'rgba(250, 247, 242, 0.40)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 40,
  },
  button: {
    backgroundColor: '#C9993A',
    paddingHorizontal: 36,
    paddingVertical: 16,
    borderRadius: 12,
  },
  buttonPressed: {
    opacity: 0.8,
  },
  buttonText: {
    fontFamily: 'DM Sans',
    fontSize: 16,
    fontWeight: '600',
    color: '#060F1D',
    letterSpacing: 0.2,
  },
});
