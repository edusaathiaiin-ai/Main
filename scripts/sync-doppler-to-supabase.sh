#!/bin/bash
# Sync Doppler secrets → Supabase Edge Function secrets
# Run: bash scripts/sync-doppler-to-supabase.sh
#
# This reads the dev config from Doppler and pushes matching
# secrets to Supabase. Only syncs secrets that Edge Functions need.

set -e

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
)

echo "Syncing Doppler → Supabase secrets..."
echo "Project: $PROJECT_REF"
echo ""

ARGS=""
for KEY in "${SUPABASE_SECRETS[@]}"; do
  VALUE=$(doppler secrets get "$KEY" --plain 2>/dev/null || echo "")
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
