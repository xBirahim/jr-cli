// jr-cli — cancel command
import { api } from '../api';

export function cmdCancel(id: string | undefined): void {
  if (!id) {
    console.error('Usage: node dist/index.js cancel <bookingId>');
    process.exit(1);
  }
  console.log(`Cancelling booking ${id}...`);
  const result = api<{ __error?: string }>('DELETE', `/nox/v1/calendar/${id}/cancel-for-member`);
  if (result && '__error' in result) {
    console.error('❌ Failed:', (result as { __error: string }).__error);
  } else {
    console.log('✅ Cancelled!');
  }
}
