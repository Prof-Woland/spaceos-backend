import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateRoleDto } from './dto/update-role.dto';

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

  // 👇 Удаляем пользователя
  async remove(userId: number) {
    return this.prisma.user.delete({ where: { id: userId } });
  }

}