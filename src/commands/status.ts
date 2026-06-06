// jr-cli — status command
import { CourseSlot, fetchUpcomingCourses, resolveStudioId } from '../api';
import { getStudioOverride } from '../config';

export function cmdStatus(): void {
  const sid = resolveStudioId(getStudioOverride());
  console.log('Your bookings...\n');

  const raw = fetchUpcomingCourses(sid);
  if ('__error' in raw || !Array.isArray(raw)) {
    console.error('API error.');
    process.exit(1);
  }

  const courses = raw as CourseSlot[];
  let found = 0;
  for (const c of courses) {
    if (!c.alreadyBooked) continue;
    found++;
    console.log(`⭐ [${c.id}] ${c.name}`);
    console.log(`   ${c.start.substring(0, 16)} → ${c.end.substring(11, 16)}`);
    if (c.coach || c.location) {
      console.log(`   ${c.coach || ''} @ ${c.location || ''}`);
    }
    console.log();
  }

  if (!found) console.log('  No bookings found.');
  console.log('💡 Cancel: node dist/index.js cancel <id>');
}
