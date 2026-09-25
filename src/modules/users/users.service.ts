import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import { DeepPartial, QueryFailedError, Repository } from 'typeorm';
import { UserStatusEnum } from '@/common/constants/enum';
import { CreateUserDto } from './dto/create-user.dto';
import { FindUsersQueryDto } from './dto/find-users-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

const PG_UNIQUE_VIOLATION = '23505';
const EMAIL_TAKEN = 'An account with that email already exists.';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    // Checked up front for a clear error; saveUnique still covers the race
    // where two requests pass this check at the same time.
    if (await this.userRepository.exists({ where: { email: dto.email } })) {
      throw new ConflictException(EMAIL_TAKEN);
    }

    const saved = await this.saveUnique(
      this.userRepository.create({
        ...dto,
        password: await argon2.hash(dto.password),
      }),
    );

    // Re-read so the response comes from a `select: false` query and never
    // carries the password hash.
    return this.findOneOrFail(saved.id);
  }

  async findAll({ page, limit }: FindUsersQueryDto) {
    const [items, total] = await this.userRepository.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  findOne(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findOneOrFail(id: string): Promise<User> {
    const user = await this.findOne(id);
    if (!user) throw new NotFoundException('User not found');

    return user;
  }

  // The only lookup that returns the password hash; used by login.
  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();
  }

  async update(id: string, dto: UpdateUserDto): Promise<User> {
    const { password, ...rest } = dto;
    const changes: DeepPartial<User> = { ...rest };
    if (password) {
      changes.password = await argon2.hash(password);
    }

    const user = await this.userRepository.preload({ id, ...changes });
    if (!user) throw new NotFoundException('User not found');

    await this.saveUnique(user);

    return this.findOneOrFail(id);
  }

  // Soft delete: the row stays for history, and JwtStrategy rejects the
  // account's tokens from the next request on.
  async remove(id: string): Promise<void> {
    const { affected } = await this.userRepository.update(id, {
      status: UserStatusEnum.INACTIVE,
    });
    if (!affected) throw new NotFoundException('User not found');
  }

  private async saveUnique(user: User): Promise<User> {
    try {
      return await this.userRepository.save(user);
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === PG_UNIQUE_VIOLATION
      ) {
        throw new ConflictException(EMAIL_TAKEN);
      }
      throw error;
    }
  }
}
