/**
 * Seeds demo data (members, events, RSVPs, posts) for local development.
 *
 * Demo rows are recognised by one identity only: the account email domain
 * `@demo.danangconnect.test` (handles carry the `demo_` prefix, event slugs the
 * `demo-` prefix). Removal is keyed on that domain, so a row that is not owned
 * by a demo account is never touched. The domain is distinct from the
 * `@example.test` range that ops/db/clean-test-data.sh removes.
 *
 * Event times are computed from the clock at run time (Asia/Ho_Chi_Minh local
 * days and hours, resolved by Postgres), so re-running always yields a feed of
 * upcoming events.
 *
 * Modes:
 *   (default)  keep existing demo accounts (upsert by email), replace every demo
 *              event/RSVP/post with a freshly dated set
 *   --reset    delete everything demo, including accounts, then seed again
 *   --purge    delete everything demo and stop
 *
 * Usage: pnpm --filter @dnc/api seed:demo [-- --reset | --purge]
 */
import '../../load-env.js';
import { Pool, type PoolClient } from 'pg';
import { hash as argonHash } from '@node-rs/argon2';
import { MyProfileResponse } from '@dnc/contracts';

const DEMO_DOMAIN = 'demo.danangconnect.test';
const DEMO_PASSWORD = 'demo-password-long-enough';
const TZ = 'Asia/Ho_Chi_Minh';
/** Database name from docker-compose.local.yml. */
const LOCAL_DB_NAME = 'dnc';

const AREA = {
  mk: 'my-khe',
  at: 'an-thuong',
  ma: 'my-an',
  hc: 'hai-chau',
  st: 'son-tra',
  nh: 'ngu-hanh-son',
} as const;
type AreaKey = keyof typeof AREA;

interface Member {
  handle: string;
  name: string;
  nationality: string;
  trust: number;
  expatType: string;
  locale: 'en' | 'vi';
  headline: string;
  bio: string;
  languages: Array<{ code: string; level: string }>;
  area: AreaKey;
  sinceYear: number;
}

const MEMBERS: Member[] = [
  { handle: 'demo_anna', name: 'Anna Schmidt', nationality: 'DE', trust: 4, expatType: 'digital_nomad', locale: 'en', headline: 'Product designer, remote', bio: 'Berlin to Da Nang in 2023. I host the weekly coffee and coworking meetups in An Thuong.', languages: [{ code: 'de', level: 'native' }, { code: 'en', level: 'fluent' }, { code: 'vi', level: 'basic' }], area: 'at', sinceYear: 2023 },
  { handle: 'demo_minh', name: 'Trần Quang Minh', nationality: 'VN', trust: 5, expatType: 'local_host', locale: 'vi', headline: 'Hướng dẫn viên leo núi Sơn Trà', bio: 'Sinh ra ở Đà Nẵng. Mình dẫn các nhóm chạy bộ và leo núi buổi sáng sớm, mọi trình độ đều được.', languages: [{ code: 'vi', level: 'native' }, { code: 'en', level: 'conversational' }], area: 'st', sinceYear: 1990 },
  { handle: 'demo_james', name: "James O'Connor", nationality: 'IE', trust: 3, expatType: 'teacher', locale: 'en', headline: 'English teacher and beach volleyball addict', bio: 'Teaching in Hai Chau, playing volleyball at My Khe every weekend. Come join, we always need one more.', languages: [{ code: 'en', level: 'native' }, { code: 'vi', level: 'conversational' }], area: 'mk', sinceYear: 2021 },
  { handle: 'demo_linh', name: 'Nguyễn Thùy Linh', nationality: 'VN', trust: 4, expatType: 'local_host', locale: 'vi', headline: 'Tổ chức giao lưu ngôn ngữ Anh - Việt', bio: 'Mình tổ chức language exchange ở Hải Châu mỗi tuần để bạn bè quốc tế và người Đà Nẵng làm quen.', languages: [{ code: 'vi', level: 'native' }, { code: 'en', level: 'fluent' }], area: 'hc', sinceYear: 1995 },
  { handle: 'demo_sofia', name: 'Sofia Marchetti', nationality: 'IT', trust: 2, expatType: 'long_term_resident', locale: 'en', headline: 'Yoga teacher', bio: 'Teaching rooftop and beach yoga around An Thuong. Italian cooking on request.', languages: [{ code: 'other', level: 'native' }, { code: 'en', level: 'fluent' }], area: 'at', sinceYear: 2020 },
  { handle: 'demo_kenji', name: 'Kenji Tanaka', nationality: 'JP', trust: 3, expatType: 'business_owner', locale: 'en', headline: 'Runs a small cafe in My An', bio: 'Pickleball organiser and amateur photographer. Cafe in My An, ask me for the secret menu.', languages: [{ code: 'ja', level: 'native' }, { code: 'en', level: 'conversational' }, { code: 'vi', level: 'conversational' }], area: 'ma', sinceYear: 2019 },
  { handle: 'demo_huong', name: 'Lê Thị Hương', nationality: 'VN', trust: 3, expatType: 'local_host', locale: 'vi', headline: 'Dạy nấu ăn món Việt', bio: 'Mình dẫn tour chợ Hàn và dạy nấu các món miền Trung cho khách quốc tế, nhóm nhỏ cho vui.', languages: [{ code: 'vi', level: 'native' }, { code: 'en', level: 'conversational' }], area: 'hc', sinceYear: 1988 },
  { handle: 'demo_mateo', name: 'Mateo García', nationality: 'ES', trust: 1, expatType: 'short_stay', locale: 'en', headline: 'Here for three months', bio: 'Salsa dancer and surfer. Looking for people to dance with and a good surf buddy.', languages: [{ code: 'es', level: 'native' }, { code: 'en', level: 'conversational' }], area: 'ma', sinceYear: 2026 },
  { handle: 'demo_emma', name: 'Emma Johnson', nationality: 'GB', trust: 2, expatType: 'digital_nomad', locale: 'en', headline: 'Writer and brunch enthusiast', bio: 'Freelance copywriter. I plan the weekend brunch crawls and full moon bonfires.', languages: [{ code: 'en', level: 'native' }], area: 'mk', sinceYear: 2024 },
  { handle: 'demo_duc', name: 'Phạm Anh Đức', nationality: 'VN', trust: 2, expatType: 'local_host', locale: 'vi', headline: 'Giáo viên tiếng Việt, mê cầu lông', bio: 'Dạy tiếng Việt cho người nước ngoài và chơi cầu lông, bóng đá tối cuối tuần ở Mỹ An.', languages: [{ code: 'vi', level: 'native' }, { code: 'en', level: 'conversational' }], area: 'ma', sinceYear: 1993 },
  { handle: 'demo_olivia', name: 'Olivia Chen', nationality: 'AU', trust: 0, expatType: 'student', locale: 'en', headline: 'Exchange student, new in town', bio: 'Just arrived. Keen to meet people and see the city beyond the tourist spots.', languages: [{ code: 'en', level: 'native' }, { code: 'zh', level: 'conversational' }], area: 'hc', sinceYear: 2026 },
  { handle: 'demo_lucas', name: 'Lucas Dubois', nationality: 'FR', trust: 1, expatType: 'digital_nomad', locale: 'en', headline: 'Backend dev, trail runner', bio: 'Remote developer, runs most mornings. Always happy to pace a slower group.', languages: [{ code: 'fr', level: 'native' }, { code: 'en', level: 'fluent' }], area: 'nh', sinceYear: 2025 },
];

