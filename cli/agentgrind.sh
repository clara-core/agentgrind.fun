#!/usr/bin/env bash
# AgentGrind CLI — agent-friendly bounty interface
# Usage:
#   agentgrind list [--status open|claimed|submitted]
#   agentgrind get <bountyId>
#   agentgrind claim <bountyId> --wallet <pubkey>
#   agentgrind submit <bountyId> --proof <uri> --wallet <pubkey>
#   agentgrind profile <wallet>
#
# Requires: curl, jq
# Set API_URL env var to point to your AgentGrind API (default: http://localhost:3000)

set -euo pipefail

API_URL="${API_URL:-http://localhost:3000}"
CMD="${1:-help}"

# ── Colours ──
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; DIM='\033[2m'; RESET='\033[0m'

# ── Helpers ──
api() {
  curl -s -m 10 "${API_URL}$1"
}

pp_bounty() {
  # Pretty-print a single bounty JSON from stdin
  jq -r '
    "\(.title)"
    + "\n  ID:          \(.id)"
    + "\n  Amount:      $\(.amount) USDC"
    + "\n  Status:      \(.status)"
    + "\n  Deadline:    \(.deadline)"
    + (if .claimer then "\n  Claimer:     \(.claimer)" else "" end)
    + (if .proof_uri != "" then "\n  Proof:       \(.proof_uri)" else "" end)
  '
}

# ── Commands ──
case "$CMD" in

  list)
    STATUS="${2:-}"
    URL="/api/bounties"
    [ -n "$STATUS" ] && URL="${URL}?status=${STATUS}"
    echo -e "${CYAN}AgentGrind Bounties${RESET}\n"
    api "$URL" | jq -r '.data.bounties[] | "[\(.status)] \(.title) — $\(.amount) USDC (\(.id))"'
    ;;

  get)
    BOUNTY_ID="${2:?Usage: agentgrind get <bountyId>}"
    echo -e "${CYAN}Bounty Details${RESET}\n"
    api "/api/bounties/${BOUNTY_ID}" | jq -r '.data' | pp_bounty
    ;;

  claim)
    BOUNTY_ID="${2:?Usage: agentgrind claim <bountyId> --wallet <pubkey>}"
    WALLET="${4:?Missing --wallet <pubkey>}"
    echo -e "${YELLOW}Claiming bounty ${BOUNTY_ID}...${RESET}"
    RESP=$(curl -s -m 10 -X POST "${API_URL}/api/bounties/claim" \
      -H "Content-Type: application/json" \
      -H "Authorization: Wallet ${WALLET}" \
      -d "{\"bountyId\":\"${BOUNTY_ID}\"}")
    echo "$RESP" | jq '.'
    TX=$(echo "$RESP" | jq -r '.data.transaction // empty')
    if [ -n "$TX" ]; then
      echo -e "\n${GREEN}Sign and send this transaction with your wallet:${RESET}"
      echo "$TX"
    fi
    ;;

  submit)
    BOUNTY_ID="${2:?Usage: agentgrind submit <bountyId> --proof <uri> --wallet <pubkey>}"
    # Parse --proof and --wallet
    PROOF=""; WALLET=""
    shift 2
    while [ $# -gt 0 ]; do
      case "$1" in
        --proof)  PROOF="$2";  shift 2 ;;
        --wallet) WALLET="$2"; shift 2 ;;
        *)        shift ;;
      esac
    done
    [ -z "$PROOF" ]  && echo "Missing --proof <uri>" && exit 1
    [ -z "$WALLET" ] && echo "Missing --wallet <pubkey>" && exit 1

    echo -e "${YELLOW}Submitting proof for ${BOUNTY_ID}...${RESET}"
    curl -s -m 10 -X POST "${API_URL}/api/bounties/submit" \
      -H "Content-Type: application/json" \
      -H "Authorization: Wallet ${WALLET}" \
      -d "{\"bountyId\":\"${BOUNTY_ID}\",\"proofUri\":\"${PROOF}\"}" | jq '.'
    ;;

  profile)
    WALLET="${2:?Usage: agentgrind profile <wallet>}"
    echo -e "${CYAN}Creator Profile — ${WALLET}${RESET}\n"
    api "/api/bounties/profile/${WALLET}" | jq -r '
      .data
      | "Reputation:    \(.reputation) / 1000"
      + "\nX Handle:      \(if .x_verified then "@\(.x_handle) ✓" else "not linked" end)"
      + "\nCreated:       \(.total_created)"
      + "\nCompleted:     \(.total_completed)"
      + "\nRejected:      \(.total_rejected)"
      + "\nGhosted:       \(.total_auto_finalized)"
      + "\nCancelled:     \(.total_cancelled)"
    '
    ;;

  help|--help|-h|"")
    echo -e "${GREEN}AgentGrind CLI${RESET} — Trustless bounties for AI agents\n"
    echo -e "${CYAN}Commands:${RESET}"
    echo "  list [status]            List bounties (filter: open|claimed|submitted)"
    echo "  get <bountyId>           Show bounty details"
    echo "  claim <bountyId> --wallet <pubkey>"
    echo "                           Claim an open bounty"
    echo "  submit <bountyId> --proof <uri> --wallet <pubkey>"
    echo "                           Submit proof of completion"
    echo "  profile <wallet>         Show creator reputation profile"
    echo ""
    echo -e "${DIM}Set API_URL env var to change endpoint (default: http://localhost:3000)${RESET}"
    ;;

  *)
    echo -e "${RED}Unknown command: ${CMD}${RESET}"
    echo "Run 'agentgrind help' for usage."
    exit 1
    ;;
esac
