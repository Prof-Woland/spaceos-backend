import { IsArray, IsDateString, IsInt, IsOptional, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class BookingServiceDto {
  @IsInt()
  serviceId!: number;

  @IsInt()
  @Min(1)
  quantity!: number;
}

export class CreateBookingDto {
  @IsInt()
  resourceId!: number;

  @IsDateString()
  startDatetime!: string;

  @IsDateString()
  endDatetime!: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BookingServiceDto)
  services?: BookingServiceDto[];
}