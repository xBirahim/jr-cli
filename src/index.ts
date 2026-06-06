#!/usr/bin/env node
//
// jr — John Reed Fitness CLI
// Reverse-engineered API client for course booking
//
// Setup:
//   1. Set JR_EMAIL and JR_PASSWORD env vars (or ~/.jr.env)
//   2. node dist/index.js login
//   3. node dist/index.js list
//
// Options: --json, --studio <id>

import { loadEnvFile } from './config';
import { cmdList } from './commands/list';
import { cmdBook } from './commands/book';
import { cmdCancel } from './commands/cancel';
import { cmdStatus } from './commands/status';
import { cmdLogin } from './commands/login';
import { cmdWhoami } from './commands/whoami';
import { cmdSetup, cmdUsage } from './commands/setup';

loadEnvFile();

const cmd = process.argv[2] || 'usage';
const arg = process.argv[3];

switch (cmd) {
  case 'setup':
    cmdSetup();
    break;
  case 'login':
    cmdLogin();
    break;
  case 'whoami': case 'who':
    cmdWhoami();
    break;
  case 'list': case 'ls':
    cmdList();
    break;
  case 'book': case 'b':
    cmdBook(arg);
    break;
  case 'cancel': case 'c':
    cmdCancel(arg);
    break;
  case 'status': case 'st':
    cmdStatus();
    break;
  default:
    cmdUsage();
}
