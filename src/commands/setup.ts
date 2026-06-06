// jr-cli — setup / usage commands

export function cmdSetup(): void {
  console.log(`
╔══════════════════════════════════════════════════════╗
║  JR-CLI Setup                                       ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  1. Set your credentials:                           ║
║     echo 'JR_EMAIL=you@email.com'  > ~/.jr.env      ║
║     echo 'JR_PASSWORD=...'       >> ~/.jr.env       ║
║     chmod 600 ~/.jr.env                              ║
║                                                      ║
║  2. Log in:                                         ║
║     node dist/index.js login                         ║
║                                                      ║
║  3. You are ready!                                  ║
║     node dist/index.js list                          ║
║     node dist/index.js book <id>                     ║
║                                                      ║
║  Automation (cron):                                 ║
║     source ~/.jr.env && node dist/index.js list --json ║
║                                                      ║
╚══════════════════════════════════════════════════════╝
`);
}

export function cmdUsage(): void {
  console.log(`
╔══════════════════════════════════════════════════╗
║        JR — John Reed Fitness CLI                ║
╠══════════════════════════════════════════════════╣
║ Usage: node dist/index.js <command>              ║
║                                                  ║
║  setup     Setup guide                           ║
║  login     Log in (Basic Auth)                   ║
║  whoami    Account info                          ║
║  list      List upcoming courses                 ║
║  book <id> Book a course                         ║
║  cancel <id> Cancel a booking                    ║
║  status    Show my bookings                      ║
║                                                  ║
║ Options:                                         ║
║  --json     Machine-readable output              ║
║  --studio <id>  Override studio                  ║
║                                                  ║
║ Quick start:                                     ║
║  export JR_EMAIL=... JR_PASSWORD=...            ║
║  node dist/index.js login                        ║
║  node dist/index.js list                         ║
╚══════════════════════════════════════════════════╝
`);
}
