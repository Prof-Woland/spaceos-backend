import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as argon2 from 'argon2';
import { UpdateRoleDto } from './dto/update-role.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateTariffDto } from './dto/update-tariffs.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        registrationDate: true,
        userRoles: { include: { role: true } },
        tariff: true,
      },
    });
  }

  async updateRole(userId: number, dto: UpdateRoleDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Пользователь не найден');

    const role = await this.prisma.role.findUnique({ where: { name: dto.roleName } });
    if (!role) throw new NotFoundException('Роль не найдена');

    // Удаляем старые роли и назначаем новую (в рамках нашей системы у юзера 1 роль)
    await this.prisma.userRole.deleteMany({ where: { userId } });
    
    return this.prisma.userRole.create({
      data: { userId, roleId: role.id },
      include: { role: true }
    });
  }

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('Пользователь не найден');

    const dataToUpdate: any = {};

    if (dto.fullName) dataToUpdate.fullName = dto.fullName;
    if (dto.phone) dataToUpdate.phone = dto.phone;

    if (dto.avatar) dataToUpdate.avatar = dto.avatar; 

    // Если пользователь хочет сменить пароль
    if (dto.newPassword) {
      if (!dto.oldPassword) {
        throw new BadRequestException('Для смены пароля необходимо ввести старый пароль');
      }
      
      const isPasswordValid = await argon2.verify(user.passwordHash, dto.oldPassword);
      if (!isPasswordValid) {
        throw new BadRequestException('Неверный старый пароль');
      }

      dataToUpdate.passwordHash = await argon2.hash(dto.newPassword);
    }

    // Обновляем и возвращаем безопасные данные (без хеша пароля)
    return this.prisma.user.update({
      where: { id: userId },
      data: dataToUpdate,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        avatar: true, 
        userRoles: { include: { role: true } },
        tariff: true,
      },
    });
  }

  async updateTariff(userId: number, dto: UpdateTariffDto) {
    const tariff = await this.prisma.tariff.findUnique({ where: { id: dto.tariffId } });
    if (!tariff) throw new NotFoundException('Тариф не найден');

    return this.prisma.user.update({
      where: { id: userId },
      data: { tariffId: dto.tariffId },
      select: { id: true, fullName: true, email: true, phone: true, tariff: true, userRoles: { include: { role: true } } },
    });
  }

  // 👇 Удаляем пользователя
  async remove(userId: number) {
    return this.prisma.user.delete({ where: { id: userId } });
  }

}