/**
 * Day token: a plain number is a day offset from today (local). Named tokens
 * resolve against the current weekday so "this weekend" always exists.
 */
type Day = number | 'fri' | 'sat' | 'sun' | 'nsat' | 'nsun' | 'ABC' | 'OPEN';

interface Spec {
  key: string;
  title: string;
  desc: string;
  area: AreaKey;
  day: Day;
  time: string;
  mins: number | null;
  cap: number;
  trust: number;
  org: number;
  /** Confirmed attendees; `full` means capacity is reached. */
  fill: number | 'full';
  wait?: number;
  featured?: boolean;
  /** Member indexes forced into / kept out of the confirmed list. */
  include?: number[];
  exclude?: number[];
}

const EVENTS: Spec[] = [
  { key: 'sunrise-run-my-khe', title: 'Sunrise Run on My Khe Beach', desc: 'Easy 5-6 km along the sand and promenade, finishing with coconut coffee. All paces welcome, we regroup at each lifeguard tower.\n\nChạy bộ bình minh dọc bãi biển Mỹ Khê, kết thúc bằng cà phê dừa.', area: 'mk', day: 1, time: '05:30', mins: 60, cap: 30, trust: 0, org: 1, fill: 8 },
  { key: 'beach-volleyball-my-khe', title: 'Sunday Beach Volleyball at My Khe', desc: 'Casual 4v4 games on the sand, rotating teams every set. Bring water and sunscreen; we supply the ball and net.', area: 'mk', day: 'sun', time: '16:00', mins: 120, cap: 8, trust: 0, org: 2, fill: 'full', wait: 2, featured: true },
  { key: 'language-exchange-hai-chau', title: 'Language Exchange Night: English - Tiếng Việt', desc: 'Speak English and Vietnamese in small rotating tables, 15 minutes per language. Easy way to meet locals and travellers.\n\nGiao lưu ngôn ngữ Anh - Việt theo bàn nhỏ, đổi chỗ mỗi 15 phút.', area: 'hc', day: 0, time: '19:00', mins: 120, cap: 40, trust: 0, org: 3, fill: 9 },
  { key: 'son-tra-sunrise-hike', title: 'Son Tra Peninsula Sunrise Hike', desc: 'Guided climb up the Monkey Mountain trail to catch sunrise over the bay. Moderate difficulty, headlamp and sturdy shoes needed.', area: 'st', day: 'sat', time: '04:45', mins: 240, cap: 8, trust: 1, org: 1, fill: 'full', wait: 3, featured: true },
  { key: 'rooftop-yoga-an-thuong', title: 'Rooftop Yoga at An Thuong', desc: 'Gentle vinyasa flow on a rooftop with a view of the sea. Mats provided, suitable for beginners.', area: 'at', day: 1, time: '06:30', mins: 75, cap: 15, trust: 0, org: 4, fill: 6 },
  { key: 'pickleball-social-my-an', title: 'Pickleball Social - All Levels', desc: 'Open play with rotating partners, paddles to borrow. Great for first-timers; we explain the rules at the start.', area: 'ma', day: 0, time: '18:00', mins: 120, cap: 16, trust: 0, org: 5, fill: 7 },
  { key: 'coffee-networking-an-thuong', title: 'Cà phê sáng · Morning Coffee & Chill', desc: 'Informal morning meetup for freelancers, founders and remote employees. Introduce your project in one minute, then mingle.', area: 'at', day: 'sat', time: '09:30', mins: 120, cap: 20, trust: 0, org: 0, fill: 8 },
  { key: 'board-game-night-hai-chau', title: 'Board Game Night', desc: 'Catan, Codenames, Carcassonne and more. Beginners welcome, we teach as we go. Snacks available at the venue.', area: 'hc', day: 1, time: '19:30', mins: 180, cap: 8, trust: 0, org: 6, fill: 'full', wait: 1 },
  { key: 'home-cooking-banh-xeo', title: 'Vietnamese Home Cooking: Bánh xèo & Nem lụi', desc: 'Hands-on class cooking two central Vietnamese classics, then we eat together. Vegetarian option on request.\n\nHọc làm bánh xèo và nem lụi, sau đó cùng thưởng thức.', area: 'ma', day: 'sun', time: '10:00', mins: 180, cap: 10, trust: 2, org: 6, fill: 'full', wait: 1 },
  { key: 'beach-cleanup-my-khe', title: 'Beach Cleanup - Dọn rác bãi biển Mỹ Khê', desc: 'Gloves and bags provided. We clean one stretch of the beach together, then breakfast on us.\n\nGăng tay và túi do ban tổ chức chuẩn bị, sau đó ăn sáng cùng nhau.', area: 'mk', day: 'sat', time: '06:30', mins: 120, cap: 50, trust: 0, org: 3, fill: 11, featured: true },
  { key: 'marble-mountains-climb', title: 'Marble Mountains Morning Climb', desc: 'Climb the Thuy Son peak before the heat and crowds, with a stop at a cave pagoda. About 2 hours total.', area: 'nh', day: 'nsat', time: '06:00', mins: 180, cap: 15, trust: 0, org: 1, fill: 5 },
  { key: 'sunset-sup-non-nuoc', title: 'Sunset SUP at Non Nuoc Beach', desc: 'Stand-up paddleboarding at golden hour. Boards and life vests included, short safety briefing first.', area: 'nh', day: 'sat', time: '16:30', mins: 120, cap: 12, trust: 2, org: 2, fill: 4 },
  { key: 'startup-freelancer-meetup', title: 'Startup & Freelancer Meetup Hai Chau', desc: 'Three five-minute lightning talks followed by open networking. Founders, freelancers and curious people welcome.', area: 'hc', day: 3, time: '18:30', mins: 150, cap: 60, trust: 0, org: 0, fill: 10, featured: true },
  { key: 'salsa-social-my-an', title: 'Salsa Social Night', desc: 'Beginner lesson at 8pm, social dancing after. No partner needed, we rotate.', area: 'ma', day: 'fri', time: '20:00', mins: 150, cap: 30, trust: 0, org: 7, fill: 9 },
  { key: 'morning-yoga-flow-beach', title: 'Morning Yoga Flow on the Beach', desc: 'Sunrise hatha and breathwork on the sand. Bring a towel or mat.', area: 'mk', day: 'sun', time: '06:30', mins: 60, cap: 20, trust: 0, org: 4, fill: 7 },
  { key: 'trail-run-monkey-mountain', title: 'Trail Run: Monkey Mountain Loop', desc: 'A 12 km loop through the jungle roads of Son Tra with a few climbs. Conversational pace, no one is left behind.', area: 'st', day: 'nsun', time: '05:30', mins: 150, cap: 18, trust: 1, org: 1, fill: 6 },
  { key: 'photography-walk-dragon-bridge', title: 'Photography Walk: Dragon Bridge at Night', desc: 'Night photography along the Han River. Bring a camera or phone, tripod optional. Tips for long exposures included.', area: 'hc', day: 'fri', time: '19:30', mins: 120, cap: 8, trust: 0, org: 5, fill: 'full', wait: 2 },
  { key: 'vietnamese-beginners-class', title: 'Vietnamese for Beginners: Weekly Class', desc: 'Survival Vietnamese: greetings, ordering food, bargaining and numbers. Small group with a native teacher.\n\nLớp tiếng Việt cơ bản cho người nước ngoài.', area: 'at', day: 4, time: '18:00', mins: 90, cap: 12, trust: 0, org: 9, fill: 5 },
  { key: 'weekend-brunch-crawl', title: 'Weekend Brunch & Brew Crawl', desc: 'Three cafes, three signature drinks, and one very long brunch around An Thuong.', area: 'at', day: 'sun', time: '10:30', mins: 150, cap: 25, trust: 0, org: 8, fill: 8 },
  { key: 'son-tra-seafood-dinner', title: 'Son Tra Sunset & Seafood Dinner', desc: 'Watch the sunset from the peninsula, then a shared seafood dinner at a local favourite. Split the bill equally.\n\nNgắm hoàng hôn bán đảo Sơn Trà và ăn hải sản cùng nhau.', area: 'st', day: 'nsat', time: '17:00', mins: 180, cap: 16, trust: 2, org: 3, fill: 7 },
  { key: 'market-tour-cooking-class', title: 'Market Tour & Cooking Class', desc: 'Visit Han Market with a local chef, pick ingredients, then cook a four-dish lunch in her home kitchen.', area: 'hc', day: 8, time: '07:30', mins: 180, cap: 8, trust: 0, org: 6, fill: 'full' },
  { key: 'open-mic-acoustic-night', title: 'Open Mic & Live Acoustic Night', desc: 'Sign up on the night for a 10-minute slot: music, poetry or stand-up. Listeners very welcome.', area: 'at', day: 9, time: '20:00', mins: 150, cap: 40, trust: 0, org: 7, fill: 7 },
  { key: 'beginner-surf-lesson', title: 'Surf Lesson for Beginners', desc: 'Two-hour lesson with a certified instructor. Board and rash guard included. You should be comfortable in the water.', area: 'nh', day: 10, time: '07:00', mins: 120, cap: 10, trust: 0, org: 2, fill: 4 },
  { key: 'football-7-a-side-my-an', title: 'Football 7-a-side at My An', desc: 'Friendly 7-a-side match on a turf pitch. We split teams on arrival. Bring shin guards if you have them.', area: 'ma', day: 12, time: '18:30', mins: 120, cap: 14, trust: 0, org: 9, fill: 10 },
  { key: 'full-moon-beach-bonfire', title: 'Full Moon Beach Bonfire', desc: 'Bonfire, music and snacks on the sand. Bring a drink and a friend. Please take your rubbish home.', area: 'mk', day: 14, time: '19:00', mins: 180, cap: 35, trust: 2, org: 8, fill: 6 },
  { key: 'long-title-street-food-newcomers', title: 'Giao lưu ngôn ngữ và ẩm thực đường phố Đà Nẵng dành cho người mới đến', desc: 'A slow two-hour walk through the historic centre with street food stops and easy Vietnamese phrases to practise along the way.\n\nĐi bộ chậm quanh trung tâm, thử các món ăn đường phố và luyện vài câu tiếng Việt cơ bản.', area: 'hc', day: 16, time: '08:00', mins: 150, cap: 15, trust: 0, org: 3, fill: 5 },
  // Swipe test cases (brief S.9). Overlap trio sits on ABC_DAY, open-ended trio on OPEN_DAY.
  { key: 's9-overlap-a', title: 'Sunset Run Club: Han River Loop', desc: 'Swipe test case: 19:00-21:00, overlaps B, touches C at the boundary.', area: 'nh', day: 'ABC', time: '19:00', mins: 120, cap: 20, trust: 0, org: 2, fill: 5, exclude: [0] },
  { key: 's9-overlap-b', title: 'Trivia Night at the Rooftop Bar', desc: 'Swipe test case: 20:00-22:30, overlaps A and C. demo_anna is going.', area: 'nh', day: 'ABC', time: '20:00', mins: 150, cap: 24, trust: 0, org: 5, fill: 7, include: [0] },
  { key: 's9-overlap-c', title: 'Late Night Ramen & Chat', desc: 'Swipe test case: 21:00-22:00, touches A at the boundary, overlaps B.', area: 'ma', day: 'ABC', time: '21:00', mins: 60, cap: 12, trust: 0, org: 7, fill: 4 },
  { key: 's9-open-1900', title: 'Open Ended: Saturday Beer Garden', desc: 'Swipe test case: no end time, starts 19:00 (assumed 2 hours).', area: 'st', day: 'OPEN', time: '19:00', mins: null, cap: 20, trust: 0, org: 8, fill: 6 },
  { key: 's9-open-2030', title: 'Open Ended: Live Jazz at the Pier', desc: 'Swipe test case: no end time, starts 20:30, overlaps the 19:00 open-ended event via the 2-hour assumption.', area: 'mk', day: 'OPEN', time: '20:30', mins: null, cap: 20, trust: 0, org: 4, fill: 5 },
  { key: 's9-open-2100', title: 'Open Ended: Night Market Food Tour', desc: 'Swipe test case: no end time, starts exactly 21:00, does not overlap the 19:00 one.', area: 'hc', day: 'OPEN', time: '21:00', mins: null, cap: 15, trust: 0, org: 6, fill: 4 },
];

