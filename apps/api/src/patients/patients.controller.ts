import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
  Res,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Permission } from '@pm/contracts';
import type { Response } from 'express';

import { type Actor } from '../auth/actor';
import { CurrentActor } from '../auth/decorators/current-actor.decorator';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { ZodValidationPipe } from '../common/validation/zod-validation.pipe';
import {
  CreatePatientDto,
  type DeletePatientResponseDto,
  ListPatientsQueryDto,
  PatientIdParam,
  type PatientListResponseDto,
  type PatientResponseDto,
  UpdatePatientDto,
} from './dto/patient.dto';
import { PatientsService } from './patients.service';

const IdParam = new ZodValidationPipe(PatientIdParam, 'id');

/**
 * Thin by design: parse & validate input with the shared contract, declare the permission,
 * delegate to the service. No business logic lives here.
 */
@Controller('patients')
@SkipThrottle({ login: true, loginAccount: true })
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}

  @Get()
  @RequirePermissions(Permission.PatientsRead)
  list(
    @CurrentActor() actor: Actor,
    @Query(new ZodValidationPipe(ListPatientsQueryDto)) query: ListPatientsQueryDto,
  ): Promise<PatientListResponseDto> {
    return this.patients.list(actor, query);
  }

  @Get(':id')
  @RequirePermissions(Permission.PatientsRead)
  get(@CurrentActor() actor: Actor, @Param('id', IdParam) id: string): Promise<PatientResponseDto> {
    return this.patients.get(actor, id);
  }

  @Post()
  @RequirePermissions(Permission.PatientsWrite)
  async create(
    @CurrentActor() actor: Actor,
    @Body(new ZodValidationPipe(CreatePatientDto)) input: CreatePatientDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<PatientResponseDto> {
    const patient = await this.patients.create(actor, input);
    response.location(`/patients/${patient.id}`);
    return patient;
  }

  @Put(':id')
  @RequirePermissions(Permission.PatientsWrite)
  update(
    @CurrentActor() actor: Actor,
    @Param('id', IdParam) id: string,
    @Body(new ZodValidationPipe(UpdatePatientDto)) input: UpdatePatientDto,
  ): Promise<PatientResponseDto> {
    return this.patients.update(actor, id, input);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @RequirePermissions(Permission.PatientsWrite)
  remove(
    @CurrentActor() actor: Actor,
    @Param('id', IdParam) id: string,
  ): Promise<DeletePatientResponseDto> {
    return this.patients.remove(actor, id);
  }
}
