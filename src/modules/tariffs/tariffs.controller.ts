import { Controller, Get } from '@nestjs/common';
import { TariffsService } from './tariffs.service';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Tariffs')
@Controller('tariffs')
export class TariffsController {
  constructor(private readonly tariffsService: TariffsService) {}

  @Get()
  findAll() {
    return this.tariffsService.findAll();
  }
}