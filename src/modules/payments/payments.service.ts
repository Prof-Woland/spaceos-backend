import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async pay(id: number) {
    const payment = await this.prisma.payment.findUnique({ where: { id } });
    if (!payment) throw new NotFoundException('Платеж не найден');
    
    return this.prisma.payment.update({
      where: { id },
      data: { status: 'оплачено' },
    });
  }
}