# JR-CLI — John Reed Fitness CLI

**Book gym classes from your terminal.**

Reverse-engineered API client for the MySports/NOX platform used by John Reed Fitness (RSG Group), McFIT, and HEIMAT.

## Install

```bash
git clone https://github.com/xBirahim/jr-cli.git
cd jr-cli
npm install
npm run build
```

Zero runtime dependencies. Requires Node.js ≥ 16 and `curl`.

## Setup

```bash
# 1. Set your John Reed credentials
echo 'JR_EMAIL=you@email.com'  > ~/.jr.env
echo 'JR_PASSWORD=*** >> ~/.jr.env
chmod 600 ~/.jr.env

# 2. Log in
node dist/index.js login
# ✅ Logged in as John Doe
#    Studio: John Reed Lyon

# 3. Ready!
node dist/index.js list
```

## Usage

```
node dist/index.js setup     → Setup guide
node dist/index.js login     → Log in (Basic Auth)
node dist/index.js whoami    → Account info
node dist/index.js list      → List upcoming courses
node dist/index.js book <id> → Book a course
node dist/index.js cancel <id> → Cancel a booking
node dist/index.js status    → Show my bookings
```

### Options

| Flag | Description |
|------|-------------|
| `--json` | Machine-readable JSON output |
| `--studio <id>` | Override studio (auto-detected otherwise) |

### Examples

```bash
# List courses with occupancy bars
node dist/index.js list

# Machine-readable output for scripting
node dist/index.js list --json | jq '.[] | select(.spots > 0)'

# Book course 9387363735
node dist/index.js book 9387363735

# Use a different studio (e.g. Berlin Prenzlauer Berg)
node dist/index.js list --studio 1404492860
```

## Automation

```bash
# In a cron job or script:
source ~/.jr.env && node dist/index.js list --json

# Book a specific course as soon as it is available:
source ~/.jr.env && node dist/index.js book 9387363735
```

The session is auto-managed: if it expires, a new one is automatically created.

## API Reference (Reverse-Engineered)

The underlying API is **MySports/NOX** by Magicline, used by the RSG Group (John Reed, McFIT, HEIMAT).

### Authentication

```
POST https://my.johnreed.fitness/login
Authorization: Basic base64(email:password)
Content-Type: application/json

{"username": "email", "password": "password"}

→ Set-Cookie: SESSION=<uuid>
```

The SESSION cookie is valid for about one hour. All subsequent requests must include `Cookie: SESSION=...`.

### Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/nox/v1/me/info` | User info (name, studio, customer ID) |
| `GET` | `/nox/public/v1/appointmentfilter/course?organizationUnitIds=X` | Available filters (studios, categories) |
| `GET` | `/nox/v1/bookableitems/course/upcoming?organizationUnitId=X` | Upcoming course list (excludes full courses) |
| `GET` | `/nox/v2/bookableitems/courses/with-canceled?startDate=X&endDate=Y&employeeIds=&organizationUnitIds=X` | ALL courses including full ones and canceled |
| `GET` | `/nox/v1/bookableitems/course/{id}` | Course detail |
| `GET` | `/nox/v1/studios/{id}/utilization` | Gym occupancy rate |
| `POST` | `/nox/v1/calendar/bookcourse` | Book a course |
| `DELETE` | `/nox/v1/calendar/{id}/cancel-for-member` | Cancel a booking |

### Booking

```json
POST /nox/v1/calendar/bookcourse
{
  "courseAppointmentId": 9387363735,
  "expectedCustomerStatus": "BOOKED"
}
```

### Required Headers

```
x-tenant: rsg-group
x-nox-client-type: WEB
x-nox-web-context: v=1
x-public-facility-group: JOHNREED-65A11AB8FA704F88B2D8EF52523C576A
```

### Known Studio IDs

| Studio | ID |
|--------|----|
| John Reed Lyon | 4882884510 |
| John Reed Paris So Ouest | 3069409560 |
| John Reed Berlin Prenzlauer Berg | 1404492860 |
| John Reed Wien Schottentor | 3961971910 |
| _...and all others (use `--studio <id>`)_ |

Find your studio ID: log in on the website, open DevTools → Network, look for a request containing `organizationUnitId`.

## Project Structure

```
jr-cli/
├── src/
│   ├── index.ts             # CLI entry point
│   ├── api.ts               # HTTP client, types, session management
│   ├── config.ts            # Env loading, constants, CLI flags
│   └── commands/
│       ├── list.ts
│       ├── book.ts
│       ├── cancel.ts
│       ├── status.ts
│       ├── login.ts
│       ├── whoami.ts
│       └── setup.ts
├── dist/                    # Compiled output (git-ignored)
├── tsconfig.json
├── package.json
└── README.md
```

## License

MIT
