// jr-cli — login command
import { doLogin, fetchUserInfo, UserInfo } from '../api';

export function cmdLogin(): void {
  doLogin();
  const info = fetchUserInfo();
  if ('__error' in info || !(info as UserInfo)?.firstname) {
    console.log('✅ Session saved in ~/.jr_session');
    return;
  }
  const u = info as UserInfo;
  console.log(`✅ Logged in as ${u.firstname} ${u.lastname}`);
  console.log(`   Member #${u.customerNumber}`);
  console.log(`   Studio: ${u.studioInfo?.name || '?'} (ID: ${u.studioInfo?.id})`);
  console.log(`   Zone: ${u.studioInfo?.zoneId}`);
}
