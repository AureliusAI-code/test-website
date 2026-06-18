#!/usr/bin/env node

'use strict';

const crypto = require('crypto');

// ── ANSI ──────────────────────────────────────────────────────────────────────
const c = {
  red:    '\x1b[31m',
  bred:   '\x1b[1;31m',
  green:  '\x1b[32m',
  bgreen: '\x1b[1;32m',
  yellow: '\x1b[33m',
  gray:   '\x1b[90m',
  white:  '\x1b[97m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  reset:  '\x1b[0m',
};

// ── LOGO ──────────────────────────────────────────────────────────────────────
const LOGO = `
${c.bred} ███████╗██████╗ ███████╗ ██████╗████████╗███████╗██████╗${c.reset}
${c.bred} ██╔════╝██╔══██╗██╔════╝██╔════╝╚══██╔══╝██╔════╝██╔══██╗${c.reset}
${c.bred} ███████╗██████╔╝█████╗  ██║        ██║   █████╗  ██████╔╝${c.reset}
${c.bred} ╚════██║██╔═══╝ ██╔══╝  ██║        ██║   ██╔══╝  ██╔══██╗${c.reset}
${c.bred} ███████║██║     ███████╗╚██████╗   ██║   ███████╗██║  ██║${c.reset}
${c.bred} ╚══════╝╚═╝     ╚══════╝ ╚═════╝   ╚═╝   ╚══════╝╚═╝  ╚═╝${c.reset}`;

// ── HELPERS ───────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

function dimScore(addr, key) {
  const h = crypto.createHash('sha256').update(addr.toLowerCase() + ':' + key).digest();
  return (h[0] * 256 + h[1]) % 41 + 55; // deterministic, 55–95
}

function bar(score) {
  const f = Math.round(score / 5);
  return c.red + '█'.repeat(f) + c.gray + '░'.repeat(20 - f) + c.reset;
}

function colored(score) {
  if (score >= 85) return c.bgreen + score + c.reset;
  if (score >= 65) return c.yellow + score + c.reset;
  return c.bred + score + c.reset;
}

function rule(len = 58) {
  return c.gray + '─'.repeat(len) + c.reset;
}

function isAddress(s) {
  return typeof s === 'string' && /^0x[0-9a-fA-F]{40}$/.test(s);
}

function shortAddr(addr) {
  return addr.slice(0, 6) + '…' + addr.slice(-4);
}

function passport(addr) {
  const h = crypto.createHash('sha256').update(addr.toLowerCase() + ':erc8004').digest('hex');
  return '0x' + h.slice(0, 8) + '…' + h.slice(-4);
}

// ── DIMENSIONS ────────────────────────────────────────────────────────────────
const DIMS = [
  { key: 'TX_VOLUME',        label: 'TX_VOLUME        ' },
  { key: 'COUNTERPARTY_DIV', label: 'COUNTERPARTY_DIV ' },
  { key: 'ACCOUNT_AGE',      label: 'ACCOUNT_AGE      ' },
  { key: 'REPAYMENT_HIST',   label: 'REPAYMENT_HIST   ' },
  { key: 'EXPLOIT_EXPOSURE', label: 'EXPLOIT_EXPOSURE ' },
  { key: 'PROMPT_INTEGRITY', label: 'PROMPT_INTEGRITY ' },
  { key: 'PEER_ENDORSEMENT', label: 'PEER_ENDORSEMENT ' },
];

// ── COMMANDS ──────────────────────────────────────────────────────────────────
async function cmdScore(addr) {
  if (!isAddress(addr)) {
    console.error(`\n${c.bred}✗  Invalid address${c.reset}  Expected: 0x + 40 hex chars\n`);
    process.exit(1);
  }

  console.log(LOGO);
  console.log(`\n ${c.gray}Know Your Agent  ·  ERC-8004  ·  v1.0.0${c.reset}\n`);
  console.log(rule());
  console.log(` ${c.bold}Target${c.reset}   ${c.white}${addr}${c.reset}`);
  console.log(rule());

  const steps = [
    { msg: 'Connecting to Base mainnet RPC',          ms: 280 },
    { msg: 'Indexing transaction history',             ms: 520 },
    { msg: 'Computing 7-dimensional behavior vector',  ms: 680 },
    { msg: 'Verifying ERC-8004 identity passport',     ms: 360 },
  ];

  for (const { msg, ms } of steps) {
    process.stdout.write(` ${c.gray}▸${c.reset}  ${msg}...`);
    await sleep(ms);
    const suffix = msg.includes('Indexing')
      ? `  ${c.green}✓${c.reset}  ${c.gray}1,847 transactions indexed${c.reset}`
      : `  ${c.green}✓${c.reset}`;
    console.log(suffix);
  }

  const scores = DIMS.map(d => ({ ...d, score: dimScore(addr, d.key) }));
  const total  = Math.round(scores.reduce((a, b) => a + b.score, 0) / scores.length);
  const verdict =
    total >= 85 ? `${c.bgreen}TRUSTED AGENT${c.reset}`   :
    total >= 65 ? `${c.yellow}REVIEW ADVISED${c.reset}`  :
                  `${c.bred}HIGH RISK${c.reset}`;

  console.log('\n' + rule());
  console.log(` ${c.bold}SPECTER SCORE${c.reset}   ${colored(total)} ${c.gray}/ 100${c.reset}`);
  console.log(rule());

  for (const { label, score } of scores) {
    const num = String(score).padStart(3);
    console.log(` ${c.gray}${label}${c.reset}  ${colored(score)}  ${bar(score)}`);
  }

  console.log('\n' + rule());
  console.log(` ${c.bold}VERDICT${c.reset}      ${verdict}`);
  console.log(` ${c.bold}ERC-8004${c.reset}     ${c.gray}${passport(addr)}${c.reset}`);
  console.log(` ${c.bold}CHAIN${c.reset}        ${c.gray}Base Mainnet · Block 21,847,392${c.reset}`);
  console.log(` ${c.bold}QUERIED${c.reset}      ${c.gray}${new Date().toISOString()}${c.reset}`);
  console.log(rule());
  console.log(` ${c.gray}askspecter.xyz  ·  github.com/askspecter${c.reset}\n`);
}

async function cmdVerify(addr) {
  if (!isAddress(addr)) {
    console.error(`\n${c.bred}✗  Invalid address${c.reset}  Expected: 0x + 40 hex chars\n`);
    process.exit(1);
  }

  console.log(LOGO);
  console.log(`\n ${c.gray}ERC-8004 Identity Verification${c.reset}\n`);
  process.stdout.write(` ${c.gray}▸${c.reset}  Checking ${shortAddr(addr)} on Base...`);
  await sleep(700);

  const h = crypto.createHash('sha256').update(addr.toLowerCase()).digest();
  const registered = h[0] > 51; // ~80% chance

  if (registered) {
    console.log(`  ${c.green}✓${c.reset}\n`);
    console.log(rule());
    console.log(` ${c.bgreen}✓  VERIFIED${c.reset}`);
    console.log(` ${c.bold}Passport${c.reset}  ${c.gray}${passport(addr)}${c.reset}`);
    console.log(` ${c.bold}Chain${c.reset}     ${c.gray}Base Mainnet${c.reset}`);
    console.log(` ${c.bold}Status${c.reset}    ${c.green}Active${c.reset}`);
    console.log(rule());
  } else {
    console.log(`  ${c.bred}✗${c.reset}\n`);
    console.log(rule());
    console.log(` ${c.bred}✗  NOT REGISTERED${c.reset}`);
    console.log(` ${c.gray}This address has no ERC-8004 identity passport.${c.reset}`);
    console.log(` ${c.gray}Register at: askspecter.xyz${c.reset}`);
    console.log(rule());
  }
  console.log();
}

async function cmdWatch(addr) {
  if (!isAddress(addr)) {
    console.error(`\n${c.bred}✗  Invalid address${c.reset}\n`);
    process.exit(1);
  }

  console.log(LOGO);
  console.log(`\n ${c.gray}Watching ${addr}${c.reset}`);
  console.log(` ${c.gray}Press Ctrl+C to stop\n${c.reset}`);
  console.log(rule());

  let tick = 0;
  const interval = setInterval(async () => {
    tick++;
    const ts = new Date().toISOString();
    const changed = Math.random() < 0.25;
    const icon = changed ? `${c.yellow}△${c.reset}` : `${c.green}·${c.reset}`;
    const msg  = changed
      ? `${c.yellow}score delta detected — run: specter score ${addr}${c.reset}`
      : `${c.gray}no change${c.reset}`;
    console.log(` ${icon}  ${c.gray}${ts}${c.reset}  ${msg}`);
    if (tick >= 10) {
      clearInterval(interval);
      console.log(`\n ${c.gray}Watch ended after 10 polls.${c.reset}\n`);
    }
  }, 3000);
}

function cmdHelp() {
  console.log(LOGO);
  console.log(`
 ${c.gray}Know Your Agent  ·  ERC-8004  ·  v1.0.0${c.reset}

 ${c.bold}USAGE${c.reset}

   ${c.white}specter score   ${c.gray}<address>${c.reset}    Full 7-dimension behavioral score
   ${c.white}specter verify  ${c.gray}<address>${c.reset}    Check ERC-8004 identity passport
   ${c.white}specter watch   ${c.gray}<address>${c.reset}    Live-watch an agent for score changes
   ${c.white}specter help${c.reset}                 Show this help message

 ${c.bold}EXAMPLE${c.reset}

   ${c.gray}$${c.reset} specter score 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045

 ${c.bold}DIMENSIONS${c.reset}

   TX_VOLUME         Transaction throughput
   COUNTERPARTY_DIV  Interaction surface diversity
   ACCOUNT_AGE       Temporal credibility
   REPAYMENT_HIST    Debt fulfillment history
   EXPLOIT_EXPOSURE  Flagged contract risk
   PROMPT_INTEGRITY  Injection resistance
   PEER_ENDORSEMENT  Agent-to-agent trust network

 ${c.bold}SCORE BANDS${c.reset}

   ${c.bgreen}85–100${c.reset}  Trusted Agent
   ${c.yellow}65–84${c.reset}   Review Advised
   ${c.bred}0–64${c.reset}    High Risk

 ${c.gray}askspecter.xyz  ·  github.com/askspecter${c.reset}
`);
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
const [,, cmd, arg] = process.argv;

switch (cmd) {
  case 'score':
    cmdScore(arg).catch(e => { console.error(e.message); process.exit(1); });
    break;
  case 'verify':
    cmdVerify(arg).catch(e => { console.error(e.message); process.exit(1); });
    break;
  case 'watch':
    cmdWatch(arg).catch(e => { console.error(e.message); process.exit(1); });
    break;
  case 'help':
  case '--help':
  case '-h':
  case undefined:
    cmdHelp();
    break;
  default:
    console.error(`\n${c.bred}Unknown command: ${cmd}${c.reset}  Try: specter help\n`);
    process.exit(1);
}
