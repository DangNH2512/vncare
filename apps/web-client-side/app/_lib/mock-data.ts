import type { EventResponseT } from '@dnc/contracts';

import { AREAS, findAreaBySlug, type AreaSlug } from './areas';
import { INTL_LOCALE, type Locale } from './i18n';

/** Trust ladder T0-T5 as computed by `computeTrustLevel` in @dnc/domain. */
export type TrustLevel = 0 | 1 | 2 | 3 | 4 | 5;

/** Coarse grouping used for the feed's category chips and the card accent. */
export type EventCategory = 'sports' | 'language' | 'social' | 'outdoors' | 'wellness';

/**
 * A feed item.
 *
 * The API-owned half is `EventResponseT` verbatim, so swapping the mock array
 * for a real response requires no change in any screen. The extra fields are
 * presentation-only stand-ins for data that arrives from other endpoints
 * (host profile, pricing) or is derived server-side later.
 */
export interface MockEvent extends EventResponseT {
  areaSlug: AreaSlug;
  category: EventCategory;
  /** Vietnamese copy, kept alongside the English so layouts can be checked against real diacritics and real length. */
  titleVi: string;
  descriptionVi: string | null;
  hostName: string;
  hostTrustLevel: TrustLevel;
  /** Price per person in VND. `0` renders as the "free" label, never as "0 ₫". */
  priceVnd: number;
}

/**
 * Fixtures are anchored to the current Da Nang day so the feed always shows a
 * plausible "this week". Anchoring is day-granular, which keeps a server render
 * and its hydration identical within a request. It disappears with the mock.
 *
 * @param dayOffset - Days from today in Da Nang.
 * @param hour - Wall-clock hour in Da Nang (GMT+7), converted to UTC for storage.
 */
function daNangInstant(dayOffset: number, hour: number, minute = 0): string {
  const instant = new Date();
  instant.setUTCHours(0, 0, 0, 0);
  instant.setUTCDate(instant.getUTCDate() + dayOffset);
  instant.setUTCHours(hour - 7, minute, 0, 0);
  return instant.toISOString();
}

const AREA_ID: Readonly<Record<AreaSlug, string>> = Object.fromEntries(
  AREAS.map((area) => [area.slug, area.id]),
) as Record<AreaSlug, string>;

