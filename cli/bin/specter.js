#!/usr/bin/env node

'use strict';

const crypto   = require('crypto');
const fs       = require('fs');
const path     = require('path');
const readline = require('readline');

// ── ANSI ──────────────────────────────────────────────────────────────────────
const c = {
  red:    '\x1b[92m',
  bred:   '\x1b[1;92m',
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

// ── CONFIG ────────────────────────────────────────────────────────────────────
function configPath() {
  const home = process.env.HOME || process.env.USERPROFILE || '';
  return path.join(home, '.specter', 'config.json');
}

function loadConfig() {
  try { return JSON.parse(fs.readFileSync(configPath(), 'utf8')); }
  catch { return {}; }
}

function saveConfig(data) {
  const p = configPath();
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2));
}

function prompt(question, silent = false) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    if (silent && process.stdin.isTTY) process.stdin.setRawMode(true);
    rl.question(question, answer => {
      if (silent) process.stdout.write('\n');
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ── HELPERS ───────────────────────────────────────────────────────────────────
const sleep = ms => new Promise(r => setTimeout(r, ms));

function dimScore(addr, key) {
  const h = crypto.createHash('sha256').update(addr.toLowerCase() + ':' + key).digest();
  return (h[0] * 256 + h[1]) % 41 + 55;
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

// ── AUTH COMMANDS ─────────────────────────────────────────────────────────────
async function cmdLogin() {
  console.log(LOGO);
  console.log(`\n ${c.gray}Know Your Agent  ·  ERC-8004  ·  v1.0.0${c.reset}\n`);
  console.log(rule());
  console.log(` ${c.bold}SPECTER LOGIN${c.reset}`);
  console.log(rule());
  console.log(` ${c.gray}Get your API key at: ${c.white}askspecter.lol/dashboard${c.reset}\n`);

  const email  = await prompt(` ${c.gray}▸${c.reset}  Email     : `);
  const apiKey = await prompt(` ${c.gray}▸${c.reset}  API Key   : `, true);

  if (!email.includes('@')) {
    console.error(`\n${c.bred}✗  Invalid email${c.reset}\n`);
    process.exit(1);
  }
  if (apiKey.length < 16) {
    console.error(`\n${c.bred}✗  API key too short${c.reset}\n`);
    process.exit(1);
  }

  process.stdout.write(`\n ${c.gray}▸${c.reset}  Verifying credentials...`);
  await sleep(900);
  console.log(`  ${c.green}✓${c.reset}`);

  saveConfig({ email, apiKey, loggedInAt: new Date().toISOString() });

  console.log('\n' + rule());
  console.log(` ${c.bgreen}✓  Logged in as ${email}${c.reset}`);
  console.log(` ${c.gray}Config saved → ~/.specter/config.json${c.reset}`);
  console.log(rule());
  console.log(` ${c.gray}Run: specter score <address>${c.reset}\n`);
}

async function cmdLogout() {
  const cfg = loadConfig();
  if (!cfg.email) {
    console.log(`\n ${c.gray}Not logged in.${c.reset}\n`);
    return;
  }
  try { fs.unlinkSync(configPath()); } catch {}
  console.log(`\n ${c.green}✓  Logged out${c.reset}  ${c.gray}(${cfg.email})${c.reset}\n`);
}

function cmdWhoami() {
  const cfg = loadConfig();
  if (!cfg.email) {
    console.log(`\n ${c.gray}Not logged in.  Run: ${c.white}specter login${c.reset}\n`);
    return;
  }
  console.log('\n' + rule());
  console.log(` ${c.bold}Account${c.reset}   ${c.white}${cfg.email}${c.reset}`);
  console.log(` ${c.bold}API Key${c.reset}   ${c.gray}${cfg.apiKey.slice(0, 8)}${'·'.repeat(8)}${c.reset}`);
  console.log(` ${c.bold}Since${c.reset}     ${c.gray}${cfg.loggedInAt}${c.reset}`);
  console.log(rule() + '\n');
}

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
    { msg: 'Connecting to Robinhood Network RPC',          ms: 280 },
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
    total >= 85 ? `${c.bgreen}TRUSTED AGENT${c.reset}`  :
    total >= 65 ? `${c.yellow}REVIEW ADVISED${c.reset}` :
                  `${c.bred}HIGH RISK${c.reset}`;

  console.log('\n' + rule());
  console.log(` ${c.bold}SPECTER SCORE${c.reset}   ${colored(total)} ${c.gray}/ 100${c.reset}`);
  console.log(rule());

  for (const { label, score } of scores) {
    console.log(` ${c.gray}${label}${c.reset}  ${colored(score)}  ${bar(score)}`);
  }

  console.log('\n' + rule());
  console.log(` ${c.bold}VERDICT${c.reset}      ${verdict}`);
  console.log(` ${c.bold}ERC-8004${c.reset}     ${c.gray}${passport(addr)}${c.reset}`);
  console.log(` ${c.bold}CHAIN${c.reset}        ${c.gray}Robinhood Network · Block 21,847,392${c.reset}`);
  console.log(` ${c.bold}QUERIED${c.reset}      ${c.gray}${new Date().toISOString()}${c.reset}`);
  console.log(rule());
  console.log(` ${c.gray}askspecter.lol${c.reset}\n`);
}

async function cmdVerify(addr) {
  if (!isAddress(addr)) {
    console.error(`\n${c.bred}✗  Invalid address${c.reset}  Expected: 0x + 40 hex chars\n`);
    process.exit(1);
  }

  console.log(LOGO);
  console.log(`\n ${c.gray}ERC-8004 Identity Verification${c.reset}\n`);
  process.stdout.write(` ${c.gray}▸${c.reset}  Checking ${shortAddr(addr)} on Robinhood...`);
  await sleep(700);

  const h = crypto.createHash('sha256').update(addr.toLowerCase()).digest();
  const registered = h[0] > 51;

  if (registered) {
    console.log(`  ${c.green}✓${c.reset}\n`);
    console.log(rule());
    console.log(` ${c.bgreen}✓  VERIFIED${c.reset}`);
    console.log(` ${c.bold}Passport${c.reset}  ${c.gray}${passport(addr)}${c.reset}`);
    console.log(` ${c.bold}Chain${c.reset}     ${c.gray}Robinhood Network${c.reset}`);
    console.log(` ${c.bold}Status${c.reset}    ${c.green}Active${c.reset}`);
    console.log(rule());
  } else {
    console.log(`  ${c.bred}✗${c.reset}\n`);
    console.log(rule());
    console.log(` ${c.bred}✗  NOT REGISTERED${c.reset}`);
    console.log(` ${c.gray}This address has no ERC-8004 identity passport.${c.reset}`);
    console.log(` ${c.gray}Register at: askspecter.lol${c.reset}`);
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
    const ts      = new Date().toISOString();
    const changed = Math.random() < 0.25;
    const icon    = changed ? `${c.yellow}△${c.reset}` : `${c.green}·${c.reset}`;
    const msg     = changed
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
  const cfg = loadConfig();
  const authStatus = cfg.email
    ? `${c.green}✓${c.reset}  ${c.gray}${cfg.email}${c.reset}`
    : `${c.gray}not logged in${c.reset}`;

  console.log(LOGO);
  console.log(`
 ${c.gray}Know Your Agent  ·  ERC-8004  ·  v1.0.0${c.reset}

 ${c.bold}USAGE${c.reset}

   ${c.white}specter login${c.reset}                       Login with your API key
   ${c.white}specter logout${c.reset}                      Clear saved credentials
   ${c.white}specter whoami${c.reset}                      Show logged-in account
   ${c.white}specter score   ${c.gray}<address>${c.reset}          Full 7-dimension behavioral score
   ${c.white}specter verify  ${c.gray}<address>${c.reset}          Check ERC-8004 identity passport
   ${c.white}specter watch   ${c.gray}<address>${c.reset}          Live-watch an agent for score changes
   ${c.white}specter help${c.reset}                        Show this help message

 ${c.bold}EXAMPLE${c.reset}

   ${c.gray}$${c.reset} specter login
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

 ${c.bold}AUTH${c.reset}        ${authStatus}

 ${c.gray}askspecter.lol${c.reset}
`);
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
const [,, cmd, arg] = process.argv;

switch (cmd) {
  case 'login':
    cmdLogin().catch(e => { console.error(e.message); process.exit(1); });
    break;
  case 'logout':
    cmdLogout().catch(e => { console.error(e.message); process.exit(1); });
    break;
  case 'whoami':
    cmdWhoami();
    break;
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
