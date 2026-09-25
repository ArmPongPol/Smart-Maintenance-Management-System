import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  const authService = { me: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('looks up /me by the id from the token', async () => {
    authService.me.mockResolvedValue({ id: 'u1' });

    await controller.me('u1');

    expect(authService.me).toHaveBeenCalledWith('u1');
  });
});
