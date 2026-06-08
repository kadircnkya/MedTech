import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  UseGuards,
  Query,
  Req,
} from '@nestjs/common';
import { MedicationService } from './medication.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@Controller('api/v1/medications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MedicationController {
  constructor(private readonly medicationService: MedicationService) {}

  // 1. Create a new medication schedule (automatically spawns future dose logs)
  @Post()
  @Roles('USER', 'DOCTOR')
  async createMedication(@Req() req: any, @Body() body: any) {
    const userId = req.user.id;
    return this.medicationService.createMedication(userId, body);
  }

  // 2. Paginated medications retrieval with filter status
  @Get()
  @Roles('USER', 'DOCTOR')
  async getMedications(
    @Req() req: any,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('active') active?: string,
  ) {
    const userId = req.user.id;
    const isActive = active === undefined ? undefined : active === 'true';
    return this.medicationService.getMedicationsByUser(userId, Number(page), Number(limit), isActive);
  }

  // 3. Mark dose log status (taken, snoozed, missed)
  @Patch('logs/:logId')
  @Roles('USER')
  async updateMedicationLog(
    @Req() req: any,
    @Param('logId') logId: string,
    @Body('status') status: 'TAKEN' | 'SNOOZED' | 'MISSED',
    @Body('takenAt') takenAt?: string,
  ) {
    const userId = req.user.id;
    return this.medicationService.updateDoseLog(userId, logId, status, takenAt);
  }
}