/** Events already underway or just finished, for the "started" badge. */
const NOW_EVENTS: Array<{ key: string; title: string; desc: string; area: AreaKey; startedMinsAgo: number; mins: number; cap: number; org: number; fill: number }> = [
  { key: 'morning-swim-my-khe', title: 'Morning Swim at My Khe', desc: 'Open-water swim with a safety kayak, 800 m out and back.', area: 'mk', startedMinsAgo: 60, mins: 120, cap: 20, org: 2, fill: 6 },
  { key: 'visa-talk-lunch-and-learn', title: 'Lunch & Learn: Vietnam Visa Options', desc: 'A practical Q&A about e-visas, visa runs and long-stay options. Not legal advice.', area: 'hc', startedMinsAgo: 120, mins: 180, cap: 25, org: 0, fill: 9 },
  { key: 'early-coffee-cowork', title: 'Early Coffee Cowork', desc: 'Two quiet hours of coworking before the day starts.', area: 'at', startedMinsAgo: 210, mins: 150, cap: 12, org: 4, fill: 5 },
];

interface PostSpec { author: number; area: AreaKey | null; kind: 'question' | 'recommendation' | 'notice' | 'looking_for'; body: string; locale: 'en' | 'vi'; minsAgo: number }
const POSTS: PostSpec[] = [
  { author: 10, area: 'hc', kind: 'question', body: 'Just arrived in Hai Chau. Where can I get a SIM card with a good data plan without queueing for an hour?', locale: 'en', minsAgo: 35 },
  { author: 0, area: 'at', kind: 'recommendation', body: 'Found a quiet coworking cafe on An Thuong 4 with fast wifi and proper desks. Weekdays before 11 are the sweet spot.', locale: 'en', minsAgo: 150 },
  { author: 1, area: 'st', kind: 'notice', body: 'Đường lên đỉnh Bàn Cờ sẽ đóng một đoạn để sửa chữa vào thứ Bảy này. Các bạn đi leo núi nên xuất phát sớm hơn 30 phút.', locale: 'vi', minsAgo: 300 },
  { author: 2, area: 'mk', kind: 'looking_for', body: 'Looking for two more players for Sunday beach volleyball at My Khe. Any level, we play from 4pm.', locale: 'en', minsAgo: 520 },
  { author: 3, area: 'hc', kind: 'recommendation', body: 'Quán bánh mì gần chợ Hàn mở từ 5h sáng, bánh mì ngon và giá hợp lý. Mình hay ghé trước khi đi làm.', locale: 'vi', minsAgo: 900 },
  { author: 8, area: null, kind: 'question', body: 'Anyone know a reliable dentist in Da Nang that speaks English? Mostly for a routine cleaning.', locale: 'en', minsAgo: 1500 },
  { author: 5, area: 'ma', kind: 'looking_for', body: 'Pickleball paddles to borrow are on the left shelf at the cafe. Looking for a regular Thursday group in My An.', locale: 'en', minsAgo: 2100 },
];

