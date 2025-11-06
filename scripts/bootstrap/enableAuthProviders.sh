#!/usr/bin/env bash
set -euo pipefail

# Enables the Firebase Authentication providers required for the Spartan relaunch.
# Requires: firebase-tools >= 12, authenticated via `firebase login`.
# Usage: FIREBASE_PROJECT=spartan-8a55f ./scripts/bootstrap/enableAuthProviders.sh

PROJECT_ID="${FIREBASE_PROJECT:-spartan-8a55f}"

echo "Enabling email/password provider…"
firebase auth:providers:update email \
  --project "$PROJECT_ID" \
  --enable \
  --email-link-sign-in disabled \
  --password-enabled true

echo "Allowing sign-in for unverified email accounts…"
firebase auth:settings:update --project "$PROJECT_ID" --allow-create-user true --allow-password-user-link true --allow-email-verified-only false

echo "Enabling Google provider…"
firebase auth:providers:update google.com --project "$PROJECT_ID" --enable

echo "Enabling Apple provider…"
firebase auth:providers:update apple.com --project "$PROJECT_ID" --enable

echo "Auth providers configured for project ${PROJECT_ID}."
