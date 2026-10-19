import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RoleName } from '../../common/constants';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email уже занят');

    const tariff = await this.prisma.tariff.findFirst();
    if (!tariff) throw new Error('В системе нет тарифов');

    const residentRole = await this.prisma.role.findUnique({
      where: { name: RoleName.RESIDENT },
    });
    if (!residentRole) throw new Error('Роль "Резидент" не найдена');

    const passwordHash = await argon2.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        tariffId: tariff.id,
        userRoles: {
          create: { roleId: residentRole.id },
        },
      },
      include: { userRoles: { include: { role: true } } },
    });

    return this.generateAuthResponse(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { userRoles: { include: { role: true } }, tariff: true },
    });

    if (!user) throw new UnauthorizedException('Неверный email или пароль');

    const isPasswordValid = await argon2.verify(user.passwordHash, dto.password);
    if (!isPasswordValid) throw new UnauthorizedException('Неверный email или пароль');

    return this.generateAuthResponse(user);
  }

  private generateAuthResponse(user: any) {
    const payload = { sub: user.id, email: user.email };
    const roles = user.userRoles.map((ur: any) => ur.role.name);

    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        roles,
        tariffId: user.tariffId,
        tariffName: user.tariff?.name || 'Базовый',
      },
    };
  }
}