import { IsNotEmpty, IsInt } from 'class-validator';

export class UpdateTariffDto {
  @IsNotEmpty()
  @IsInt()
  tariffId!: number;
}