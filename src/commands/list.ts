// jr-cli — list command
import { CourseSlot, fetchUpcomingCourses, resolveStudioId } from '../api';
import { isJsonMode, getStudioOverride } from '../config';

export function cmdList(): void {
  const sid = resolveStudioId(getStudioOverride());
  const raw = fetchUpcomingCourses(sid);

  if ('__error' in raw || !Array.isArray(raw)) {
    console.error('API error.');
    process.exit(1);
  }

  const courses = raw as CourseSlot[];
  if (courses.length === 0) {
    console.log('No upcoming courses.');
    return;
  }

  // JSON machine output
  if (isJsonMode()) {
    console.log(JSON.stringify(courses, null, 2));
    return;
  }

  console.log('John Reed — Upcoming courses\n');

  // Group by day
  const byDay: Record<string, CourseSlot[]> = {};
  for (const c of courses) {
    const date = c.start.substring(0, 10);
    if (!byDay[date]) byDay[date] = [];
    byDay[date].push(c);
  }

  let bookedCount = 0;
  for (const [date, items] of Object.entries(byDay).sort()) {
    const day = new Date(date).toLocaleDateString('en-US', {
      weekday: 'long', day: 'numeric', month: 'long'
    });
    console.log(`\n${'═'.repeat(70)}`);
    console.log(`  ${day.toUpperCase()}`);
    console.log(`${'═'.repeat(70)}`);

    for (const c of items.sort((a, b) => a.start.localeCompare(b.start))) {
      const time = `${c.start.substring(11, 16)} → ${c.end.substring(11, 16)}`;
      const pct = c.max > 0 ? Math.round(c.booked / c.max * 10) : 0;
      const bar = '█'.repeat(pct) + '░'.repeat(10 - pct);
      const prefix = c.alreadyBooked ? '⭐' : ' ';
      const badge = c.alreadyBooked ? ' ⭐BOOKED' : '';
      const full = c.spots === 0 && !c.alreadyBooked ? ' 🔴FULL' : '';
      const cancelled = c.status === 'CANCELED' ? ' ❌CANCELLED' : '';
      const state = c.state && c.state !== 'FREE' ? ` [${c.state}]` : '';

      console.log(` ${prefix} [${c.id}] ${c.name.padEnd(24)} ${time}  ${bar} ${c.booked}/${c.max}${full}${cancelled}${badge}${state}`);
      console.log(`        ${(c.coach || '?').padEnd(20)} @ ${c.location || '?'}`);
      if (c.alreadyBooked) bookedCount++;
    }
  }

  if (bookedCount > 0) console.log(`\n⭐ ${bookedCount} course(s) booked`);
  console.log('\n💡 To book: node dist/index.js book <id>');
}
