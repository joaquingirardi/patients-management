import { Inject, Injectable } from '@nestjs/common';
import { type ListPatientsQuery, type PatientInput, type UpdatePatientInput } from '@pm/contracts';
import { Prisma } from '@prisma/client';

import { type TenantScope } from '../auth/actor';
import { DATABASE, type Database } from '../database/database';
import { fromDateOnly, PATIENT_PUBLIC_FIELDS, type PatientEntity } from './entities/patient.entity';

export type UpdateResult =
  { status: 'updated'; patient: PatientEntity } | { status: 'not_found' } | { status: 'conflict' };

/**
 * Authorization as data access: every method takes a TenantScope and every query is built on
 * `visibleIn(scope)`. There is no code path that can read or write a patient without naming the
 * organization it belongs to — a patient of another tenant is indistinguishable from one that
 * does not exist (404, never 403, so ids cannot be probed).
 */
@Injectable()
export class PatientsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async list(
    scope: TenantScope,
    query: ListPatientsQuery,
  ): Promise<{ rows: PatientEntity[]; total: number }> {
    const where: Prisma.PatientWhereInput = { ...visibleIn(scope), ...searchFilter(query.search) };

    // Two independent reads instead of a transaction: each can be retried on its own, and a
    // count that is a few milliseconds "newer" than the page is an acceptable trade-off.
    const [rows, total] = await Promise.all([
      this.db.patient.findMany({
        where,
        select: PATIENT_PUBLIC_FIELDS,
        orderBy: orderBy(query),
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      this.db.patient.count({ where }),
    ]);
    return { rows, total };
  }

  findById(scope: TenantScope, id: string): Promise<PatientEntity | null> {
    return this.db.patient.findFirst({
      where: { id, ...visibleIn(scope) },
      select: PATIENT_PUBLIC_FIELDS,
    });
  }

  create(scope: TenantScope, actorId: string, input: PatientInput): Promise<PatientEntity> {
    return this.db.patient.create({
      data: {
        ...toColumns(input),
        organizationId: scope.organizationId,
        createdById: actorId,
        updatedById: actorId,
      },
      select: PATIENT_PUBLIC_FIELDS,
    });
  }

  /**
   * Optimistic concurrency: when the client sends a version, the row is only updated if it still
   * has that version. The check and the write are one atomic SQL statement — no read-modify-write
   * race. Without a version (a plain contract `Patient` body) the update is unconditional.
   */
  async update(
    scope: TenantScope,
    actorId: string,
    id: string,
    { version, ...input }: UpdatePatientInput,
  ): Promise<UpdateResult> {
    try {
      const patient = await this.db.patient.update({
        where: { id, ...visibleIn(scope), ...(version === undefined ? {} : { version }) },
        data: { ...toColumns(input), version: { increment: 1 }, updatedById: actorId },
        select: PATIENT_PUBLIC_FIELDS,
      });
      return { status: 'updated', patient };
    } catch (error) {
      if (!isRecordNotFound(error)) throw error;
      // Zero rows matched: either it does not exist (for this tenant) or the version is stale.
      if (version === undefined) return { status: 'not_found' };
      const current = await this.findById(scope, id);
      return current ? { status: 'conflict' } : { status: 'not_found' };
    }
  }

  /** Soft delete: clinical records are retained for audit; they simply stop being visible. */
  async softDelete(scope: TenantScope, actorId: string, id: string): Promise<boolean> {
    const { count } = await this.db.patient.updateMany({
      where: { id, ...visibleIn(scope) },
      data: { deletedAt: new Date(), deletedById: actorId, version: { increment: 1 } },
    });
    return count === 1;
  }
}

function visibleIn(scope: TenantScope) {
  return {
    organizationId: scope.organizationId,
    deletedAt: null,
  } satisfies Prisma.PatientWhereInput;
}

function toColumns(input: PatientInput) {
  return { ...input, dob: fromDateOnly(input.dob) };
}

/**
 * Multi-term search: every whitespace-separated term must match first name, last name or email
 * (case-insensitive, substring). "ada love" finds Ada Lovelace. Backed by pg_trgm GIN indexes.
 */
function searchFilter(search: string | undefined): Prisma.PatientWhereInput {
  const terms = search?.split(/\s+/).filter(Boolean).slice(0, 5) ?? [];
  if (terms.length === 0) return {};
  return {
    AND: terms.map((term) => ({
      OR: (['firstName', 'lastName', 'email'] as const).map((field) => ({
        [field]: { contains: term, mode: 'insensitive' },
      })),
    })),
  };
}

/** Deterministic ordering: the trailing `id` tie-breaker keeps pages stable across requests. */
function orderBy({ sortBy, order }: ListPatientsQuery): Prisma.PatientOrderByWithRelationInput[] {
  switch (sortBy) {
    case 'lastName':
      return [{ lastName: order }, { firstName: order }, { id: order }];
    case 'firstName':
      return [{ firstName: order }, { lastName: order }, { id: order }];
    case 'dob':
      return [{ dob: order }, { id: order }];
    case 'createdAt':
      return [{ createdAt: order }, { id: order }];
  }
}

function isRecordNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025';
}
