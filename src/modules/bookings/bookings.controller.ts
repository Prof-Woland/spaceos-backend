import { Controller, Get, Post, Body, Patch, Param, UseGuards, Query } from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { JwtAuthGuard } from '../../common/guards/jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RoleName } from '../../common/constants';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Roles } from '@/common/decorators/roles.decorator';

@ApiTags('Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  create(@Body() dto: CreateBookingDto, @CurrentUser() user: any) {
    return this.bookingsService.create(dto, user.id);
  }

  @Get('my')
  findMy(@CurrentUser() user: any) {
    return this.bookingsService.findMyBookings(user.id);
  }

  @Get('resource/:id')
  getBookedSlots(@Param('id') id: string, @Query('date') date: string) {
    return this.bookingsService.getBookedSlots(+id, date);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: any) {
    const isAdmin = user.roles?.includes(RoleName.ADMIN);
    return this.bookingsService.cancel(+id, user.id, isAdmin);
  }

    @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.MANAGER)
  @Get('admin/stats')
  getStats() {
    return this.bookingsService.getAdminStats();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.MANAGER)
  @Get()
  findAll() {
    return this.bookingsService.findAll();
  };

    @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN, RoleName.MANAGER)
  @Patch('check-in/:code')
  checkIn(@Param('code') code: string) {
    return this.bookingsService.checkIn(code);
  }
}