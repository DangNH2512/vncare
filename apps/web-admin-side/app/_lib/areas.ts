import { daNangAreas } from '@dnc/geo';

import type { Locale } from './i18n';

const AREA_BY_ID = new Map(daNangAreas.map((area) => [area.id, area]));

/**
 * Display name of a launch area, or `undefined` when the id is not one of the
 * known areas. Callers render a dash in that case; a raw id is never shown.
 */
export function findAreaName(areaId: string, locale: Locale): string | undefined {
  const area = AREA_BY_ID.get(areaId);
  if (area === undefined) return undefined;
  return locale === 'vi' ? area.nameVi : area.nameEn;
}
