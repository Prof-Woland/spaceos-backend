import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  async create(userId: number, dto: CreateReviewDto) {
    // 1. Проверяем бронь
    const booking = await this.prisma.booking.findUnique({
      where: { id: dto.bookingId },
    });

    if (!booking) throw new NotFoundException('Бронь не найдена');
    if (booking.userId !== userId) throw new BadRequestException('Это не ваша бронь');
    if (booking.status !== 'завершена') {
      throw new BadRequestException('Оставить отзыв можно только после завершения брони');
    }

    // 2. Проверяем, нет ли уже отзыва
    const existingReview = await this.prisma.review.findUnique({
      where: { bookingId: dto.bookingId },
    });
    if (existingReview) throw new BadRequestException('Вы уже оставили отзыв');

    // 3. Создаем отзыв
    const review = await this.prisma.review.create({
      data: {
        userId,
        resourceId: booking.resourceId,
        bookingId: dto.bookingId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });

    // 4. Пересчитываем средний рейтинг ресурса
    const aggregate = await this.prisma.review.aggregate({
      where: { resourceId: booking.resourceId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    await this.prisma.resource.update({
      where: { id: booking.resourceId },
      data: {
        averageRating: aggregate._avg.rating || 0,
        reviewCount: aggregate._count.rating || 0,
      },
    });

    return review;
  }
}