const emailOf = (handle: string): string => `${handle}@${DEMO_DOMAIN}`;

/** Deletes every demo-owned row, children first. Optionally keeps the accounts. */
async function purge(db: PoolClient, keepAccounts: boolean): Promise<Record<string, number>> {
  const removed: Record<string, number> = {};
  const run = async (label: string, sql: string): Promise<void> => {
    const r = await db.query(sql, [`%@${DEMO_DOMAIN}`]);
    removed[label] = r.rowCount ?? 0;
  };
  const demoUsers = `SELECT id FROM users WHERE email LIKE $1`;
  const demoEvents = `SELECT id FROM events WHERE organizer_id IN (${demoUsers})`;
  const demoOccs = `SELECT id FROM event_occurrences WHERE event_id IN (${demoEvents})`;
  const demoPosts = `SELECT id FROM posts WHERE author_user_id IN (${demoUsers})`;

  await run('reactions', `DELETE FROM reactions WHERE user_id IN (${demoUsers})
    OR post_id IN (${demoPosts}) OR event_id IN (${demoEvents})
    OR comment_id IN (SELECT id FROM comments WHERE user_id IN (${demoUsers}))`);
  await run('comments', `DELETE FROM comments WHERE user_id IN (${demoUsers})
    OR post_id IN (${demoPosts}) OR event_id IN (${demoEvents})`);
  await run('messages', `DELETE FROM messages WHERE sender_user_id IN (${demoUsers})
    OR conversation_id IN (SELECT id FROM conversations WHERE created_by_user_id IN (${demoUsers}))`);
  await run('conversations', `DELETE FROM conversations WHERE created_by_user_id IN (${demoUsers})`);
  await run('posts', `DELETE FROM posts WHERE author_user_id IN (${demoUsers})`);
  await run('waitlist_entries', `DELETE FROM waitlist_entries WHERE user_id IN (${demoUsers})
    OR occurrence_id IN (${demoOccs})`);
  await run('rsvps', `DELETE FROM rsvps WHERE user_id IN (${demoUsers})
    OR occurrence_id IN (${demoOccs})`);
  await run('idempotency_keys', `DELETE FROM idempotency_keys WHERE user_id IN (${demoUsers})`);
  await run('event_occurrences', `DELETE FROM event_occurrences WHERE event_id IN (${demoEvents})`);
  await run('events', `DELETE FROM events WHERE organizer_id IN (${demoUsers})`);
  if (!keepAccounts) {
    await run('media', `DELETE FROM media WHERE owner_user_id IN (${demoUsers})`);
    // profiles, auth_sessions and trust_signals cascade from users.
    await run('users', `DELETE FROM users WHERE email LIKE $1`);
  }
  return removed;
}

