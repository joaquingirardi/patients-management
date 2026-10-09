import { ErrorCode, type ListPatientsQuery } from '@pm/contracts';

import { type Actor } from '../auth/actor';
import {
  ForbiddenError,
  NotFoundError,
  VersionConflictError,
} from '../common/errors/domain-errors';
import { type PatientEntity } from './entities/patient.entity';
import { type PatientsRepository } from './patients.repository';
import { PatientsService } from './patients.service';

const ORG = '0b8f8f62-0d0b-4d55-8a6c-8f1e0c7d2a10';
const admin: Actor = {
  userId: 'u-admin',
  organizationId: ORG,
  email: 'a@x.test',
  name: 'A',
  role: 'admin',
};
const viewer: Actor = { ...admin, userId: 'u-user', role: 'user' };

const record: PatientEntity = {
  id: '3d6f8a52-7a8e-4b1f-9a0c-1d2e3f4a5b6c',
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  phoneNumber: '+14155550132',
  dob: new Date('1990-02-28T00:00:00.000Z'),
  version: 1,
  createdAt: new Date('2026-01-01T10:00:00.000Z'),
  updatedAt: new Date('2026-01-02T10:00:00.000Z'),
};

const input = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  phoneNumber: '+14155550132',
  dob: '1990-02-28',
};

function setup() {
  const repo = {
    list: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    softDelete: jest.fn(),
  } satisfies Record<keyof PatientsRepository, jest.Mock>;
  return { repo, service: new PatientsService(repo as unknown as PatientsRepository) };
}

describe('PatientsService', () => {
  describe('list', () => {
    it('scopes the query to the actor organization and maps the envelope', async () => {
      const { repo, service } = setup();
      repo.list.mockResolvedValue({ rows: [record], total: 31 });
      const query: ListPatientsQuery = {
        page: 2,
        limit: 10,
        sortBy: 'dob',
        order: 'desc',
        search: undefined,
      };

      const result = await service.list(viewer, query);

      expect(repo.list).toHaveBeenCalledWith({ organizationId: ORG }, query);
      expect(result).toEqual({
        data: [
          {
            ...input,
            id: record.id,
            version: 1,
            createdAt: '2026-01-01T10:00:00.000Z',
            updatedAt: '2026-01-02T10:00:00.000Z',
          },
        ],
        page: 2,
        limit: 10,
        total: 31,
      });
    });
  });

  describe('get', () => {
    it('serialises dob as a plain calendar date', async () => {
      const { repo, service } = setup();
      repo.findById.mockResolvedValue(record);
      await expect(service.get(viewer, record.id)).resolves.toMatchObject({ dob: '1990-02-28' });
    });

    it('throws NotFound when the record is absent (or belongs to another tenant)', async () => {
      const { repo, service } = setup();
      repo.findById.mockResolvedValue(null);
      await expect(service.get(viewer, record.id)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('writes', () => {
    it.each([
      ['create', (s: PatientsService) => s.create(viewer, input)],
      ['update', (s: PatientsService) => s.update(viewer, record.id, { ...input, version: 1 })],
      ['remove', (s: PatientsService) => s.remove(viewer, record.id)],
    ])('%s is forbidden for the user role, before touching data', async (_, call) => {
      const { repo, service } = setup();
      await expect(call(service)).rejects.toBeInstanceOf(ForbiddenError);
      expect(repo.create).not.toHaveBeenCalled();
      expect(repo.update).not.toHaveBeenCalled();
      expect(repo.softDelete).not.toHaveBeenCalled();
    });

    it('creates on behalf of the actor, in the actor tenant', async () => {
      const { repo, service } = setup();
      repo.create.mockResolvedValue(record);
      await service.create(admin, input);
      expect(repo.create).toHaveBeenCalledWith({ organizationId: ORG }, 'u-admin', input);
    });

    it('maps a stale version to VersionConflictError', async () => {
      const { repo, service } = setup();
      repo.update.mockResolvedValue({ status: 'conflict' });
      await expect(
        service.update(admin, record.id, { ...input, version: 1 }),
      ).rejects.toMatchObject({
        code: ErrorCode.VersionConflict,
      });
      await expect(
        service.update(admin, record.id, { ...input, version: 1 }),
      ).rejects.toBeInstanceOf(VersionConflictError);
    });

    it('maps a missing record on update to NotFoundError', async () => {
      const { repo, service } = setup();
      repo.update.mockResolvedValue({ status: 'not_found' });
      await expect(
        service.update(admin, record.id, { ...input, version: 1 }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it('returns { ok: true } on delete and 404s when nothing was deleted', async () => {
      const { repo, service } = setup();
      repo.softDelete.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
      await expect(service.remove(admin, record.id)).resolves.toEqual({ ok: true });
      await expect(service.remove(admin, record.id)).rejects.toBeInstanceOf(NotFoundError);
    });
  });
});
