import type { AreaDetailResponseT, AreaResponseT } from '@dnc/contracts';
import type { AreaDetailRow, AreaRow } from './area.repository.js';

export function toAreaResponse(row: AreaRow, isMvp: boolean): AreaResponseT {
  return {
    id: row.id,
    slug: row.slug,
    nameEn: row.name_en,
    nameVi: row.name_vi,
    center:
      row.center_lat === null || row.center_lng === null
        ? null
        : { lat: row.center_lat, lng: row.center_lng },
    isMvp,
  };
}

export function toAreaDetailResponse(row: AreaDetailRow, isMvp: boolean): AreaDetailResponseT {
  const base = toAreaResponse(row, isMvp);
  return {
    id: base.id,
    slug: base.slug,
    nameEn: base.nameEn,
    nameVi: base.nameVi,
    center: base.center,
    isMvp: base.isMvp,
    boundary: {
      type: 'Polygon',
      coordinates: row.boundary.coordinates,
    },
  };
}
