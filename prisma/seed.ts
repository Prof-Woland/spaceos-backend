import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  // 1. Роли
  const [adminRole, managerRole, residentRole] = await Promise.all([
    prisma.role.upsert({
      where: { name: 'Администратор' },
      update: {},
      create: { name: 'Администратор', description: 'Полный доступ к системе' },
    }),
    prisma.role.upsert({
      where: { name: 'Менеджер' },
      update: {},
      create: { name: 'Менеджер', description: 'Управление бронями и ресурсами' },
    }),
    prisma.role.upsert({
      where: { name: 'Резидент' },
      update: {},
      create: { name: 'Резидент', description: 'Бронирование мест и залов' },
    }),
  ]);

  // 2. Тарифы
  const hourly = await prisma.tariff.upsert({
    where: { name: 'Почасовой' },
    update: {},
    create: { name: 'Почасовой', pricePerHour: '150.00', pricePerMonth: '15000.00', description: 'Оплата по факту' },
  });
  await prisma.tariff.upsert({
    where: { name: 'Дневной' },
    update: {},
    create: { name: 'Дневной', pricePerHour: '100.00', pricePerMonth: '20000.00', description: 'Фиксированное место на день' },
  });
  await prisma.tariff.upsert({
    where: { name: 'Месячный VIP' },
    update: {},
    create: { name: 'Месячный VIP', pricePerHour: '80.00', pricePerMonth: '35000.00', description: 'Приоритетное место' },
  });

  // 3. Услуги
  const services = [
    { name: 'Печать A4', price: '5.00', description: 'Ч/б печать' },
    { name: 'Кофе-брейк', price: '250.00', description: 'Напитки и закуски' },
    { name: 'Аренда техники', price: '500.00', description: 'Прокат проектора' },
    { name: 'Уборка', price: '300.00', description: 'Доп. уборка' },
  ];
  for (const s of services) {
    await prisma.service.upsert({ where: { name: s.name }, update: {}, create: s });
  }

  // 4. Ресурсы
  const resources = [
    { resourceType: 'место', name: 'A-01', capacity: null, location: 'Зона А, 1 этаж', equipment: null },
    { resourceType: 'место', name: 'A-02', capacity: null, location: 'Зона А, 1 этаж', equipment: null },
    { resourceType: 'место', name: 'B-05', capacity: null, location: 'Зона B, 2 этаж', equipment: 'Монитор, док-станция' },
    { resourceType: 'зал', name: 'Зал «Альфа»', capacity: 8, location: 'Зона встреч, 2 этаж', equipment: 'Проектор, ВКС, доска' },
    { resourceType: 'зал', name: 'Зал «Бета»', capacity: 4, location: 'Зона встреч, 2 этаж', equipment: 'Телевизор, доска' },
  ];
  for (const r of resources) {
    const exists = await prisma.resource.findFirst({ where: { name: r.name } });
    if (!exists) await prisma.resource.create({ data: r });
  }

  // 5. Администратор
  const adminEmail = 'admin@coworking.local';
  const passwordHash = await argon2.hash('Admin123!');
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      fullName: 'Системный администратор',
      email: adminEmail,
      phone: '+7 900 000-00-00',
      passwordHash,
      tariffId: hourly.id,
    },
  });
  
    await prisma.userRole.upsert({
    where: { uq_user_roles_user_role: { userId: admin.id, roleId: adminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: adminRole.id },
  });

  console.log('✅ Seed выполнен успешно!');
  console.log(`👤 Админ: ${adminEmail} / пароль: Admin123!`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());