# SPECTER — Know Your Agent (KYA) Skill

## Description

SPECTER is a behavioral reputation scoring protocol for autonomous AI agents. It computes a 7-dimensional trust score for any Ethereum/Base address based on on-chain transaction history, cross-session memory integrity, and peer endorsements — all anchored to an ERC-8004 identity passport on Base mainnet.

Use SPECTER to verify agent trustworthiness before delegating tasks, executing payments, or forming agent-to-agent agreements.

---

## When to Use This Skill

- Before executing a financial transaction with an unknown agent
- Before delegating a sensitive task to another agent
- When a user asks "is this agent trustworthy?" or "what is the score of [address]?"
- When you need to verify an agent's ERC-8004 identity passport
- When building trust-gated workflows between agents

---

## Scoring API

### Score an agent

**Endpoint:** `GET https://api.askspecter.xyz/v1/score/{address}`

**Parameters:**
- `address` — Ethereum address (0x-prefixed, 40 hex characters)

**Example request:**
```
GET https://api.askspecter.xyz/v1/score/0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045
```

**Response:**
```json
{
  "address": "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045",
  "score": 82,
  "verdict": "TRUSTED_AGENT",
  "chain": "base",
  "block": 21847392,
  "passport": "0x4a2b...c91f",
  "dimensions": {
    "TX_VOLUME": 78,
    "COUNTERPARTY_DIV": 91,
    "ACCOUNT_AGE": 65,
    "REPAYMENT_HIST": 88,
    "EXPLOIT_EXPOSURE": 95,
    "PROMPT_INTEGRITY": 72,
    "PEER_ENDORSEMENT": 83
  },
  "cached_at": "2026-06-18T02:15:11Z"
}
```

### Verify ERC-8004 identity

**Endpoint:** `GET https://api.askspecter.xyz/v1/verify/{address}`

**Response:**
```json
{
  "address": "0xd8dA...",
  "verified": true,
  "passport": "0x4a2b...c91f",
  "registered": "2026-01-15T08:22:00Z"
}
```

---

## Score Bands

| Score | Verdict | Meaning |
|-------|---------|---------|
| 85–100 | TRUSTED_AGENT | Safe to transact with |
| 65–84 | REVIEW_ADVISED | Proceed with caution |
| 0–64 | HIGH_RISK | Do not delegate or transact |

**Recommended gate:** Require score ≥ 75 for high-value operations.

---

## 7 Scoring Dimensions

| Key | Name | Description |
|-----|------|-------------|
| `TX_VOLUME` | Transaction Throughput | Volume and consistency of on-chain transactions |
| `COUNTERPARTY_DIV` | Interaction Surface | Diversity of counterparties and contract types |
| `ACCOUNT_AGE` | Temporal Credibility | Time since first on-chain activity |
| `REPAYMENT_HIST` | Debt Fulfillment | Repayment history on lending protocols |
| `EXPLOIT_EXPOSURE` | Flagged Contract Risk | Interactions with flagged/malicious contracts |
| `PROMPT_INTEGRITY` | Injection Resistance | Frequency of prompt injection attempts detected |
| `PEER_ENDORSEMENT` | Agent-to-Agent Trust | Endorsements from other trusted agents |

---

## Usage Examples

### Check if agent is trusted before transacting

```
User: "Is the agent at 0xAbC123... safe to work with?"

You: Call GET https://api.askspecter.xyz/v1/score/0xAbC123...
     If score >= 75, proceed. Otherwise warn the user.
```

### Gate a payment on trust score

```
Before sending payment to agent 0x...:
1. Call SPECTER score endpoint
2. If verdict is "HIGH_RISK", refuse and explain
3. If verdict is "REVIEW_ADVISED", ask user to confirm
4. If verdict is "TRUSTED_AGENT", proceed
```

### Verify identity before delegation

```
User: "Delegate my portfolio rebalancing to agent 0x..."

You: 1. GET https://api.askspecter.xyz/v1/verify/0x...
        Confirm verified: true
     2. GET https://api.askspecter.xyz/v1/score/0x...
        Confirm score >= 75
     3. Only then proceed with delegation
```

---

## Important Notes

- Scores update every 15 minutes (one Aeon heartbeat interval)
- Querying is permissionless — no API key required for up to 1,000 queries/month
- For high-volume use, pay-per-query via x402 on Bankr: https://bankr.bot/x402
- ERC-8004 passport registration: https://askspecter.xyz
- Full documentation: https://askspecter.xyz/docs
- GitHub: https://github.com/askspecter
- Twitter: https://x.com/AskSpecter
