import { PartialType } from '@nestjs/swagger';
import { CreateResourceDto } from './create-resource.dto';
import { IsIn, IsOptional } from 'class-validator';

export class UpdateResourceDto extends PartialType(CreateResourceDto) {
  @IsOptional()
  @IsIn(['свободен', 'занят', 'ремонт'])
  status?: string;
}