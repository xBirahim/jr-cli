// jr-cli — config & constants
import fs from 'fs';
import path from 'path';
import os from 'os';

export const BASE_URL = 'https://my.johnreed.fitness';
export const SESSION_FILE = path.join(os.homedir(), '.jr_session');
export const CONFIG_FILE = path.join(os.homedir(), '.jr.env');

// Default headers applied to all API requests
export const DEFAULT_HEADERS: Record<string, string> = {
  'accept': 'application/json',
  'x-tenant': 'rsg-group',
  'x-nox-client-type': 'WEB',
  'x-nox-web-context': 'v=1',
  'x-public-facility-group': 'JOHNREED-65A11AB8FA704F88B2D8EF52523C576A',
};

// Load ~/.jr.env into process.env if it exists (does not override existing)
export function loadEnvFile(): void {
  if (fs.existsSync(CONFIG_FILE)) {
    const lines = fs.readFileSync(CONFIG_FILE, 'utf-8').split('\n');
    for (const line of lines) {
      const m = line.match(/^(\w+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  }
}

// CLI flags
export function isJsonMode(): boolean {
  return process.argv.includes('--json');
}

export function getStudioOverride(): number | null {
  const idx = process.argv.indexOf('--studio');
  if (idx !== -1 && process.argv[idx + 1]) {
    const id = parseInt(process.argv[idx + 1], 10);
    // Remove from argv so command parsing still works
    process.argv.splice(idx, 2);
    return id;
  }
  return null;
}
