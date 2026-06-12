// jr-cli — book command
import { api } from '../api';

export function cmdBook(id: string | undefined): void {
  if (!id) {
    console.error('Usage: node dist/index.js book <courseId>');
    console.error('  (find IDs with: node dist/index.js list)');
    process.exit(1);
  }

  console.log(`Booking course ${id}...`);
  const result = api<Array<{ errorMessage?: string }>>('POST', '/nox/v1/calendar/bookcourse', {
    courseAppointmentId: parseInt(id, 10),
    expectedCustomerStatus: 'BOOKED',
  });

  if (Array.isArray(result)) {
    const msg = result[0]?.errorMessage || '';
    if (msg.includes('déjà réservé') || msg.includes('already booked')) {
      console.log('⚠️  Already booked!');
    } else if (msg.includes('retrouvé') || msg.includes('not found')) {
      console.error('❌ Invalid course ID. Use "list" to find IDs.');
      process.exit(1);
    } else if (msg.includes('earliest') || msg.includes('plus tôt')) {
      console.error('❌ Booking not yet open:', msg);
      process.exit(1);
    } else {
      console.error('❌', msg);
      process.exit(1);
    }
  } else if ('__error' in result) {
    console.error('❌', (result as { __error: string }).__error);
    process.exit(1);
  } else {
    console.log('✅ Booked!');
  }
}
