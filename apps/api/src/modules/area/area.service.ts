import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  AreaDetailResponseT,
  AreaResolveQueryT,
  AreaResponseT,
  ListAreaQueryT,
} from '@dnc/contracts';
import { daNangAreas } from '@dnc/geo';
import { toAreaDetailResponse, toAreaResponse } from './area.mapper.js';
import { AreaRepository } from './area.repository.js';

/**
 * The launch set is whatever @dnc/geo ships as the six MVP polygons. The table
 * may hold more rows once the hierarchy is filled in (S2-DoD-6), but discovery
 * only exposes these; reading the ids from the geodata keeps one source of
 * truth instead of a second hand-kept list here.
 */
const MVP_AREA_IDS: ReadonlySet<string> = new Set(daNangAreas.map((a) => a.id));

@Injectable()
export class AreaService {
  constructor(private readonly areas: AreaRepository) {}

  async list(query: ListAreaQueryT): Promise<AreaResponseT[]> {
    const rows = await this.areas.list(query.mvp ? [...MVP_AREA_IDS] : null);
    const mapped = rows.map((row) => toAreaResponse(row, MVP_AREA_IDS.has(row.id)));
    return query.mvp === false ? mapped.filter((a) => !a.isMvp) : mapped;
  }

  async findOne(id: string): Promise<AreaDetailResponseT> {
    const row = await this.areas.findById(id);
    if (!row) {
      throw new NotFoundException({ code: 'AREA_NOT_FOUND', messageKey: 'errors.area.notFound' });
    }
    return toAreaDetailResponse(row, MVP_AREA_IDS.has(row.id));
  }

  async resolve(query: AreaResolveQueryT): Promise<AreaResponseT> {
    const row = await this.areas.findCovering(query.lat, query.lng);
    if (!row) {
      throw new NotFoundException({
        code: 'AREA_OUTSIDE_COVERAGE',
        messageKey: 'errors.area.outsideCoverage',
      });
    }
    return toAreaResponse(row, MVP_AREA_IDS.has(row.id));
  }
}
