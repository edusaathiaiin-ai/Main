#!/bin/bash
# Sync Doppler secrets → Supabase Edge Function secrets
# Run: bash scripts/sync-doppler-to-supabase.sh
#
# Reads the prd Doppler config explicitly (was implicit-default before;
# silently no-op'd on machines whose local Doppler context didn't have a
# default project/config, e.g. a CLI token with workplace scope only).
# Pushes the matching secrets to the production Supabase project so its
# Edge Functions can read them at runtime.

set -e

DOPPLER_PROJECT="edusaathiai"
DOPPLER_CONFIG="prd"
PROJECT_REF="vpmpuxosyrijknbxautx"

# Secrets that Edge Functions need (from Supabase secrets)
SUPABASE_SECRETS=(
  ANTHROPIC_API_KEY
  GROQ_API_KEY
  GEMINI_API_KEY
  GROK_API_KEY
  RESEND_API_KEY
  UPSTASH_REDIS_REST_URL
  UPSTASH_REDIS_REST_TOKEN
  RAZORPAY_TEST_KEY_ID
  RAZORPAY_TEST_KEY_SECRET
  WHATSAPP_ACCESS_TOKEN
  WHATSAPP_PHONE_NUMBER_ID
  WHATSAPP_APP_SECRET
  WHATSAPP_VERIFY_TOKEN
  NASA_API_KEY
  WOLFRAM_ALPHA_APP_ID
  CHEMSPIDER_API_KEY
  INDIANKANOON_API_KEY
  ELSEVIER_API_KEY
  SCOPUS_API_KEY
  DATAGOVIN_API_KEY
  BHUVAN_USERNAME
  BHUVAN_PASSWORD
  # Phase I-2 Step 3 — HMAC secret for faculty-invite tokens.
  # auth-register (Step 3b) verifies tokens signed by the Next.js
  # /api/education-institutions/invite-faculty route. Both ends must
  # share the same secret.
  INVITE_TOKEN_SECRET
)

echo "Syncing Doppler ($DOPPLER_PROJECT/$DOPPLER_CONFIG) → Supabase secrets..."
echo "Project: $PROJECT_REF"
echo ""

ARGS=""
for KEY in "${SUPABASE_SECRETS[@]}"; do
  VALUE=$(doppler secrets get "$KEY" --plain --project "$DOPPLER_PROJECT" --config "$DOPPLER_CONFIG" 2>/dev/null || echo "")
  if [ -n "$VALUE" ]; then
    ARGS="$ARGS $KEY=$VALUE"
    echo "  ✓ $KEY"
  else
    echo "  - $KEY (not in Doppler, skipping)"
  fi
done

if [ -n "$ARGS" ]; then
  npx supabase secrets set $ARGS --project-ref "$PROJECT_REF"
  echo ""
  echo "Done. Secrets synced to Supabase."
else
  echo "No secrets to sync."
fi
