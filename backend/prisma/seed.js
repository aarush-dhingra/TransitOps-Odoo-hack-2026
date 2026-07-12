'use strict';

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱  Seeding database...');

  const HASH_ROUNDS = 10;

  // ─── ERP Users ─────────────────────────────────────────────────────────────

  const admin = await prisma.user.upsert({
    where: { email: 'admin@transitops.dev' },
    update: {},
    create: {
      name: 'System Admin',
      email: 'admin@transitops.dev',
      passwordHash: await bcrypt.hash('password123', HASH_ROUNDS),
      role: 'ADMIN',
    },
  });

  const fleetManager = await prisma.user.upsert({
    where: { email: 'fleet@transitops.dev' },
    update: {},
    create: {
      name: 'Arjun Sharma',
      email: 'fleet@transitops.dev',
      passwordHash: await bcrypt.hash('password123', HASH_ROUNDS),
      role: 'FLEET_MANAGER',
    },
  });

  const dispatcher = await prisma.user.upsert({
    where: { email: 'dispatch@transitops.dev' },
    update: {},
    create: {
      name: 'Priya Nair',
      email: 'dispatch@transitops.dev',
      passwordHash: await bcrypt.hash('password123', HASH_ROUNDS),
      role: 'DISPATCHER',
    },
  });

  const safetyOfficer = await prisma.user.upsert({
    where: { email: 'safety@transitops.dev' },
    update: {},
    create: {
      name: 'Ravi Kumar',
      email: 'safety@transitops.dev',
      passwordHash: await bcrypt.hash('password123', HASH_ROUNDS),
      role: 'SAFETY_OFFICER',
    },
  });

  const financialAnalyst = await prisma.user.upsert({
    where: { email: 'finance@transitops.dev' },
    update: {},
    create: {
      name: 'Sneha Patel',
      email: 'finance@transitops.dev',
      passwordHash: await bcrypt.hash('password123', HASH_ROUNDS),
      role: 'FINANCIAL_ANALYST',
    },
  });

  // Driver portal user – linked to a Driver profile below
  const driverUser = await prisma.user.upsert({
    where: { email: 'driver1@transitops.dev' },
    update: {},
    create: {
      name: 'Mohan Das',
      email: 'driver1@transitops.dev',
      passwordHash: await bcrypt.hash('password123', HASH_ROUNDS),
      role: 'DRIVER',
    },
  });

  console.log('✅  Users created');

  // ─── Vehicles ───────────────────────────────────────────────────────────────

  const truck1 = await prisma.vehicle.upsert({
    where: { registrationNumber: 'MH-12-AB-1234' },
    update: {},
    create: {
      registrationNumber: 'MH-12-AB-1234',
      make: 'Tata',
      model: 'Prima 4028.S',
      year: 2021,
      type: 'TRUCK',
      fuelType: 'DIESEL',
      tankCapacity: 300,
      currentOdometer: 54200,
      status: 'AVAILABLE',
      insuranceExpiry: new Date('2026-12-31'),
      pucExpiry: new Date('2026-09-30'),
    },
  });

  const van1 = await prisma.vehicle.upsert({
    where: { registrationNumber: 'MH-14-CD-5678' },
    update: {},
    create: {
      registrationNumber: 'MH-14-CD-5678',
      make: 'Force',
      model: 'Traveller 3700',
      year: 2022,
      type: 'VAN',
      fuelType: 'DIESEL',
      tankCapacity: 70,
      currentOdometer: 28100,
      status: 'AVAILABLE',
      insuranceExpiry: new Date('2027-03-15'),
      pucExpiry: new Date('2026-11-20'),
    },
  });

  const bus1 = await prisma.vehicle.upsert({
    where: { registrationNumber: 'DL-01-EF-9012' },
    update: {},
    create: {
      registrationNumber: 'DL-01-EF-9012',
      make: 'Ashok Leyland',
      model: 'Viking',
      year: 2020,
      type: 'BUS',
      fuelType: 'CNG',
      tankCapacity: 120,
      currentOdometer: 91500,
      status: 'MAINTENANCE',
      insuranceExpiry: new Date('2026-08-31'),
      pucExpiry: new Date('2026-07-31'),
    },
  });

  console.log('✅  Vehicles created');

  // ─── Drivers ────────────────────────────────────────────────────────────────

  // Driver with portal access – linked to driverUser
  const driver1 = await prisma.driver.upsert({
    where: { licenseNumber: 'MH2019001234' },
    update: {},
    create: {
      name: 'Mohan Das',
      phone: '9876543210',
      email: 'driver1@transitops.dev',
      licenseNumber: 'MH2019001234',
      licenseCategory: 'HMV',
      licenseExpiry: new Date('2028-06-30'),
      safetyScore: 95,
      status: 'AVAILABLE',
      userId: driverUser.id,
    },
  });

  // Driver without portal access
  const driver2 = await prisma.driver.upsert({
    where: { licenseNumber: 'DL2021005678' },
    update: {},
    create: {
      name: 'Suresh Yadav',
      phone: '9123456780',
      email: 'suresh.yadav@example.com',
      licenseNumber: 'DL2021005678',
      licenseCategory: 'LMV',
      licenseExpiry: new Date('2027-11-15'),
      safetyScore: 88,
      status: 'AVAILABLE',
    },
  });

  console.log('✅  Drivers created');

  // ─── Maintenance Schedule (oil change every 10 000 km) ──────────────────────

  await prisma.maintenanceSchedule.upsert({
    where: { id: 'seed-maint-schedule-1' },
    update: {},
    create: {
      id: 'seed-maint-schedule-1',
      vehicleId: truck1.id,
      serviceType: 'OIL_CHANGE',
      intervalKm: 10000,
      lastOdometer: 50000,
      nextDueOdometer: 60000,
    },
  });

  console.log('✅  Maintenance schedules created');

  console.log('\n🎉  Seed complete. Test accounts:');
  console.log('   fleet@transitops.dev     / password123  (Fleet Manager)');
  console.log('   dispatch@transitops.dev  / password123  (Dispatcher)');
  console.log('   safety@transitops.dev    / password123  (Safety Officer)');
  console.log('   finance@transitops.dev   / password123  (Financial Analyst)');
  console.log('   driver1@transitops.dev   / password123  (Driver portal)');

  // suppress unused-var warnings – IDs may be needed for manual testing
  void [fleetManager, dispatcher, safetyOfficer, financialAnalyst, van1, bus1, driver2];
}

main()
  .catch((err) => {
    console.error('❌  Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
