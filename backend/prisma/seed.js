'use strict';

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();
const HASH_ROUNDS = 10;

async function main() {
  console.log('🌱  Seeding database...');

  // ─── Users ───────────────────────────────────────────────────────────────────

  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@gmail.com' },
    update: {},
    create: {
      name: 'Administrator',
      email: 'admin@gmail.com',
      passwordHash: await bcrypt.hash('12345678', HASH_ROUNDS),
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

  await prisma.user.upsert({
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

  const driverUser2 = await prisma.user.upsert({
    where: { email: 'driver2@transitops.dev' },
    update: {},
    create: {
      name: 'Suresh Yadav',
      email: 'driver2@transitops.dev',
      passwordHash: await bcrypt.hash('password123', HASH_ROUNDS),
      role: 'DRIVER',
    },
  });

  console.log('✅  Users created');

  // ─── Vehicles ────────────────────────────────────────────────────────────────

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
      maximumLoadCapacity: 28000,
      acquisitionCost: 4500000,
      region: 'Mumbai',
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
      maximumLoadCapacity: 1500,
      acquisitionCost: 1200000,
      region: 'Pune',
      insuranceExpiry: new Date('2027-03-15'),
      pucExpiry: new Date('2026-11-20'),
    },
  });

  // IN_SHOP – for Fleet Manager to see maintenance data
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
      status: 'IN_SHOP',
      maximumLoadCapacity: 8000,
      acquisitionCost: 3800000,
      region: 'Delhi',
      // Insurance expiring soon – triggers alert for Fleet Manager
      insuranceExpiry: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      pucExpiry: new Date('2026-07-31'),
    },
  });

  // Extra vehicle for variety in analytics
  const car1 = await prisma.vehicle.upsert({
    where: { registrationNumber: 'MH-03-GH-3456' },
    update: {},
    create: {
      registrationNumber: 'MH-03-GH-3456',
      make: 'Mahindra',
      model: 'Bolero',
      year: 2023,
      type: 'CAR',
      fuelType: 'DIESEL',
      tankCapacity: 70,
      currentOdometer: 12400,
      status: 'AVAILABLE',
      maximumLoadCapacity: 600,
      acquisitionCost: 950000,
      region: 'Mumbai',
      insuranceExpiry: new Date('2028-01-10'),
      pucExpiry: new Date('2027-06-15'),
    },
  });

  console.log('✅  Vehicles created');

  // ─── Drivers ─────────────────────────────────────────────────────────────────

  // Driver 1 – portal access, available
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

  // Driver 2 – portal access, available
  const driver2 = await prisma.driver.upsert({
    where: { licenseNumber: 'DL2021005678' },
    update: {},
    create: {
      name: 'Suresh Yadav',
      phone: '9123456780',
      email: 'driver2@transitops.dev',
      licenseNumber: 'DL2021005678',
      licenseCategory: 'LMV',
      licenseExpiry: new Date('2027-11-15'),
      safetyScore: 88,
      status: 'AVAILABLE',
      userId: driverUser2.id,
    },
  });

  // Driver 3 – no portal, license expiring within 30 days (Safety Officer alert)
  const driver3 = await prisma.driver.upsert({
    where: { licenseNumber: 'KA2018009999' },
    update: {},
    create: {
      name: 'Ramesh Babu',
      phone: '9988776655',
      email: 'ramesh.babu@example.com',
      licenseNumber: 'KA2018009999',
      licenseCategory: 'HMV',
      licenseExpiry: new Date(Date.now() + 18 * 24 * 60 * 60 * 1000), // expiring in 18 days
      safetyScore: 72,
      status: 'AVAILABLE',
    },
  });

  // Driver 4 – suspended (Safety Officer scenario)
  await prisma.driver.upsert({
    where: { licenseNumber: 'MH2020004444' },
    update: {},
    create: {
      name: 'Vikas Shetty',
      phone: '9001122334',
      email: 'vikas.shetty@example.com',
      licenseNumber: 'MH2020004444',
      licenseCategory: 'LMV',
      licenseExpiry: new Date('2027-04-30'),
      safetyScore: 40,
      status: 'SUSPENDED',
    },
  });

  console.log('✅  Drivers created');

  // ─── Maintenance schedule ────────────────────────────────────────────────────

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

  // Maintenance schedule for car1 – already overdue (triggers alert)
  await prisma.maintenanceSchedule.upsert({
    where: { id: 'seed-maint-schedule-2' },
    update: {},
    create: {
      id: 'seed-maint-schedule-2',
      vehicleId: car1.id,
      serviceType: 'TYRE_ROTATION',
      intervalKm: 10000,
      lastOdometer: 0,
      nextDueOdometer: 10000, // car1 is at 12400 – overdue
    },
  });

  console.log('✅  Maintenance schedules created');

  // ─── Maintenance log for bus1 ─────────────────────────────────────────────────

  await prisma.maintenanceLog.upsert({
    where: { id: 'seed-maint-log-1' },
    update: {},
    create: {
      id: 'seed-maint-log-1',
      vehicleId: bus1.id,
      type: 'FULL_SERVICE',
      description: 'Full engine service and brake replacement',
      date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      cost: 45000,
      odometerAtService: 91500,
      vendorName: 'Ashok Auto Works',
      vendorContact: '011-23456789',
      status: 'IN_PROGRESS',
      createdById: fleetManager.id,
    },
  });

  console.log('✅  Maintenance log created');

  // ─── Helper to create dates in the past ──────────────────────────────────────

  function daysAgo(n) { return new Date(Date.now() - n * 24 * 60 * 60 * 1000); }
  function hoursAgo(n) { return new Date(Date.now() - n * 60 * 60 * 1000); }

  // ─── Completed trips (for analytics data) ────────────────────────────────────

  const trip1 = await prisma.trip.upsert({
    where: { tripNumber: 'TRIP-0001' },
    update: {},
    create: {
      tripNumber: 'TRIP-0001',
      originAddress: 'JNPT, Nhava Sheva, Navi Mumbai',
      originLat: 18.9488,
      originLng: 72.9472,
      destinationAddress: 'Bhiwandi Warehouse, Thane',
      destinationLat: 19.2953,
      destinationLng: 73.0644,
      distanceKm: 58.4,
      cargoWeight: 12000,
      revenue: 28000,
      plannedDeparture: daysAgo(10),
      plannedArrival: daysAgo(10),
      actualDeparture: daysAgo(10),
      actualArrival: daysAgo(10),
      startOdometer: 53000,
      endOdometer: 54058,
      status: 'COMPLETED',
      vehicleId: truck1.id,
      driverId: driver1.id,
      createdById: dispatcher.id,
    },
  });

  const trip2 = await prisma.trip.upsert({
    where: { tripNumber: 'TRIP-0002' },
    update: {},
    create: {
      tripNumber: 'TRIP-0002',
      originAddress: 'Pune Station, Pune',
      originLat: 18.5204,
      originLng: 73.8567,
      destinationAddress: 'Hadapsar Industrial Estate, Pune',
      destinationLat: 18.5020,
      destinationLng: 73.9284,
      distanceKm: 11.2,
      cargoWeight: 800,
      revenue: 6500,
      plannedDeparture: daysAgo(7),
      plannedArrival: daysAgo(7),
      actualDeparture: daysAgo(7),
      actualArrival: daysAgo(7),
      startOdometer: 27500,
      endOdometer: 28100,
      status: 'COMPLETED',
      vehicleId: van1.id,
      driverId: driver2.id,
      createdById: dispatcher.id,
    },
  });

  const trip3 = await prisma.trip.upsert({
    where: { tripNumber: 'TRIP-0003' },
    update: {},
    create: {
      tripNumber: 'TRIP-0003',
      originAddress: 'Dadar, Mumbai',
      originLat: 19.0177,
      originLng: 72.8478,
      destinationAddress: 'Kalyan, Thane',
      destinationLat: 19.2437,
      destinationLng: 73.1355,
      distanceKm: 46.3,
      cargoWeight: 5000,
      revenue: 18000,
      plannedDeparture: daysAgo(5),
      plannedArrival: daysAgo(5),
      actualDeparture: daysAgo(5),
      actualArrival: daysAgo(5),
      startOdometer: 53200,
      endOdometer: 54200,
      status: 'COMPLETED',
      notes: 'Delivered ahead of schedule',
      vehicleId: truck1.id,
      driverId: driver3.id,
      createdById: dispatcher.id,
    },
  });

  // Cancelled trip (for analytics)
  await prisma.trip.upsert({
    where: { tripNumber: 'TRIP-0004' },
    update: {},
    create: {
      tripNumber: 'TRIP-0004',
      originAddress: 'Andheri East, Mumbai',
      originLat: 19.1136,
      originLng: 72.8697,
      destinationAddress: 'Vikhroli, Mumbai',
      destinationLat: 19.1075,
      destinationLng: 72.9212,
      distanceKm: 8.1,
      plannedDeparture: daysAgo(3),
      status: 'CANCELLED',
      notes: 'Customer cancelled order',
      vehicleId: van1.id,
      driverId: driver2.id,
      createdById: dispatcher.id,
    },
  });

  // DISPATCHED trip – assigned to driver1 (Mohan Das) so Driver portal can start it
  const trip5 = await prisma.trip.upsert({
    where: { tripNumber: 'TRIP-0005' },
    update: {},
    create: {
      tripNumber: 'TRIP-0005',
      originAddress: 'Chembur, Mumbai',
      originLat: 19.0619,
      originLng: 72.8996,
      destinationAddress: 'Vashi, Navi Mumbai',
      destinationLat: 19.0771,
      destinationLng: 73.0087,
      distanceKm: 14.6,
      cargoWeight: 900,
      revenue: 8000,
      plannedDeparture: new Date(Date.now() + 2 * 60 * 60 * 1000), // in 2 hours
      startOdometer: 54200,
      status: 'DISPATCHED',
      vehicleId: van1.id,
      driverId: driver1.id,
      createdById: dispatcher.id,
    },
  });

  // DRAFT trip – no vehicle/driver assigned yet (for Dispatcher to assign & dispatch)
  await prisma.trip.upsert({
    where: { tripNumber: 'TRIP-0006' },
    update: {},
    create: {
      tripNumber: 'TRIP-0006',
      originAddress: 'Kurla, Mumbai',
      originLat: 19.0726,
      originLng: 72.8794,
      destinationAddress: 'Turbhe, Navi Mumbai',
      destinationLat: 19.0633,
      destinationLng: 73.0297,
      distanceKm: 18.3,
      cargoWeight: 400,
      plannedDeparture: new Date(Date.now() + 24 * 60 * 60 * 1000), // tomorrow
      status: 'DRAFT',
      notes: 'Awaiting vehicle assignment',
      createdById: dispatcher.id,
    },
  });

  console.log('✅  Trips created');

  // Update van1 and driver1 to ON_TRIP (they are on TRIP-0005)
  await prisma.vehicle.update({ where: { id: van1.id }, data: { status: 'ON_TRIP' } });
  await prisma.driver.update({ where: { id: driver1.id }, data: { status: 'ON_TRIP' } });

  // ─── Fuel logs ───────────────────────────────────────────────────────────────

  await prisma.fuelLog.upsert({
    where: { id: 'seed-fuel-1' },
    update: {},
    create: {
      id: 'seed-fuel-1',
      vehicleId: truck1.id,
      tripId: trip1.id,
      date: daysAgo(10),
      litres: 120,
      pricePerLitre: 94.5,
      totalCost: 11340,
      odometerAtFill: 53050,
      location: 'HPCL Pump, Nhava Sheva Road',
      createdById: financialAnalyst.id,
    },
  });

  await prisma.fuelLog.upsert({
    where: { id: 'seed-fuel-2' },
    update: {},
    create: {
      id: 'seed-fuel-2',
      vehicleId: van1.id,
      tripId: trip2.id,
      date: daysAgo(7),
      litres: 35,
      pricePerLitre: 93.8,
      totalCost: 3283,
      odometerAtFill: 27510,
      location: 'Indian Oil, Pune Station Road',
      createdById: financialAnalyst.id,
    },
  });

  await prisma.fuelLog.upsert({
    where: { id: 'seed-fuel-3' },
    update: {},
    create: {
      id: 'seed-fuel-3',
      vehicleId: truck1.id,
      tripId: trip3.id,
      date: daysAgo(5),
      litres: 95,
      pricePerLitre: 95.2,
      totalCost: 9044,
      odometerAtFill: 53250,
      location: 'BPCL Pump, Dadar West',
      createdById: financialAnalyst.id,
    },
  });

  // Fuel log from last month for monthly trend in analytics
  await prisma.fuelLog.upsert({
    where: { id: 'seed-fuel-4' },
    update: {},
    create: {
      id: 'seed-fuel-4',
      vehicleId: truck1.id,
      date: daysAgo(35),
      litres: 140,
      pricePerLitre: 92.0,
      totalCost: 12880,
      odometerAtFill: 52000,
      location: 'HPCL Pump, Thane',
      createdById: financialAnalyst.id,
    },
  });

  console.log('✅  Fuel logs created');

  // ─── Expenses ────────────────────────────────────────────────────────────────

  await prisma.expense.upsert({
    where: { id: 'seed-expense-1' },
    update: {},
    create: {
      id: 'seed-expense-1',
      vehicleId: truck1.id,
      tripId: trip1.id,
      category: 'TOLL',
      amount: 850,
      date: daysAgo(10),
      description: 'Mumbai-Pune Expressway toll',
      createdById: financialAnalyst.id,
    },
  });

  await prisma.expense.upsert({
    where: { id: 'seed-expense-2' },
    update: {},
    create: {
      id: 'seed-expense-2',
      vehicleId: truck1.id,
      tripId: trip1.id,
      category: 'DRIVER_ALLOWANCE',
      amount: 500,
      date: daysAgo(10),
      description: 'Driver daily allowance',
      createdById: financialAnalyst.id,
    },
  });

  await prisma.expense.upsert({
    where: { id: 'seed-expense-3' },
    update: {},
    create: {
      id: 'seed-expense-3',
      vehicleId: van1.id,
      tripId: trip2.id,
      category: 'PARKING',
      amount: 200,
      date: daysAgo(7),
      description: 'Loading dock parking fee',
      createdById: financialAnalyst.id,
    },
  });

  await prisma.expense.upsert({
    where: { id: 'seed-expense-4' },
    update: {},
    create: {
      id: 'seed-expense-4',
      vehicleId: truck1.id,
      tripId: trip3.id,
      category: 'TOLL',
      amount: 620,
      date: daysAgo(5),
      description: 'Eastern Freeway toll',
      createdById: financialAnalyst.id,
    },
  });

  await prisma.expense.upsert({
    where: { id: 'seed-expense-5' },
    update: {},
    create: {
      id: 'seed-expense-5',
      vehicleId: bus1.id,
      category: 'OTHER',
      amount: 45000,
      date: daysAgo(2),
      description: 'Full service parts cost',
      createdById: financialAnalyst.id,
    },
  });

  // Last month expense for monthly trend
  await prisma.expense.upsert({
    where: { id: 'seed-expense-6' },
    update: {},
    create: {
      id: 'seed-expense-6',
      vehicleId: truck1.id,
      category: 'LOADING',
      amount: 3200,
      date: daysAgo(38),
      description: 'Loading crew charges',
      createdById: financialAnalyst.id,
    },
  });

  console.log('✅  Expenses created');

  // ─── Settings ────────────────────────────────────────────────────────────────

  const existingSettings = await prisma.settings.findFirst();
  if (!existingSettings) {
    await prisma.settings.create({
      data: {
        depotName: 'TransitOps Mumbai HQ',
        currency: 'INR',
        distanceUnit: 'km',
      },
    });
  }

  console.log('✅  Settings created');

  // ─── Driver portal active trip for testing ────────────────────────────────────

  console.log('\n🎉  Seed complete!');
  console.log('\n📋  Test accounts:');
  console.log('   fleet@transitops.dev     / password123  →  Fleet Manager');
  console.log('   dispatch@transitops.dev  / password123  →  Dispatcher');
  console.log('   safety@transitops.dev    / password123  →  Safety Officer');
  console.log('   finance@transitops.dev   / password123  →  Financial Analyst');
  console.log('   driver1@transitops.dev   / password123  →  Driver Portal (Mohan Das)');
  console.log('   driver2@transitops.dev   / password123  →  Driver Portal (Suresh Yadav)');
  console.log('\n🚗  Driver portal ready:');
  console.log(`   Login as driver1@transitops.dev → PATCH /api/portal/trips/${trip5.id}/start`);
  console.log('\n⚠️   Alerts seeded:');
  console.log('   - Ramesh Babu (driver) license expires in ~18 days');
  console.log('   - Ashok Leyland bus insurance expires in ~20 days');
  console.log('   - Mahindra Bolero (car1) overdue for tyre rotation (12400km / due at 10000km)');

  void [adminUser, trip5, driver3];
}

main()
  .catch((err) => {
    console.error('❌  Seed failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
