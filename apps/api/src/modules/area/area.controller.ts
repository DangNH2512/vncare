import { Controller, Get, Param, Query, SerializeOptions } from '@nestjs/common';
import { z } from 'zod';
import {
  AreaDetailResponse,
  AreaResolveQuery,
  AreaResponse,
  envelope,
  ListAreaQuery,
  type AreaResolveQueryT,
  type ListAreaQueryT,
} from '@dnc/contracts';
import { Public } from '../../common/decorators/public.decorator.js';
import { AreaService } from './area.service.js';

const AreaListEnvelope = envelope(z.array(AreaResponse));
const AreaEnvelope = envelope(AreaResponse);
const AreaDetailEnvelope = envelope(AreaDetailResponse);
const UuidParam = z.uuid();

/**
 * Reference geodata, readable without an account: the discovery filter and the
 * public event pages both need area names before anyone signs in. The list is
 * a handful of rows and unpaginated on purpose.
 */
@Controller('api/v1/areas')
export class AreaController {
  constructor(private readonly areas: AreaService) {}

  /** `?mvp=true` returns exactly the six launch areas the discovery filter shows. */
  @Public()
  @Get()
  @SerializeOptions({ schema: AreaListEnvelope })
  async list(@Query({ schema: ListAreaQuery }) query: ListAreaQueryT) {
    return { success: true, data: await this.areas.list(query) };
  }

  /** Which area covers a point. Declared before `:id` so "resolve" is never read as an id. */
  @Public()
  @Get('resolve')
  @SerializeOptions({ schema: AreaEnvelope })
  async resolve(@Query({ schema: AreaResolveQuery }) query: AreaResolveQueryT) {
    return { success: true, data: await this.areas.resolve(query) };
  }

  @Public()
  @Get(':id')
  @SerializeOptions({ schema: AreaDetailEnvelope })
  async findOne(@Param('id', { schema: UuidParam }) id: string) {
    return { success: true, data: await this.areas.findOne(id) };
  }
}
