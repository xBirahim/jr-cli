// jr-cli — whoami command
import { fetchUserInfo, UserInfo } from '../api';
import { isJsonMode } from '../config';

export function cmdWhoami(): void {
  const info = fetchUserInfo();

  if (isJsonMode()) {
    console.log(JSON.stringify(info, null, 2));
    return;
  }

  if ('__error' in info || !(info as UserInfo)?.firstname) {
    console.log('Not logged in. Run: node dist/index.js login');
    return;
  }
  const u = info as UserInfo;
  console.log(`👤 ${u.firstname} ${u.lastname}`);
  console.log(`   Member #${u.customerNumber}`);
  console.log(`   Studio: ${u.studioInfo?.name} (ID: ${u.studioInfo?.id})`);
  console.log(`   Zone: ${u.studioInfo?.zoneId}`);
}
