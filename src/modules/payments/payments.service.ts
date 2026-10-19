import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async pay(paymentId: number, userId: number) {
    // Ищем платеж вместе с бронью, чтобы проверить владельца
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { booking: true },
    });

    if (!payment) throw new NotFoundException('Платеж не найден');
    if (payment.status === 'оплачено') {
      throw new BadRequestException('Этот платеж уже был оплачен');
    }
    if (payment.booking.userId !== userId) {
      throw new BadRequestException('Вы не можете оплатить чужую бронь');
    }

    // Меняем статус
    return this.prisma.payment.update({
      where: { id: paymentId },
      data: { status: 'оплачено' },
    });
  }
}