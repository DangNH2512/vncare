import { Module } from '@nestjs/common';
import { ReportController } from './report.controller.js';
import { ReportRepository } from './report.repository.js';
import { ReportService } from './report.service.js';

@Module({
  controllers: [ReportController],
  providers: [ReportService, ReportRepository],
})
export class ReportModule {}
