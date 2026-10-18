import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TariffsService {
  constructor(private prisma: PrismaService) {}
  findAll() {
    return this.prisma.tariff.findMany();
  }
}