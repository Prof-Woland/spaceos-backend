import { Body, Controller, Delete, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleName } from '../../common/constants';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UpdateRoleDto } from './dto/update-role.dto';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateTariffDto } from './dto/update-tariffs.dto';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(RoleName.ADMIN, RoleName.MANAGER)
  findAll() {
    return this.usersService.findAll();
  }

  @Patch(':id/role')
  @Roles(RoleName.ADMIN) // Только админ может менять роли
  updateRole(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    return this.usersService.updateRole(+id, dto);
  }

  @Patch('profile') // 👈 Новый эндпоинт
  updateProfile(@CurrentUser() user: any, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Patch('profile/tariff')
  updateTariff(@CurrentUser() user: any, @Body() dto: UpdateTariffDto) {
    return this.usersService.updateTariff(user.id, dto);
  }

  @Delete(':id')
  @Roles(RoleName.ADMIN)
  remove(@Param('id') id: string) {
    return this.usersService.remove(+id);
  }
}