export const MOCK_EVENTS: readonly MockEvent[] = [
  {
    id: '7c9e6679-7425-40de-944b-e07fc1f90ae1',
    slug: 'newcomers-coffee-meetup-hai-chau',
    title: 'Newcomers coffee meetup',
    titleVi: 'Cà phê gặp gỡ người mới đến Đà Nẵng',
    description:
      'Just arrived in Da Nang? Drop in, grab a ca phe sua da and meet people who landed a few months before you. No agenda, no name tags.',
    descriptionVi:
      'Bạn vừa đến Đà Nẵng? Ghé qua, gọi một ly cà phê sữa đá và làm quen với những người đã đến trước bạn vài tháng. Không chương trình, không bảng tên.',
    areaId: AREA_ID['hai-chau'],
    areaSlug: 'hai-chau',
    category: 'social',
    lat: 16.0715,
    lng: 108.224,
    startsAt: daNangInstant(0, 18),
    endsAt: daNangInstant(0, 20),
    capacity: 24,
    seatsTaken: 19,
    status: 'published',
    requiredTrustLevel: 0,
    hostName: 'Marta Kowalski',
    hostTrustLevel: 4,
    priceVnd: 0,
    createdAt: daNangInstant(-9, 9),
  },
  {
    id: '9b2d4f18-6c31-4a5e-9d77-2f0a1b3c4d5e',
    slug: 'my-khe-sunrise-run-5k',
    title: 'My Khe beach sunrise run — 5 km easy pace',
    titleVi: 'Chạy bộ đón bình minh biển Mỹ Khê — 5 km nhẹ nhàng',
    description:
      'Flat 5 km along the shoreline at a conversational pace, finishing with a swim. We wait for everyone at the turnaround.',
    descriptionVi:
      'Chạy 5 km bằng phẳng dọc bờ biển với tốc độ vừa đủ để trò chuyện, kết thúc bằng một lần bơi. Cả nhóm chờ nhau ở điểm quay đầu.',
    areaId: AREA_ID['my-khe'],
    areaSlug: 'my-khe',
    category: 'sports',
    lat: 16.0605,
    lng: 108.247,
    startsAt: daNangInstant(1, 5, 30),
    endsAt: daNangInstant(1, 7),
    capacity: 30,
    seatsTaken: 12,
    status: 'published',
    requiredTrustLevel: 0,
    hostName: 'Trần Minh Quân',
    hostTrustLevel: 5,
    priceVnd: 0,
    createdAt: daNangInstant(-14, 8),
  },
  {
    id: 'c1f5a2b7-3e84-4d16-9a02-b8c7d6e5f4a3',
    slug: 'sunday-five-a-side-an-thuong',
    title: 'Sunday 5-a-side football at An Thuong',
    titleVi: 'Bóng đá sân 5 chiều Chủ nhật tại An Thượng',
    description:
      'Mixed-ability five-a-side on the astroturf behind An Thuong 2. Bibs provided, bring both a light and a dark shirt.',
    descriptionVi:
      'Bóng đá sân 5 dành cho mọi trình độ trên sân cỏ nhân tạo phía sau An Thượng 2. Có sẵn áo bib, bạn nhớ mang theo một áo sáng màu và một áo tối màu.',
    areaId: AREA_ID['an-thuong'],
    areaSlug: 'an-thuong',
    category: 'sports',
    lat: 16.0405,
    lng: 108.247,
    startsAt: daNangInstant(2, 17, 30),
    endsAt: daNangInstant(2, 19),
    capacity: 14,
    seatsTaken: 11,
    status: 'published',
    requiredTrustLevel: 1,
    hostName: 'Diego Ferreira',
    hostTrustLevel: 3,
    priceVnd: 80_000,
    createdAt: daNangInstant(-21, 10),
  },
  {
    id: 'd4a8e3c9-5b72-4f01-8c6d-1e2f3a4b5c6d',
    slug: 'beach-yoga-breathwork-my-khe',
    title: 'Beach yoga and breathwork',
    titleVi: 'Yoga và tập thở trên bãi biển Mỹ Khê',
    description:
      'Sixty minutes of slow vinyasa on the sand before the heat arrives, followed by fifteen minutes of guided breathing. Mats provided.',
    descriptionVi:
      'Sáu mươi phút vinyasa chậm trên cát trước khi trời nắng gắt, tiếp theo là mười lăm phút hướng dẫn thở. Có sẵn thảm tập.',
    areaId: AREA_ID['my-khe'],
    areaSlug: 'my-khe',
    category: 'wellness',
    lat: 16.0562,
    lng: 108.2478,
    startsAt: daNangInstant(2, 6, 30),
    endsAt: daNangInstant(2, 7, 45),
    capacity: 18,
    seatsTaken: 6,
    status: 'published',
    requiredTrustLevel: 0,
    hostName: 'Ngô Thanh Hà',
    hostTrustLevel: 4,
    priceVnd: 120_000,
    createdAt: daNangInstant(-6, 15),
  },
  {
    id: 'e5b9f4d0-6c83-4a12-9d7e-2f3a4b5c6d7e',
    slug: 'english-vietnamese-language-exchange',
    title: 'English–Vietnamese language exchange',
    titleVi: 'Trao đổi ngôn ngữ Anh – Việt',
    description:
      'Ninety minutes, halfway in English and halfway in Vietnamese, in rotating pairs. All levels welcome; beginners are paired with patient partners.',
    descriptionVi:
      'Chín mươi phút, một nửa bằng tiếng Anh và một nửa bằng tiếng Việt, luân phiên theo cặp. Chào đón mọi trình độ; người mới bắt đầu sẽ được ghép với bạn học kiên nhẫn.',
    areaId: AREA_ID['hai-chau'],
    areaSlug: 'hai-chau',
    category: 'language',
    lat: 16.0678,
    lng: 108.2208,
    startsAt: daNangInstant(3, 19),
    endsAt: daNangInstant(3, 20, 30),
    capacity: 20,
    seatsTaken: 20,
    status: 'published',
    requiredTrustLevel: 0,
    hostName: 'Sophie Laurent',
    hostTrustLevel: 5,
    priceVnd: 0,
    createdAt: daNangInstant(-30, 11),
  },
  {
    id: 'f6c0a5e1-7d94-4b23-8e8f-3a4b5c6d7e8f',
    slug: 'board-game-night-my-an',
    title: 'Board game night at My An',
    titleVi: 'Đêm boardgame tại Mỹ An',
    description:
      'Two tables running in parallel: one light and social, one for the three-hour strategy crowd. The fee covers the table and snacks.',
    descriptionVi:
      'Hai bàn chơi song song: một bàn nhẹ nhàng để giao lưu, một bàn dành cho nhóm chiến thuật chơi ba tiếng. Phí đã bao gồm tiền bàn và đồ ăn nhẹ.',
    areaId: AREA_ID['my-an'],
    areaSlug: 'my-an',
    category: 'social',
    lat: 16.0362,
    lng: 108.2432,
    startsAt: daNangInstant(4, 19, 30),
    endsAt: daNangInstant(4, 22, 30),
    capacity: 16,
    seatsTaken: 7,
    status: 'published',
    requiredTrustLevel: 0,
    hostName: 'Kenji Watanabe',
    hostTrustLevel: 2,
    priceVnd: 50_000,
    createdAt: daNangInstant(-4, 20),
  },
  {
    id: 'a7d1b6f2-8e05-4c34-9f90-4b5c6d7e8f90',
    slug: 'son-tra-sunrise-hike',
    title: 'Son Tra peninsula sunrise hike',
    titleVi: 'Leo núi ngắm bình minh bán đảo Sơn Trà',
    description:
      'A steep 7 km out-and-back that starts in the dark. Head torch and 2 litres of water are mandatory; we turn back together at 07:30.',
    descriptionVi:
      'Cung đường dốc 7 km đi và về, khởi hành khi trời còn tối. Bắt buộc mang đèn đội đầu và 2 lít nước; cả nhóm cùng quay về lúc 07:30.',
    areaId: AREA_ID['son-tra'],
    areaSlug: 'son-tra',
    category: 'outdoors',
    lat: 16.1006,
    lng: 108.279,
    startsAt: daNangInstant(5, 4, 45),
    endsAt: daNangInstant(5, 9),
    capacity: 12,
    seatsTaken: 9,
    status: 'published',
    requiredTrustLevel: 2,
    hostName: 'Lucas Meyer',
    hostTrustLevel: 5,
    priceVnd: 0,
    createdAt: daNangInstant(-12, 7),
  },
  {
    id: 'b8e2c7a3-9f16-4d45-8a01-5c6d7e8f9012',
    slug: 'marble-mountains-photo-walk',
    title: 'Marble Mountains photo walk',
    titleVi: 'Dạo bộ chụp ảnh Ngũ Hành Sơn',
    description:
      'Golden-hour walk through the caves and up to the viewpoint. Any camera, phones included; we stop often and nobody is rushed.',
    descriptionVi:
      'Đi dạo vào giờ hoàng hôn qua các hang động và lên đài quan sát. Máy ảnh nào cũng được, kể cả điện thoại; cả nhóm dừng chân thường xuyên và không ai bị giục.',
    areaId: AREA_ID['ngu-hanh-son'],
    areaSlug: 'ngu-hanh-son',
    category: 'outdoors',
    lat: 16.0025,
    lng: 108.263,
    startsAt: daNangInstant(6, 15),
    endsAt: daNangInstant(6, 18),
    capacity: 10,
    seatsTaken: 4,
    status: 'published',
    requiredTrustLevel: 0,
    hostName: 'Phạm Bảo Ngọc',
    hostTrustLevel: 3,
    priceVnd: 0,
    createdAt: daNangInstant(-3, 13),
  },
];