async function main(): Promise<void> {
  const connectionString = process.env['DATABASE_URL'];
  if (!connectionString) throw new Error('DATABASE_URL is not configured');
  // Refuse anything that is not clearly the local dev database. Reasons are
  // reported without echoing the URL, which carries the password.
  const reasons: string[] = [];
  if (process.env['NODE_ENV'] === 'production') reasons.push('NODE_ENV=production');
  let hostname = '';
  let dbName = '';
  try {
    const url = new URL(connectionString);
    hostname = url.hostname;
    dbName = decodeURIComponent(url.pathname.replace(/^\//, ''));
    if (url.searchParams.has('host') || url.searchParams.has('hostaddr')) {
      reasons.push('DATABASE_URL carries a host/hostaddr query parameter');
    }
  } catch {
    reasons.push('DATABASE_URL cannot be parsed');
  }
  if (!['localhost', '127.0.0.1'].includes(hostname)) reasons.push('host is not localhost/127.0.0.1');
  if (dbName !== LOCAL_DB_NAME && process.env['DNC_ALLOW_DEMO_SEED'] !== '1') {
    reasons.push(`database name is not "${LOCAL_DB_NAME}" (set DNC_ALLOW_DEMO_SEED=1 to allow another local database)`);
  }
  if (reasons.length > 0) {
    console.error(`seed-demo refuses to run, nothing was written: ${reasons.join('; ')}`);
    process.exit(1);
  }
  const reset = process.argv.includes('--reset');
  const purgeOnly = process.argv.includes('--purge');

  const pool = new Pool({ connectionString });
  const db = await pool.connect();
  try {
    await db.query('BEGIN');

    // Real members who RSVP'd to a demo event lose that RSVP with the event.
    const foreign = await db.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM rsvps r
         JOIN users u ON u.id = r.user_id
        WHERE u.email NOT LIKE $1
          AND r.occurrence_id IN (SELECT o.id FROM event_occurrences o JOIN events e ON e.id = o.event_id
                                   WHERE e.organizer_id IN (SELECT id FROM users WHERE email LIKE $1))`,
      [`%@${DEMO_DOMAIN}`],
    );
    console.log(`non-demo RSVPs on demo events that will be deleted: ${foreign.rows[0]?.n ?? 0}`);
    const removed = await purge(db, !reset && !purgeOnly);
    console.log('removed demo rows:', JSON.stringify(removed));
    if (purgeOnly) {
      await db.query('COMMIT');
      console.log('purge complete');
      return;
    }

    // --- areas -----------------------------------------------------------
    const areaRows = await db.query<{ id: string; slug: string }>(`SELECT id, slug FROM areas`);
    const areaId = new Map(areaRows.rows.map((r) => [r.slug, r.id]));
    for (const slug of Object.values(AREA)) {
      if (!areaId.has(slug)) throw new Error(`area ${slug} missing; run seed:areas first`);
    }

    // --- day tokens, resolved against the local calendar ------------------
    const clock = await db.query<{ dow: number }>(
      `SELECT extract(dow FROM (now() AT TIME ZONE $1)::date)::int AS dow`,
      [TZ],
    );
    const dow = clock.rows[0]?.dow ?? 0;
    const fri = (5 - dow + 7) % 7;
    const sat = (6 - dow + 7) % 7;
    const sun = (7 - dow) % 7;
    // Overlap trio: tomorrow, unless tomorrow is Saturday (then Sunday-ish day after).
    const abcDay = sat === 1 ? 2 : 1;
    // Open-ended trio: the coming Saturday evening (next week's when today is Saturday).
    const openDay = sat === 0 ? 7 : sat;
    const dayOffset = (d: Day): number =>
      typeof d === 'number'
        ? d
        : { fri, sat, sun, nsat: sat + 7, nsun: sun + 7, ABC: abcDay, OPEN: openDay }[d];

    // --- members ----------------------------------------------------------
    const passwordHash = await argonHash(DEMO_PASSWORD);
    const userIds: string[] = [];
    for (const m of MEMBERS) {
      const email = emailOf(m.handle);
      const u = await db.query<{ id: string }>(
        `INSERT INTO users (email, email_verified_at, password_hash, locale, trust_level,
                            trust_level_changed_at, status, last_active_at)
         VALUES ($1, now(), $2, $3, $4, now(), 'active', now())
         ON CONFLICT (email) WHERE deleted_at IS NULL AND email IS NOT NULL
         DO UPDATE SET password_hash = EXCLUDED.password_hash, locale = EXCLUDED.locale,
                       trust_level = EXCLUDED.trust_level, status = 'active', updated_at = now()
         RETURNING id`,
        [email, passwordHash, m.locale, m.trust],
      );
      const id = u.rows[0]?.id as string;
      userIds.push(id);
      await db.query(
        `INSERT INTO profiles (user_id, handle, display_name, headline, bio, bio_locale,
                               nationality_code, spoken_languages, expat_type, home_area_id,
                               in_da_nang_since, trust_points, events_hosted_count,
                               events_attended_count)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, make_date($11, 1, 1), $12, $13, $14)
         ON CONFLICT (user_id) DO UPDATE SET
           handle = EXCLUDED.handle, display_name = EXCLUDED.display_name,
           headline = EXCLUDED.headline, bio = EXCLUDED.bio, bio_locale = EXCLUDED.bio_locale,
           nationality_code = EXCLUDED.nationality_code, spoken_languages = EXCLUDED.spoken_languages,
           expat_type = EXCLUDED.expat_type, home_area_id = EXCLUDED.home_area_id,
           in_da_nang_since = EXCLUDED.in_da_nang_since, trust_points = EXCLUDED.trust_points,
           events_hosted_count = EXCLUDED.events_hosted_count,
           events_attended_count = EXCLUDED.events_attended_count, updated_at = now()`,
        [
          id, m.handle, m.name, m.headline, m.bio, m.locale, m.nationality,
          JSON.stringify(m.languages), m.expatType, areaId.get(AREA[m.area]),
          Math.min(m.sinceYear, 2026), m.trust * 25, m.trust * 3, m.trust * 6,
        ],
      );
    }

    // --- events -----------------------------------------------------------
    let rsvpCount = 0;
    let waitCount = 0;
    let eventIdx = 0;

    const insertEvent = async (
      s: { key: string; title: string; desc: string; area: AreaKey; cap: number; org: number; trust: number; featured?: boolean; include?: number[]; exclude?: number[] },
      startsSql: string,
      startsParams: unknown[],
      mins: number | null,
      fill: number | 'full',
      wait: number,
    ): Promise<void> => {
      const i = eventIdx++;
      const aId = areaId.get(AREA[s.area]) as string;
      // Small deterministic jitter around the area centre, biased inland (west)
      // so beachfront areas do not end up in the sea.
      const dLng = -((i * 37) % 5) * 0.0007;
      const dLat = (((i * 53) % 9) - 4) * 0.0007;
      const pt = await db.query<{ lng: number; lat: number; ok: boolean }>(
        `SELECT ST_X(c.g) AS lng, ST_Y(c.g) AS lat, ST_Covers(a.boundary, c.g::geography) AS ok
           FROM areas a,
                LATERAL (SELECT ST_SetSRID(ST_MakePoint(ST_X(a.center::geometry) + $2::float8,
                                                        ST_Y(a.center::geometry) + $3::float8), 4326) AS g) c
          WHERE a.id = $1`,
        [aId, dLng, dLat],
      );
      const covered = pt.rows[0]?.ok === true;
      const ev = await db.query<{ id: string }>(
        `INSERT INTO events (organizer_id, area_id, slug, title, description, location, status,
                             required_trust_level, is_featured)
         SELECT $1, $2, $3, $4, $5,
                CASE WHEN $8 THEN ST_SetSRID(ST_MakePoint($6::float8, $7::float8), 4326)::geography
                     ELSE center END,
                'published', $9, $10
           FROM areas WHERE id = $2
         RETURNING id`,
        [
          userIds[s.org], aId, `demo-${s.key}`, s.title, s.desc,
          pt.rows[0]?.lng, pt.rows[0]?.lat, covered, s.trust, s.featured ?? false,
        ],
      );
      const eventId = ev.rows[0]?.id as string;

      const occ = await db.query<{ id: string }>(
        `INSERT INTO event_occurrences (event_id, starts_at, ends_at, capacity)
         SELECT $1, t.s, CASE WHEN $${startsParams.length + 2}::int IS NULL THEN NULL
                              ELSE t.s + make_interval(mins => $${startsParams.length + 2}::int) END, $${startsParams.length + 3}
           FROM (SELECT ${startsSql} AS s) t
         RETURNING id`,
        [eventId, ...startsParams, mins, s.cap],
      );
      const occId = occ.rows[0]?.id as string;

      const confirmed = fill === 'full' ? s.cap : Math.min(fill, s.cap);
      const include = s.include ?? [];
      const exclude = s.exclude ?? [];
      const attendees = userIds.map((_, idx) => idx).filter((idx) => idx !== s.org && !exclude.includes(idx));
      // Rotate the attendee pool per event so the same people are not always first;
      // forced members go to the front so they are always confirmed.
      const spun = attendees.map((_, k) => attendees[(k + i) % attendees.length] as number);
      const rotated = [...include, ...spun.filter((idx) => !include.includes(idx))];
      if (confirmed + wait > rotated.length) {
        throw new Error(`event ${s.key}: not enough demo members for ${confirmed}+${wait} RSVPs`);
      }
      for (const idx of rotated.slice(0, confirmed)) {
        await db.query(`INSERT INTO rsvps (occurrence_id, user_id, status) VALUES ($1, $2, 'confirmed')`, [occId, userIds[idx]]);
        rsvpCount++;
      }
      let position = 1;
      for (const idx of rotated.slice(confirmed, confirmed + wait)) {
        await db.query(`INSERT INTO rsvps (occurrence_id, user_id, status) VALUES ($1, $2, 'waitlisted')`, [occId, userIds[idx]]);
        await db.query(`INSERT INTO waitlist_entries (occurrence_id, user_id, position) VALUES ($1, $2, $3)`, [occId, userIds[idx], position++]);
        rsvpCount++;
        waitCount++;
      }
      // Display cache only; admissions recount rsvps rows.
      await db.query(`UPDATE event_occurrences SET confirmed_count = $2 WHERE id = $1`, [occId, confirmed]);
    };

    for (const s of EVENTS) {
      // Local calendar day + local wall-clock time, converted by Postgres. A time
      // that has already passed today (or is under an hour away) moves to tomorrow.
      const startsSql = `(CASE WHEN x.t < now() + interval '1 hour' THEN x.t + interval '1 day' ELSE x.t END)
        FROM (SELECT ((((now() AT TIME ZONE '${TZ}')::date + $2::int) + $3::time) AT TIME ZONE '${TZ}') AS t) x`;
      await insertEvent(s, `(SELECT ${startsSql})`, [dayOffset(s.day), s.time], s.mins, s.fill, s.wait ?? 0);
    }
    // Starts in about 90 minutes. Late in the evening that would land after
    // midnight-ish, so it moves to 06:00 tomorrow instead and says so.
    const hourRes = await db.query<{ h: number }>(
      `SELECT extract(hour FROM now() AT TIME ZONE $1)::int AS h`,
      [TZ],
    );
    const soonLate = (hourRes.rows[0]?.h ?? 0) >= 21;
    const soon = {
      key: 's9-starts-soon', title: 'Pop-up Coffee Meetup, Starting Soon', area: 'at' as AreaKey,
      desc: 'Swipe test case: starts within about 90 minutes of seeding.', cap: 12, org: 8, trust: 0,
    };
    if (soonLate) {
      await insertEvent(soon, `(SELECT ((((now() AT TIME ZONE '${TZ}')::date + $2::int) + $3::time) AT TIME ZONE '${TZ}'))`, [1, '06:00'], 90, 4, 0);
      console.log('NOTE: local time is 21:00 or later, so the "starts in ~90 minutes" case was placed at 06:00 tomorrow. Re-run earlier in the day to get a true 90-minute case.');
    } else {
      await insertEvent(soon, `date_trunc('minute', now()) + make_interval(mins => $2::int)`, [90], 90, 4, 0);
    }
    for (const s of NOW_EVENTS) {
      await insertEvent(
        { ...s, trust: 0 },
        `now() - make_interval(mins => $2::int)`,
        [s.startedMinsAgo],
        s.mins,
        s.fill,
        0,
      );
    }

    // --- posts ------------------------------------------------------------
    for (const p of POSTS) {
      await db.query(
        `INSERT INTO posts (author_user_id, area_id, kind, body, body_locale, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, now() - make_interval(mins => $6::int), now() - make_interval(mins => $6::int))`,
        [userIds[p.author], p.area ? areaId.get(AREA[p.area]) : null, p.kind, p.body, p.locale, p.minsAgo],
      );
    }

    // Self-check: every demo profile must satisfy the contract the API serialises
    // with, otherwise /me/profile answers 500. Fails the whole seed (ROLLBACK).
    const check = MyProfileResponse.pick({
      spokenLanguages: true, expatType: true, nationalityCode: true, homeAreaId: true,
      trustLevel: true, email: true, locale: true,
    });
    const stored = await db.query<{
      handle: string; email: string; locale: string; trust_level: number; nationality_code: string | null;
      spoken_languages: unknown; expat_type: string | null; home_area_id: string | null; bio_locale: string | null;
    }>(
      `SELECT p.handle, u.email, u.locale, u.trust_level, p.nationality_code, p.spoken_languages,
              p.expat_type, p.home_area_id, p.bio_locale
         FROM profiles p JOIN users u ON u.id = p.user_id WHERE u.email LIKE $1`,
      [`%@${DEMO_DOMAIN}`],
    );
    const problems: string[] = [];
    for (const r of stored.rows) {
      const res = check.safeParse({
        spokenLanguages: r.spoken_languages, expatType: r.expat_type, nationalityCode: r.nationality_code,
        homeAreaId: r.home_area_id, trustLevel: r.trust_level, email: r.email, locale: r.locale,
      });
      if (!res.success) {
        for (const issue of res.error.issues) problems.push(`${r.handle}: ${issue.path.join('.')}: ${issue.message}`);
      }
      if (r.bio_locale !== null && !['en', 'vi'].includes(r.bio_locale)) {
        problems.push(`${r.handle}: bio_locale: ${r.bio_locale}`);
      }
    }
    if (stored.rows.length !== MEMBERS.length) problems.push(`expected ${MEMBERS.length} demo profiles, found ${stored.rows.length}`);
    if (problems.length > 0) throw new Error(`demo profiles violate the API contract:\n  ${problems.join('\n  ')}`);

    await db.query('COMMIT');

    // --- summary ------------------------------------------------------------
    const byArea = await pool.query<{ slug: string; n: number }>(
      `SELECT a.slug, count(*)::int AS n
         FROM events e JOIN areas a ON a.id = e.area_id
        WHERE e.slug LIKE 'demo-%' GROUP BY a.slug ORDER BY a.slug`,
    );
    const byTime = await pool.query<{ off: number; starts: Date }>(
      `SELECT ((o.starts_at AT TIME ZONE $1)::date - (now() AT TIME ZONE $1)::date) AS off, o.starts_at AS starts
         FROM events e JOIN event_occurrences o ON o.event_id = e.id WHERE e.slug LIKE 'demo-%'`,
      [TZ],
    );
    const buckets: Record<string, number> = { 'started/past (today)': 0, 'upcoming today': 0, tomorrow: 0, 'this weekend': 0, 'next 7 days (other)': 0, '8-21 days': 0 };
    const nowMs = Date.now();
    for (const r of byTime.rows) {
      const off = Number(r.off);
      const key =
        r.starts.getTime() <= nowMs ? 'started/past (today)'
        : off === 0 ? 'upcoming today'
        : off === 1 ? 'tomorrow'
        : off === sat || off === sun ? 'this weekend'
        : off <= 7 ? 'next 7 days (other)'
        : '8-21 days';
      buckets[key] = (buckets[key] ?? 0) + 1;
    }
    const full = await pool.query<{ n: number }>(
      `SELECT count(*)::int AS n FROM event_occurrences o JOIN events e ON e.id = o.event_id
        WHERE e.slug LIKE 'demo-%' AND o.confirmed_count >= o.capacity`,
    );

    const s9 = await pool.query<{ slug: string; starts: string; ends: string | null; anna: string | null }>(
      `SELECT e.slug,
              to_char(o.starts_at AT TIME ZONE $1, 'Dy YYYY-MM-DD HH24:MI') AS starts,
              to_char(o.ends_at AT TIME ZONE $1, 'HH24:MI') AS ends,
              (SELECT r.status::text FROM rsvps r JOIN users u ON u.id = r.user_id
                WHERE r.occurrence_id = o.id AND u.email = $2) AS anna
         FROM events e JOIN event_occurrences o ON o.event_id = e.id
        WHERE e.slug LIKE 'demo-s9-%' OR e.slug IN ('demo-coffee-networking-an-thuong', 'demo-long-title-street-food-newcomers')
           OR o.confirmed_count >= o.capacity AND e.slug LIKE 'demo-%'
        ORDER BY o.starts_at`,
      [TZ, emailOf('demo_anna')],
    );
    console.log('S.9 cases (Asia/Ho_Chi_Minh):');
    console.table(s9.rows.map((r) => ({ slug: r.slug, start: r.starts, end: r.ends ?? 'NULL', anna: r.anna ?? '-' })));
    console.log(`demo seed complete: ${MEMBERS.length} users, ${eventIdx} events, ${rsvpCount} rsvps (${waitCount} waitlisted), ${POSTS.length} posts`);
    console.log('events by area:', JSON.stringify(Object.fromEntries(byArea.rows.map((r) => [r.slug, r.n]))));
    console.log('events by time bucket:', JSON.stringify(buckets));
    console.log(`full events (waitlist demo): ${full.rows[0]?.n ?? 0}`);
    console.log(`sign in with any of ${MEMBERS.map((m) => emailOf(m.handle)).join(', ')}`);
    console.log(`shared password: ${DEMO_PASSWORD}`);
  } catch (err) {
    await db.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    db.release();
    await pool.end();
  }
}

await main();
