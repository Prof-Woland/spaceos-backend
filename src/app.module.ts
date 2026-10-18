import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RolesModule } from './modules/roles/roles.module';
import { TariffsModule } from './modules/tariffs/tariffs.module';
import { ResourcesModule } from './modules/resources/resources.module';
import { ServicesModule } from './modules/services/services.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { PaymentsModule } from './modules/payments/payments.module';

@Module({
  imports: [
    ConfigModule.forRoot({ 
      isGlobal: true, 
      envFilePath: ['.env.local', '.env'] 
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    RolesModule,
    TariffsModule,
    ResourcesModule,
    ServicesModule,
    BookingsModule,
    PaymentsModule,
  ],
})
export class AppModule {}