/** Seats still bookable. Never negative, so an over-count never renders as "-2 seats left". */
export function seatsLeft(event: Pick<MockEvent, 'capacity' | 'seatsTaken'>): number {
  return Math.max(0, event.capacity - event.seatsTaken);
}

export function isFull(event: Pick<MockEvent, 'capacity' | 'seatsTaken'>): boolean {
  return seatsLeft(event) === 0;
}

/** True once fewer than a fifth of the seats remain — the threshold for the "almost full" badge. */
export function isAlmostFull(event: Pick<MockEvent, 'capacity' | 'seatsTaken'>): boolean {
  const left = seatsLeft(event);
  return left > 0 && left <= Math.ceil(event.capacity * 0.2);
}

/** Localised title. Falls back to the English field, which is always populated. */
export function eventTitle(event: MockEvent, locale: Locale): string {
  return locale === 'vi' && event.titleVi !== '' ? event.titleVi : event.title;
}

export function eventDescription(event: MockEvent, locale: Locale): string | null {
  return locale === 'vi' ? event.descriptionVi : event.description;
}

/** Renders VND without decimals; a zero price is the caller's cue to show the "free" label instead. */
export function formatPriceVnd(priceVnd: number, locale: Locale): string {
  return new Intl.NumberFormat(INTL_LOCALE[locale], {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(priceVnd);
}

export function eventsInArea(slug: AreaSlug): readonly MockEvent[] {
  return MOCK_EVENTS.filter((event) => event.areaSlug === slug);
}

export function findEventBySlug(slug: string): MockEvent | undefined {
  return MOCK_EVENTS.find((event) => event.slug === slug);
}

/** Feed order: soonest first, which is how a user scanning for tonight reads it. */
export function eventsByStartTime(
  events: readonly MockEvent[] = MOCK_EVENTS,
): readonly MockEvent[] {
  return [...events].sort((a, b) => a.startsAt.localeCompare(b.startsAt));
}

export { findAreaBySlug };
