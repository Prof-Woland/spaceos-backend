import { Injectable, BadRequestException, ConflictException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import * as crypto from 'crypto';

@Injectable()
export class BookingsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateBookingDto, userId: number) {
    const start = new Date(dto.startDatetime);
    const end = new Date(dto.endDatetime);

    if (start >= end) {
      throw new BadRequestException('Дата окончания должна быть позже даты начала');
    }
    if (start < new Date()) {
      throw new BadRequestException('Нельзя бронировать на прошедшее время');
    }

    // 1. Получаем пользователя с тарифом
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { tariff: true },
    });
    if (!user) throw new NotFoundException('Пользователь не найден');

    // 2. Получаем ресурс
    const resource = await this.prisma.resource.findUnique({
      where: { id: dto.resourceId },
    });
    if (!resource) throw new NotFoundException('Ресурс не найден');
    if (resource.status === 'ремонт') {
      throw new BadRequestException('Ресурс находится на ремонте');
    }

    // 3. Считаем время и базовую стоимость
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    
    // 👇 НОВАЯ ЛОГИКА: Динамическое ценообразование
    let multiplier = 1;
    const startHour = start.getHours();
    const endHour = end.getHours();

    // Утренняя скидка (-10%) с 8:00 до 11:00
    if (startHour >= 8 && endHour <= 11) {
      multiplier = 0.9;
    }
    // Пиковый тариф (+20%) вечером с 18:00 до 21:00
    else if (startHour >= 17) {
      multiplier = 1.2;
    }

    // Базовая стоимость с учетом коэффициента
    let totalCost = Number(user.tariff.pricePerHour) * durationHours * multiplier;

    // 4. Считаем доп. услуги
    const bookingServicesData: any[] = [];
    if (dto.services && dto.services.length > 0) {
      for (const s of dto.services) {
        const service = await this.prisma.service.findUnique({
          where: { id: s.serviceId },
        });
        if (!service) throw new NotFoundException(`Услуга с ID ${s.serviceId} не найдена`);
        
        totalCost += Number(service.price) * s.quantity;
        bookingServicesData.push({
          serviceId: s.serviceId,
          quantity: s.quantity,
          priceAtMoment: service.price,
        });
      }
    }

    // Округляем до 2 знаков
    totalCost = Math.round(totalCost * 100) / 100;
    const bookingCode = crypto.randomBytes(4).toString('hex').toUpperCase();

    // 5. Создаем бронь и сразу заглушку платежа
    try {
      return await this.prisma.booking.create({
        data: {
          bookingCode,
          startDatetime: start,
          endDatetime: end,
          cost: totalCost,
          userId,
          resourceId: dto.resourceId,
          status: 'активна',
          bookingServices: {
            create: bookingServicesData,
          },
          payment: {
            create: {
              amount: totalCost,
              paymentMethod: 'онлайн',
              status: 'ожидает',
            }
          }
        },
        include: {
          resource: true,
          payment: true,
          bookingServices: { include: { service: true } },
        },
      });
    } catch (e: any) {
      // 23P01 — ошибка exclusion constraint (овербукинг)
      if (e.code === '23P01') {
        throw new ConflictException('Этот ресурс уже забронирован на выбранное время');
      }
      throw e;
    }
  }

  async findMyBookings(userId: number) {
    return this.prisma.booking.findMany({
      where: { userId },
      include: {
        resource: true,
        bookingServices: { include: { service: true } },
        payment: true,
      },
      orderBy: { startDatetime: 'desc' },
    });
  }

  async cancel(id: number, userId: number, isAdmin: boolean) {
    const booking = await this.prisma.booking.findUnique({ where: { id } });
    if (!booking) throw new NotFoundException('Бронь не найдена');
    
    if (booking.userId !== userId && !isAdmin) {
      throw new ForbiddenException('Вы не можете отменить чужую бронь');
    }
    if (booking.status !== 'активна') {
      throw new BadRequestException('Можно отменить только активную бронь');
    }

    return this.prisma.booking.update({
      where: { id },
      data: { status: 'отменена' },
    });
  }

    async getBookedSlots(resourceId: number, dateString: string) {
    // Убрали Z в конце дат, чтобы время считалось локальным
    const startOfDay = new Date(`${dateString}T00:00:00`);
    const endOfDay = new Date(`${dateString}T23:59:59.999`);

    const bookings = await this.prisma.booking.findMany({
      where: {
        resourceId,
        status: 'активна',
        startDatetime: { lt: endOfDay },
        endDatetime: { gt: startOfDay },
      },
      select: { startDatetime: true, endDatetime: true },
    });
    return bookings;
  }

    async findAll() {
    return this.prisma.booking.findMany({
      include: {
        user: { select: { fullName: true, email: true } },
        resource: true,
        payment: true,
      },
      orderBy: { startDatetime: 'desc' },
    });
  };

    async getAdminStats() {
    // Получаем все брони с данными о пользователе и ресурсе
    const bookings = await this.prisma.booking.findMany({
      include: { resource: true, user: true },
    });

    const activeBookings = bookings.filter(b => b.status !== 'отменена');

    // 1. Общая выручка и количество
    const rawRevenue = activeBookings.reduce((sum, b) => sum + Number(b.cost), 0);
    const totalRevenue = Math.round(rawRevenue * 100) / 100;
    const totalBookings = bookings.length;

    // 2. Распределение по статусам
    const statusCounts = bookings.reduce((acc, b) => {
      acc[b.status] = (acc[b.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

    // 3. Топ-5 популярных ресурсов
    const resourceCounts = activeBookings.reduce((acc, b) => {
      const name = b.resource.name;
      acc[name] = (acc[name] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    const topResources = Object.entries(resourceCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // 👇 4. Выручка по дням (за последние 7 дней)
    const last7Days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i)); // От 6 дней назад до сегодня
      return d.toISOString().split('T')[0]; // Формат YYYY-MM-DD
    });

    const revenueByDay = last7Days.map(dateStr => {
      const dayBookings = activeBookings.filter(b => 
        new Date(b.startDatetime).toISOString().split('T')[0] === dateStr
      );
      const dayRevenue = dayBookings.reduce((sum, b) => sum + Number(b.cost), 0);
      
      // Форматируем дату для графика (например, "12 окт")
      const dateObj = new Date(dateStr);
      const displayDate = dateObj.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
      
      return { date: displayDate, revenue: Math.round(dayRevenue * 100) / 100 };
    });

    // 👇 5. Пиковые часы (с 8:00 до 21:00)
    const peakHoursMap = new Map<number, number>();
    for (let i = 8; i <= 21; i++) peakHoursMap.set(i, 0); // Инициализация нулями

    activeBookings.forEach(b => {
      const hour = new Date(b.startDatetime).getHours();
      if (peakHoursMap.has(hour)) {
        peakHoursMap.set(hour, peakHoursMap.get(hour)! + 1);
      }
    });

    const peakHours = Array.from(peakHoursMap.entries()).map(([hour, count]) => ({
      time: `${String(hour).padStart(2, '0')}:00`,
      count
    }));

    // 👇 6. Топ-3 клиента по тратам
    const clientStats = activeBookings.reduce((acc, b) => {
      const clientName = b.user.fullName;
      if (!acc[clientName]) acc[clientName] = { totalSpent: 0, count: 0 };
      acc[clientName].totalSpent += Number(b.cost);
      acc[clientName].count += 1;
      return acc;
    }, {} as Record<string, { totalSpent: number, count: number }>);

    const topClients = Object.entries(clientStats)
      .map(([name, data]) => ({ name, totalSpent: Math.round(data.totalSpent * 100) / 100, count: data.count }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 3);

    return {
      totalRevenue,
      totalBookings,
      statusData,
      topResources,
      revenueByDay, // 👈 Отдаем на фронт
      peakHours,    // 👈 Отдаем на фронт
      topClients    // 👈 Отдаем на фронт
    };
  }

  async checkIn(code: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { bookingCode: code },
    });

    if (!booking) throw new NotFoundException('Бронь с таким кодом не найдена');
    if (booking.status !== 'активна') throw new BadRequestException(`Эта бронь уже ${booking.status}`);

    // 👇 Возвращаем сразу объект брони
    return this.prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'завершена' },
      include: {
        user: { select: { fullName: true, email: true, phone: true } },
        resource: true,
        payment: true,
      }
    });
  }
}