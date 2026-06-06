#!/usr/bin/env node
//
// jr — John Reed Fitness CLI
// Reverse-engineered API client for course booking
// GitHub: https://github.com/...
//
// Setup:
//   1. export JR_EMAIL=... JR_PASSWORD=***
//   2. node jr.js login
//   3. node jr.js list
//
// Options: --json (machine output), --studio <id> (override studio)

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');

// ─── State ────────────────────────────────────────────────────────

const BASE = 'https://my.johnreed.fitness';
const SESSION_FILE = path.join(os.homedir(), '.jr_session');
const CONFIG_FILE = path.join(os.homedir(), '.jr.env');

let JSON_MODE = process.argv.includes('--json');
let STUDIO_ID = null; // auto-detected

// Parse --studio flag
const studioIdx = process.argv.indexOf('--studio');
if (studioIdx !== -1 && process.argv[studioIdx + 1]) {
  STUDIO_ID = parseInt(process.argv[studioIdx + 1]);
  // Remove from argv so command parsing still works
  process.argv.splice(studioIdx, 2);
}

// ─── Helpers ──────────────────────────────────────────────────────

function loadConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    for (const line of fs.readFileSync(CONFIG_FILE, 'utf-8').split('\n')) {
      const m = line.match(/^(\w+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  }
}
loadConfig();

function log(msg) { if (!JSON_MODE) console.log(msg); }
function die(msg) { console.error(msg); process.exit(1); }

function http(method, endpoint, body = null) {
  const session = getSession();
  const args = [
    '-s', '-X', method,
    `'${BASE}${endpoint}'`,
    '-H', `'Cookie: SESSION=${session}'`,
    '-H', "'accept: application/json'",
    '-H', "'x-tenant: rsg-group'",
    '-H', "'x-nox-client-type: WEB'",
    '-H', "'x-nox-web-context: v=1'",
    '-H', "'x-public-facility-group: JOHNREED-65A11AB8FA704F88B2D8EF52523C576A'",
  ];
  if (body) {
    args.push('-H', "'content-type: application/json'");
    args.push('-d', `'${JSON.stringify(body)}'`);
  }

  const cmd = `curl ${args.join(' ')}`;
  try {
    const out = execSync(cmd, { encoding: 'utf-8', maxBuffer: 5 * 1024 * 1024, timeout: 15000 });
    return JSON.parse(out);
  } catch (e) {
    if (e.status === 401 || (e.stderr || '').includes('401')) {
      console.error('Session expirée → reconnexion…');
      doLogin();
      return http(method, endpoint, body);
    }
    try { return JSON.parse(e.stdout); } catch { }
    return { __error: e.message };
  }
}

function getSession() {
  if (process.env.JR_SESSION) return process.env.JR_SESSION;
  try { return fs.readFileSync(SESSION_FILE, 'utf-8').trim(); } catch { }
  doLogin();
  return fs.readFileSync(SESSION_FILE, 'utf-8').trim();
}

function doLogin() {
  const email = process.env.JR_EMAIL;
  const password = process.env.JR_PASSWORD;
  if (!email || !password) {
    die('❌ JR_EMAIL et JR_PASSWORD non définis.\n' +
        '   export JR_EMAIL=... JR_PASSWORD=***\n' +
        '   ou crée ~/.jr.env avec ces variables.');
  }
  const auth = Buffer.from(`${email}:${password}`).toString('base64');
  const result = execSync(
    `curl -s -X POST '${BASE}/login' ` +
    `-H 'accept: application/json' -H 'content-type: application/json' ` +
    `-H 'authorization: Basic ${auth}' ` +
    `-H 'x-tenant: rsg-group' -H 'x-nox-client-type: WEB' ` +
    `-H 'x-nox-web-context: v=1' ` +
    `-H 'x-public-facility-group: JOHNREED-65A11AB8FA704F88B2D8EF52523C576A' ` +
    `-H 'origin: ${BASE}' ` +
    `-d '${JSON.stringify({ username: email, password })}' -D - -o /dev/null`,
    { encoding: 'utf-8', timeout: 15000 }
  );
  const m = result.match(/SESSION=([^;]+)/);
  if (!m) die('❌ Échec de connexion. Vérifie JR_EMAIL / JR_PASSWORD.');
  fs.writeFileSync(SESSION_FILE, m[1]);
}

function getStudioId() {
  if (STUDIO_ID) return STUDIO_ID;
  // Auto-detect from /me/info
  try {
    const info = http('GET', '/nox/v1/me/info');
    if (info?.studioInfo?.id) {
      STUDIO_ID = info.studioInfo.id;
      return STUDIO_ID;
    }
  } catch { }
  die('❌ Impossible de détecter le studio. Utilise --studio <id>.');
}

// ─── Commands ─────────────────────────────────────────────────────

function cmdList() {
  const sid = getStudioId();
  const courses = http('GET', `/nox/v1/bookableitems/course/upcoming?organizationUnitId=${sid}`);

  if (!Array.isArray(courses)) { die('Erreur API.'); }
  if (courses.length === 0) { log('Aucun cours à venir.'); return; }

  // JSON output
  if (JSON_MODE) {
    const flat = [];
    for (const c of courses) {
      for (const s of c.slots || []) {
        flat.push({
          id: c.id, name: c.name, benefitId: c.benefitId,
          start: s.startDateTime, end: s.endDateTime,
          coach: (s.employees || [{}])[0]?.displayedName || null,
          location: (s.locations || [{}])[0]?.name || null,
          booked: c.bookedParticipants, max: c.maxParticipants,
          spots: c.maxParticipants - c.bookedParticipants,
          bookable: s.bookable, alreadyBooked: s.alreadyBooked,
          status: c.appointmentStatus, state: c.bookingInfo?.state,
        });
      }
    }
    console.log(JSON.stringify(flat, null, 2));
    return;
  }

  log(`📋 John Reed — Cours à venir\n`);

  const byDay = {};
  for (const c of courses) {
    for (const s of c.slots || []) {
      const date = s.startDateTime.substring(0, 10);
      if (!byDay[date]) byDay[date] = [];
      byDay[date].push({
        id: c.id, name: c.name,
        start: s.startDateTime, end: s.endDateTime,
        coach: (s.employees || [{}])[0]?.displayedName || '?',
        location: (s.locations || [{}])[0]?.name || '?',
        booked: c.bookedParticipants, max: c.maxParticipants,
        state: c.bookingInfo?.state, status: c.appointmentStatus,
        alreadyBooked: s.alreadyBooked,
      });
    }
  }

  let bookedCount = 0;
  for (const [date, items] of Object.entries(byDay).sort()) {
    const day = new Date(date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
    log(`\n${'═'.repeat(70)}`);
    log(`  ${day.toUpperCase()}`);
    log(`${'═'.repeat(70)}`);

    for (const c of items.sort((a, b) => a.start.localeCompare(b.start))) {
      const time = `${c.start.substring(11, 16)} → ${c.end.substring(11, 16)}`;
      const spots = c.max - c.booked;
      const pct = c.max > 0 ? Math.round(c.booked / c.max * 10) : 0;
      const bar = '█'.repeat(pct) + '░'.repeat(10 - pct);
      const prefix = c.alreadyBooked ? '⭐' : ' ';
      const badge = c.alreadyBooked ? ' ⭐RÉSERVÉ' : '';
      const full = spots === 0 && !c.alreadyBooked ? ' 🔴COMPLET' : '';
      const cancelled = c.status === 'CANCELED' ? ' ❌ANNULÉ' : '';
      const state = c.state && c.state !== 'FREE' ? ` [${c.state}]` : '';

      log(` ${prefix} [${c.id}] ${c.name.padEnd(24)} ${time}  ${bar} ${c.booked}/${c.max}${full}${cancelled}${badge}${state}`);
      log(`        ${c.coach.padEnd(20)} @ ${c.location}`);
      if (c.alreadyBooked) bookedCount++;
    }
  }

  if (bookedCount > 0) log(`\n⭐ ${bookedCount} cours réservé(s)`);
  log(`\n💡 Réserver: node jr.js book <id>`);
}

function cmdBook(id) {
  if (!id) die('Usage: node jr.js book <courseId>');
  const result = http('POST', '/nox/v1/calendar/bookcourse', {
    courseAppointmentId: parseInt(id),
    expectedCustomerStatus: 'BOOKED'
  });
  if (Array.isArray(result)) {
    const msg = result[0]?.errorMessage || '';
    if (msg.includes('déjà réservé')) log('⚠️  Déjà réservé !');
    else if (msg.includes('retrouvé')) die('❌ ID cours invalide.');
    else die('❌ ' + msg);
  } else {
    log('✅ Réservé !');
  }
}

function cmdCancel(id) {
  if (!id) die('Usage: node jr.js cancel <bookingId>');
  const result = http('DELETE', `/nox/v1/calendar/${id}/cancel-for-member`);
  if (result?.__error) die('❌ Échec: ' + result.__error);
  log('✅ Annulé !');
}

function cmdStatus() {
  const sid = getStudioId();
  const courses = http('GET', `/nox/v1/bookableitems/course/upcoming?organizationUnitId=${sid}`);
  if (!Array.isArray(courses)) { die('Erreur API.'); }

  let found = 0;
  for (const c of courses) {
    for (const s of c.slots || []) {
      if (!s.alreadyBooked) continue;
      found++;
      log(`⭐ [${c.id}] ${c.name}`);
      log(`   ${s.startDateTime.substring(0, 16)} → ${s.endDateTime.substring(11, 16)}`);
      const coach = (s.employees || [{}])[0]?.displayedName;
      const loc = (s.locations || [{}])[0]?.name;
      if (coach || loc) log(`   ${coach || ''} @ ${loc || ''}`);
      log('');
    }
  }
  if (!found) log('Aucune réservation trouvée.');
}

function cmdLogin() {
  doLogin();
  const info = http('GET', '/nox/v1/me/info');
  if (info?.firstname) {
    log(`✅ Connecté en tant que ${info.firstname} ${info.lastname}`);
    log(`   Studio: ${info.studioInfo?.name || '?'}`);
    log(`   Session: ${SESSION_FILE}`);
  } else {
    log(`✅ Session sauvegardée dans ${SESSION_FILE}`);
  }
}

function cmdWhoami() {
  const info = http('GET', '/nox/v1/me/info');
  if (JSON_MODE) {
    console.log(JSON.stringify(info, null, 2));
    return;
  }
  if (!info?.firstname) die('Non connecté.');
  log(`👤 ${info.firstname} ${info.lastname}`);
  log(`   Membre #${info.customerNumber}`);
  log(`   Studio: ${info.studioInfo?.name} (ID: ${info.studioInfo?.id})`);
  log(`   Zone: ${info.studioInfo?.zoneId}`);
}

function cmdUsage() {
  log(`
╔══════════════════════════════════════════════════╗
║        JR — John Reed Fitness CLI                ║
╠══════════════════════════════════════════════════╣
║ Usage: node jr.js <commande>                     ║
║                                                  ║
║  setup     Configurer les credentials            ║
║  login     Se connecter (Basic Auth)             ║
║  whoami    Infos du compte                       ║
║  list      Lister les cours                      ║
║  book <id> Réserver un cours                     ║
║  cancel <id> Annuler une réservation             ║
║  status    Voir mes réservations                 ║
║                                                  ║
║ Options:                                         ║
║  --json     Sortie machine (pour scripts)        ║
║  --studio <id>  Forcer un studio                 ║
║                                                  ║
║ Setup rapide:                                    ║
║  export JR_EMAIL=... JR_PASSWORD=***            ║
║  node jr.js login                                ║
║  node jr.js list                                 ║
╚══════════════════════════════════════════════════╝
`);
}

function cmdSetup() {
  log(`
╔══════════════════════════════════════════════════════╗
║  Setup JR-CLI                                       ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  1. Définis tes credentials :                       ║
║     echo 'JR_EMAIL=ton@email.com'  > ~/.jr.env      ║
║     echo 'JR_PASSWORD=***       >> ~/.jr.env       ║
║     chmod 600 ~/.jr.env                              ║
║                                                      ║
║  2. Connecte-toi :                                   ║
║     node jr.js login                                 ║
║                                                      ║
║  3. C'est prêt !                                     ║
║     node jr.js list                                  ║
║     node jr.js book <id>                             ║
║                                                      ║
║  Automatisation (cron) :                            ║
║     source ~/.jr.env && node jr.js list --json       ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
`);
}

// ─── Main ──────────────────────────────────────────────────────

const cmd = process.argv[2] || 'usage';
const arg = process.argv[3];

switch (cmd) {
  case 'setup':           cmdSetup(); break;
  case 'login':           cmdLogin(); break;
  case 'whoami': case 'who': cmdWhoami(); break;
  case 'list': case 'ls': cmdList(); break;
  case 'book': case 'b':  cmdBook(arg); break;
  case 'cancel': case 'c': cmdCancel(arg); break;
  case 'status': case 'st': cmdStatus(); break;
  default:                cmdUsage();
}
