import { IsIn, IsNotEmpty } from 'class-validator';

export class UpdateRoleDto {
  @IsNotEmpty()
  @IsIn(['Администратор', 'Менеджер', 'Резидент'])
  roleName!: string;
}