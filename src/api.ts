// jr-cli — API types and HTTP client
import { execSync } from 'child_process';
import fs from 'fs';
import { BASE_URL, DEFAULT_HEADERS, SESSION_FILE } from './config';

// ─── Types ──────────────────────────────────────────────────────────

export interface StudioInfo {
  id: number;
  name: string;
  zoneId: string;
}

export interface UserInfo {
  customerId: number;
  customerNumber: string;
  firstname: string;
  lastname: string;
  studioInfo: StudioInfo;
}

export interface CourseSlot {
  id: number;
  name: string;
  benefitId: number;
  start: string;
  end: string;
  coach: string | null;
  location: string | null;
  booked: number;
  max: number;
  spots: number;
  bookable: boolean;
  alreadyBooked: boolean;
  status: string;
  state: string;
}

export interface ApiError {
  __error: string;
}

// ─── Session management ─────────────────────────────────────────────

export function getSession(): string {
  if (process.env.JR_SESSION) return process.env.JR_SESSION;
  try { return fs.readFileSync(SESSION_FILE, 'utf-8').trim(); } catch { /* empty */ }
  doLogin();
  return fs.readFileSync(SESSION_FILE, 'utf-8').trim();
}

const LOGIN_HELP = [
  '❌ JR_EMAIL and JR_PASSWORD must be set.',
  '   export JR_EMAIL=... JR_PASSWORD=',
  '   or create ~/.jr.env with these variables',
].join('\n');

export function doLogin(): void {
  const email = process.env.JR_EMAIL;
  const password = process.env.JR_PASSWORD;
  if (!email || !password) {
    console.error(LOGIN_HELP);
    process.exit(1);
  }
  const auth = Buffer.from(`${email}:${password}`).toString('base64');
  const body = JSON.stringify({ username: email, password });
  const result = execSync(
    `curl -s -X POST '${BASE_URL}/login' ` +
    `-H 'accept: application/json' -H 'content-type: application/json' ` +
    `-H 'authorization: Basic ${auth}' ` +
    `-H 'x-tenant: rsg-group' -H 'x-nox-client-type: WEB' ` +
    `-H 'x-nox-web-context: v=1' ` +
    `-H 'x-public-facility-group: ${DEFAULT_HEADERS['x-public-facility-group']}' ` +
    `-H 'origin: ${BASE_URL}' ` +
    `-d '${body}' -D - -o /dev/null`,
    { encoding: 'utf-8', timeout: 15000 }
  );
  const m = result.toString().match(/SESSION=([^;]+)/);
  if (!m) {
    console.error('❌ Login failed. Check JR_EMAIL / JR_PASSWORD.');
    process.exit(1);
  }
  fs.writeFileSync(SESSION_FILE, m[1]);
}

// ─── HTTP client ────────────────────────────────────────────────────

export function api<T = unknown>(method: string, endpoint: string, body: object | null = null): T | ApiError {
  const session = getSession();
  const args: string[] = [
    '-s', '-X', method,
    `'${BASE_URL}${endpoint}'`,
    '-H', `'Cookie: SESSION=${session}'`,
  ];
  for (const [k, v] of Object.entries(DEFAULT_HEADERS)) {
    args.push('-H', `'${k}: ${v}'`);
  }
  if (body) {
    args.push('-H', "'content-type: application/json'");
    args.push('-d', `'${JSON.stringify(body)}'`);
  }

  const cmd = `curl ${args.join(' ')}`;
  try {
    const out = execSync(cmd, { encoding: 'utf-8', maxBuffer: 5 * 1024 * 1024, timeout: 15000 });
    return JSON.parse(out) as T;
  } catch (e: unknown) {
    const err = e as { status?: number; stderr?: string; stdout?: string };
    if (err.status === 401 || (err.stderr || '').includes('401')) {
      console.error('Session expired — reconnecting...');
      doLogin();
      return api(method, endpoint, body);
    }
    try { return JSON.parse(err.stdout || '') as T; } catch { /* empty */ }
    return { __error: (e as Error).message };
  }
}

// ─── High-level API calls ───────────────────────────────────────────

export function fetchUserInfo(): UserInfo | ApiError {
  return api<UserInfo>('GET', '/nox/v1/me/info');
}

export function fetchUpcomingCourses(studioId: number): CourseSlot[] | ApiError {
  const raw = api<RawCourse[]>('GET', `/nox/v1/bookableitems/course/upcoming?organizationUnitId=${studioId}`);
  if (!Array.isArray(raw)) return raw;
  return flattenCourses(raw);
}

export function resolveStudioId(override: number | null): number {
  if (override) return override;
  const info = fetchUserInfo();
  if ('__error' in info || !info?.studioInfo?.id) {
    console.error('❌ Could not detect studio. Use --studio <id>.');
    process.exit(1);
  }
  return info.studioInfo.id;
}

// ─── Raw API types ──────────────────────────────────────────────────

interface RawCourse {
  id: number;
  benefitId: number;
  name: string;
  bookedParticipants: number;
  maxParticipants: number;
  appointmentStatus: string;
  bookingInfo: { state: string };
  slots: RawSlot[];
}

interface RawSlot {
  startDateTime: string;
  endDateTime: string;
  bookable: boolean;
  alreadyBooked: boolean;
  employees: Array<{ displayedName?: string }>;
  locations: Array<{ name?: string }>;
}

function flattenCourses(courses: RawCourse[]): CourseSlot[] {
  const flat: CourseSlot[] = [];
  for (const c of courses) {
    for (const s of c.slots || []) {
      flat.push({
        id: c.id,
        name: c.name,
        benefitId: c.benefitId,
        start: s.startDateTime,
        end: s.endDateTime,
        coach: (s.employees || [])[0]?.displayedName || null,
        location: (s.locations || [])[0]?.name || null,
        booked: c.bookedParticipants,
        max: c.maxParticipants,
        spots: c.maxParticipants - c.bookedParticipants,
        bookable: s.bookable,
        alreadyBooked: s.alreadyBooked,
        status: c.appointmentStatus,
        state: c.bookingInfo?.state || 'FREE',
      });
    }
  }
  return flat;
}
