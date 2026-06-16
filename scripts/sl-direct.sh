#!/usr/bin/env bash
# Thin direct-API helper for the 3 Smartlead ops the MCP fork covers.
# Restart-independent fallback (works without reloading the MCP child).
# Reads SMARTLEAD_API_KEY from the sibling .env; NEVER prints the key.
# Auth = ?api_key= query param. Base = https://server.smartlead.ai/api/v1
#
# Usage:
#   sl-direct.sh seq        <campaign_id>                 # GET campaign sequence (read)
#   sl-direct.sh history    <campaign_id> <lead_id>       # GET lead message history (read)
#   sl-direct.sh get-account <email_account_id>          # GET full email account (read; snapshot)
#   sl-direct.sh sig-get    <email_account_id>           # print ONLY current signature (read; snapshot)
#   sl-direct.sh sig-set    <email_account_id> <file>    # POST partial {signature:<file contents>}  (WRITE - approval-gated)
set -euo pipefail
HERE="$(cd "$(dirname "$0")/.." && pwd)"
KEY="$(grep -E '^SMARTLEAD_API_KEY=' "$HERE/.env" | head -1 | cut -d= -f2- | tr -d '"'"'\r")"
[ -n "$KEY" ] || { echo "ERROR: SMARTLEAD_API_KEY not found in $HERE/.env" >&2; exit 1; }
BASE="https://server.smartlead.ai/api/v1"

cmd="${1:-}"; shift || true
case "$cmd" in
  seq)        curl -s "${BASE}/campaigns/${1}/sequences?api_key=${KEY}" | jq . ;;
  history)    curl -s "${BASE}/campaigns/${1}/leads/${2}/message-history?api_key=${KEY}" | jq . ;;
  get-account)curl -s "${BASE}/email-accounts/${1}?api_key=${KEY}" | jq . ;;
  sig-get)    curl -s "${BASE}/email-accounts/${1}?api_key=${KEY}" | jq -r '.signature // ""' ;;
  sig-set)    # partial update: only the signature field. Body read from a file (avoids HTML shell-escaping).
              jq -Rs '{signature: .}' < "$2" \
                | curl -s -X POST "${BASE}/email-accounts/${1}?api_key=${KEY}" \
                       -H 'Content-Type: application/json' --data-binary @- | jq . ;;
  *) echo "Unknown command: '$cmd'. See header for usage." >&2; exit 2 ;;
esac
