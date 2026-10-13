import { Injectable, Logger } from '@nestjs/common';
import {
  type ListPatientsQuery,
  type Patient,
  type PatientInput,
  type PatientList,
  Permission,
  type UpdatePatientInput,
} from '@pm/contracts';

import { type Actor, authorize, scopeOf } from '../auth/actor';
import { NotFoundError, VersionConflictError } from '../common/errors/domain-errors';
import { toPatientResponse } from './entities/patient.entity';
import { PatientsRepository } from './patients.repository';

const RESOURCE = 'Patient';

@Injectable()
export class PatientsService {
  private readonly logger = new Logger(PatientsService.name);

  constructor(private readonly patients: PatientsRepository) {}

  async list(actor: Actor, query: ListPatientsQuery): Promise<PatientList> {
    authorize(actor, Permission.PatientsRead);
    const { rows, total } = await this.patients.list(scopeOf(actor), query);
    return { data: rows.map(toPatientResponse), page: query.page, limit: query.limit, total };
  }

  async get(actor: Actor, id: string): Promise<Patient> {
    authorize(actor, Permission.PatientsRead);
    const record = await this.patients.findById(scopeOf(actor), id);
    if (!record) throw new NotFoundError(RESOURCE, id);
    return toPatientResponse(record);
  }

  async create(actor: Actor, input: PatientInput): Promise<Patient> {
    authorize(actor, Permission.PatientsWrite);
    const record = await this.patients.create(scopeOf(actor), actor.userId, input);
    this.audit('patient.created', actor, record.id);
    return toPatientResponse(record);
  }

  async update(actor: Actor, id: string, input: UpdatePatientInput): Promise<Patient> {
    authorize(actor, Permission.PatientsWrite);
    const result = await this.patients.update(scopeOf(actor), actor.userId, id, input);
    switch (result.status) {
      case 'not_found':
        throw new NotFoundError(RESOURCE, id);
      case 'conflict':
        throw new VersionConflictError(RESOURCE, id);
      case 'updated':
        this.audit('patient.updated', actor, id);
        return toPatientResponse(result.patient);
    }
  }

  async remove(actor: Actor, id: string): Promise<{ ok: true }> {
    authorize(actor, Permission.PatientsWrite);
    const deleted = await this.patients.softDelete(scopeOf(actor), actor.userId, id);
    if (!deleted) throw new NotFoundError(RESOURCE, id);
    this.audit('patient.deleted', actor, id);
    return { ok: true };
  }

  /** Audit log entry: who did what to which record. Ids only, no patient PII. */
  private audit(event: string, actor: Actor, patientId: string): void {
    this.logger.log(
      { event, actorId: actor.userId, orgId: actor.organizationId, patientId },
      event,
    );
  }
}
