import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('UsersController', () => {
  let controller: UsersController;

  const usersService = { findOneOrFail: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: usersService }],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('passes the uuid through as a string', async () => {
    usersService.findOneOrFail.mockResolvedValue({ id: 'abc' });

    await controller.findOne('abc');

    expect(usersService.findOneOrFail).toHaveBeenCalledWith('abc');
  });
});
