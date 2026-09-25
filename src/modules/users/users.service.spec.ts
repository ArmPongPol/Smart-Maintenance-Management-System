import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { QueryFailedError } from 'typeorm';
import { UserStatusEnum } from '@/common/constants/enum';
import { CreateUserDto } from './dto/create-user.dto';
import { User } from './entities/user.entity';
import { UsersService } from './users.service';

const dto: CreateUserDto = {
  email: 'user@example.com',
  password: 'Str0ng!Passw0rd',
  firstName: 'Test',
  lastName: 'User',
};

const uniqueViolation = () =>
  new QueryFailedError(
    'INSERT',
    [],
    Object.assign(new Error('duplicate key'), { code: '23505' }),
  );

describe('UsersService', () => {
  let service: UsersService;

  const repo = {
    exists: jest.fn<Promise<boolean>, []>(),
    create: jest.fn((entity: Partial<User>) => entity as User),
    save: jest.fn<Promise<User>, [User]>(),
    findOne: jest.fn<Promise<User | null>, []>(),
    preload: jest.fn<Promise<User | undefined>, [Partial<User>]>(),
    update: jest.fn<Promise<{ affected?: number }>, [string, Partial<User>]>(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    repo.exists.mockResolvedValue(false);
    repo.save.mockImplementation((user) =>
      Promise.resolve({ ...user, id: 'u1' }),
    );
    repo.findOne.mockResolvedValue({ id: 'u1', email: dto.email } as User);

    const module = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: getRepositoryToken(User), useValue: repo },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  describe('create', () => {
    it('stores an argon2 hash, not the plain password', async () => {
      await service.create(dto);

      const saved = repo.save.mock.calls[0][0];
      expect(saved.password).not.toBe(dto.password);
      await expect(argon2.verify(saved.password, dto.password)).resolves.toBe(
        true,
      );
    });

    it('returns the re-read user, which has no password field', async () => {
      const result = await service.create(dto);

      expect(result).toEqual({ id: 'u1', email: dto.email });
    });

    it('rejects an email that already exists', async () => {
      repo.exists.mockResolvedValue(true);

      await expect(service.create(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
      expect(repo.save).not.toHaveBeenCalled();
    });

    it('maps a unique violation on save to ConflictException', async () => {
      repo.save.mockRejectedValue(uniqueViolation());

      await expect(service.create(dto)).rejects.toBeInstanceOf(
        ConflictException,
      );
    });
  });

  describe('update', () => {
    it('hashes a new password', async () => {
      repo.preload.mockImplementation((changes) =>
        Promise.resolve(changes as User),
      );

      await service.update('u1', { password: 'N3w!Passw0rd123' });

      const changes = repo.preload.mock.calls[0][0];
      await expect(
        argon2.verify(changes.password!, 'N3w!Passw0rd123'),
      ).resolves.toBe(true);
    });

    it('throws NotFoundException for an unknown id', async () => {
      repo.preload.mockResolvedValue(undefined);

      await expect(
        service.update('missing', { firstName: 'X' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deactivates the user instead of deleting the row', async () => {
      repo.update.mockResolvedValue({ affected: 1 });

      await service.remove('u1');

      expect(repo.update).toHaveBeenCalledWith('u1', {
        status: UserStatusEnum.INACTIVE,
      });
    });

    it('throws NotFoundException for an unknown id', async () => {
      repo.update.mockResolvedValue({ affected: 0 });

      await expect(service.remove('missing')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
