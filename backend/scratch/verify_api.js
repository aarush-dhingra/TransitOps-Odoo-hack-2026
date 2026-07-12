'use strict';

const app = require('../src/app');
const prisma = require('../src/utils/prisma');

async function runTests() {
  console.log('Starting API Integration Tests...');

  const req = async (path, method = 'GET', body = null, token = null) => {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
      method,
      headers,
    };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const res = await fetch(`http://localhost:3001/api${path}`, options);
    let data = null;
    if (res.status !== 204) {
      data = await res.json();
    }
    return { status: res.status, data };
  };

  console.log('\n--- 1. Login Tests ---');
  
  const dispatchLogin = await req('/auth/login', 'POST', {
    email: 'dispatch@transitops.dev',
    password: 'password123',
  });
  if (dispatchLogin.status !== 200 || !dispatchLogin.data.success) {
    throw new Error('Failed to log in as Dispatcher');
  }
  const dispatcherToken = dispatchLogin.data.data.token;
  console.log('Dispatcher login success');

  const driverLogin = await req('/auth/login', 'POST', {
    email: 'driver1@transitops.dev',
    password: 'password123',
  });
  if (driverLogin.status !== 200 || !driverLogin.data.success) {
    throw new Error('Failed to log in as Driver');
  }
  const driverToken = driverLogin.data.data.token;
  const driverId = driverLogin.data.data.user.driverId;
  if (!driverId) {
    throw new Error('Driver token payload is missing driverId');
  }
  console.log('Driver login success, driverId:', driverId);

  const fleetLogin = await req('/auth/login', 'POST', {
    email: 'fleet@transitops.dev',
    password: 'password123',
  });
  if (fleetLogin.status !== 200 || !fleetLogin.data.success) {
    throw new Error('Failed to log in as Fleet Manager');
  }
  const fleetManagerToken = fleetLogin.data.data.token;
  console.log('Fleet Manager login success');

  const financeLogin = await req('/auth/login', 'POST', {
    email: 'finance@transitops.dev',
    password: 'password123',
  });
  if (financeLogin.status !== 200 || !financeLogin.data.success) {
    throw new Error('Failed to log in as Financial Analyst');
  }
  const financeToken = financeLogin.data.data.token;
  console.log('Financial Analyst login success');

  const adminLogin = await req('/auth/login', 'POST', {
    email: 'admin@gmail.com',
    password: '12345678',
  });
  if (adminLogin.status !== 200 || !adminLogin.data.success) {
    throw new Error('Failed to log in as Admin');
  }
  const adminToken = adminLogin.data.data.token;
  console.log('Admin login success');

  const adminGetUsers = await req('/admin/users', 'GET', null, adminToken);
  if (adminGetUsers.status !== 200 || !adminGetUsers.data.success) {
    throw new Error('Admin failed to get users');
  }
  console.log('Admin get users success');

  const createEmployeeRes = await req('/admin/users', 'POST', {
    name: 'Created Employee',
    email: 'created_emp@transitops.dev',
    password: 'password123',
    role: 'DISPATCHER',
  }, adminToken);
  if (createEmployeeRes.status !== 201 || !createEmployeeRes.data.success) {
    throw new Error('Admin failed to create employee');
  }
  const createdEmpId = createEmployeeRes.data.data.id;
  console.log('Admin create employee success');

  const empLogin = await req('/auth/login', 'POST', {
    email: 'created_emp@transitops.dev',
    password: 'password123',
  });
  if (empLogin.status !== 200 || !empLogin.data.success) {
    throw new Error('Created employee failed to log in');
  }
  console.log('Created employee login success');

  const deleteEmpRes = await req(`/admin/users/${createdEmpId}`, 'DELETE', null, adminToken);
  if (deleteEmpRes.status !== 204) {
    throw new Error('Admin failed to delete employee');
  }
  console.log('Admin delete employee success');

  const adminGetTripsRes = await req('/trips', 'GET', null, adminToken);
  if (adminGetTripsRes.status !== 200 || !adminGetTripsRes.data.success) {
    throw new Error('Admin failed to access trips endpoint');
  }
  console.log('Admin access trips success');

  const truck = await prisma.vehicle.findFirst({ where: { registrationNumber: 'MH-12-AB-1234' } });
  const driverRecord = await prisma.driver.findFirst({ where: { id: driverId } });

  console.log(`Using Vehicle: ${truck.registrationNumber} (ID: ${truck.id}, Status: ${truck.status})`);
  console.log(`Using Driver: ${driverRecord.name} (ID: ${driverRecord.id}, Status: ${driverRecord.status})`);

  await prisma.vehicle.update({ where: { id: truck.id }, data: { status: 'AVAILABLE', currentOdometer: 50000 } });
  await prisma.driver.update({ where: { id: driverRecord.id }, data: { status: 'AVAILABLE' } });

  console.log('\n--- 2. Trips CRUD ---');
  
  const tripBody = {
    originAddress: 'Source Location',
    originLat: 18.5204,
    originLng: 73.8567,
    destinationAddress: 'Destination Location',
    destinationLat: 19.0760,
    destinationLng: 72.8777,
    distanceKm: 150,
    plannedDeparture: new Date(Date.now() + 86400000).toISOString(),
    plannedArrival: new Date(Date.now() + 86400000 + 14400000).toISOString(),
    vehicleId: truck.id,
    driverId: driverRecord.id,
    notes: 'Important cargo',
  };

  const createTripRes = await req('/trips', 'POST', tripBody, dispatcherToken);
  if (createTripRes.status !== 201 || !createTripRes.data.success) {
    throw new Error(`Failed to create trip: ${JSON.stringify(createTripRes.data)}`);
  }
  const tripId1 = createTripRes.data.data.id;
  const tripNumber1 = createTripRes.data.data.tripNumber;
  console.log(`Created trip 1: ${tripNumber1} (ID: ${tripId1}, Status: ${createTripRes.data.data.status})`);

  const createTrip2Res = await req('/trips', 'POST', {
    ...tripBody,
    notes: 'Secondary trip',
  }, dispatcherToken);
  if (createTrip2Res.status !== 201) {
    throw new Error('Failed to create secondary trip while driver/vehicle are AVAILABLE');
  }
  const tripId2 = createTrip2Res.data.data.id;
  console.log('Created trip 2 (double booking is allowed when PENDING)');

  const getTripsRes = await req(`/trips?status=DRAFT&vehicleId=${truck.id}`, 'GET', null, dispatcherToken);
  if (getTripsRes.status !== 200 || getTripsRes.data.data.length < 2) {
    throw new Error('Failed to query trips with filters');
  }
  console.log(`GET /trips paginated query returned ${getTripsRes.data.data.length} trips`);

  console.log('\n--- 3. State Transitions & Dispatch ---');

  const dispatchRes = await req(`/trips/${tripId1}/dispatch`, 'PATCH', null, dispatcherToken);
  if (dispatchRes.status !== 200 || dispatchRes.data.data.status !== 'DISPATCHED') {
    throw new Error(`Failed to dispatch trip: ${JSON.stringify(dispatchRes.data)}`);
  }
  console.log('Dispatched trip 1 successfully');

  const dbVehicleAfterDispatch = await prisma.vehicle.findUnique({ where: { id: truck.id } });
  const dbDriverAfterDispatch = await prisma.driver.findUnique({ where: { id: driverRecord.id } });
  if (dbVehicleAfterDispatch.status !== 'ON_TRIP' || dbDriverAfterDispatch.status !== 'ON_TRIP') {
    throw new Error(`Vehicle or Driver status was not updated to ON_TRIP. Vehicle: ${dbVehicleAfterDispatch.status}, Driver: ${dbDriverAfterDispatch.status}`);
  }
  console.log('Verified vehicle and driver statuses updated to ON_TRIP in database');

  const dispatchFailRes = await req(`/trips/${tripId2}/dispatch`, 'PATCH', null, dispatcherToken);
  if (dispatchFailRes.status === 200) {
    throw new Error('Dispatched trip 2 successfully when vehicle/driver were already ON_TRIP!');
  }
  console.log('Dispatch double-booking blocked correctly (Status code:', dispatchFailRes.status, ')');

  console.log('\n--- 4. Driver Portal Workflow ---');

  const driverTripsRes = await req('/portal/trips', 'GET', null, driverToken);
  if (driverTripsRes.status !== 200 || !driverTripsRes.data.data.some(t => t.id === tripId1)) {
    throw new Error('Dispatched trip not visible in driver portal');
  }
  console.log('Driver portal returned assigned trip');

  const startFailRes = await req(`/portal/trips/${tripId1}/start`, 'PATCH', null, dispatcherToken);
  if (startFailRes.status === 200) {
    throw new Error('Non-driver started the trip!');
  }
  console.log('Starting trip by non-driver blocked correctly');

  const startRes = await req(`/portal/trips/${tripId1}/start`, 'PATCH', null, driverToken);
  if (startRes.status !== 200 || startRes.data.data.status !== 'ACTIVE') {
    throw new Error(`Failed to start trip: ${JSON.stringify(startRes.data)}`);
  }
  if (!startRes.data.data.actualDeparture || startRes.data.data.startOdometer !== truck.currentOdometer) {
    throw new Error(`actualDeparture or startOdometer was not recorded correctly: ${JSON.stringify(startRes.data.data)}`);
  }
  console.log(`Started trip 1 (Start Odometer: ${startRes.data.data.startOdometer}, Actual Departure: ${startRes.data.data.actualDeparture})`);

  const completeFailRes = await req(`/portal/trips/${tripId1}/complete`, 'PATCH', {
    endOdometer: startRes.data.data.startOdometer - 10,
  }, driverToken);
  if (completeFailRes.status === 200) {
    throw new Error('Completed trip with endOdometer < startOdometer');
  }
  console.log('Completing trip with invalid odometer blocked correctly');

  const endOdometer = 60100;
  const completeRes = await req(`/portal/trips/${tripId1}/complete`, 'PATCH', {
    endOdometer,
  }, driverToken);
  if (completeRes.status !== 200 || completeRes.data.data.status !== 'COMPLETED') {
    throw new Error(`Failed to complete trip: ${JSON.stringify(completeRes.data)}`);
  }
  console.log('Completed trip 1 successfully');

  const dbVehicleAfterComplete = await prisma.vehicle.findUnique({ where: { id: truck.id } });
  const dbDriverAfterComplete = await prisma.driver.findUnique({ where: { id: driverRecord.id } });
  if (dbVehicleAfterComplete.currentOdometer !== endOdometer) {
    throw new Error(`Vehicle odometer was not updated to ${endOdometer}. Got: ${dbVehicleAfterComplete.currentOdometer}`);
  }
  if (dbVehicleAfterComplete.status !== 'MAINTENANCE') {
    throw new Error(`Vehicle status was not updated to MAINTENANCE. Got: ${dbVehicleAfterComplete.status}`);
  }
  if (dbDriverAfterComplete.status !== 'AVAILABLE') {
    throw new Error(`Driver status was not updated to AVAILABLE. Got: ${dbDriverAfterComplete.status}`);
  }
  console.log('Verified vehicle currentOdometer updated to:', dbVehicleAfterComplete.currentOdometer);
  console.log('Verified vehicle status automatically changed to MAINTENANCE due to threshold violation');
  console.log('Verified driver status reset to AVAILABLE');

  await prisma.vehicle.update({ where: { id: truck.id }, data: { status: 'AVAILABLE', currentOdometer: 50000 } });

  console.log('\n--- 5. Fuel Logs & Expenses ---');

  const fuelBody = {
    vehicleId: truck.id,
    tripId: tripId1,
    date: new Date().toISOString(),
    litres: 50,
    pricePerLitre: 100,
    odometerAtFill: 50200,
    location: 'Fuel Station A',
    receiptUrl: 'http://example.com/receipt.jpg',
  };

  const createFuelRes = await req('/fuel-logs', 'POST', fuelBody, financeToken);
  if (createFuelRes.status !== 201 || createFuelRes.data.data.totalCost !== 5000) {
    throw new Error(`Failed to create fuel log: ${JSON.stringify(createFuelRes.data)}`);
  }
  console.log('Created fuel log with computed totalCost:', createFuelRes.data.data.totalCost);

  const expenseBody = {
    vehicleId: truck.id,
    tripId: tripId1,
    category: 'TOLL',
    amount: 350,
    date: new Date().toISOString(),
    description: 'Toll fee',
    receiptUrl: 'http://example.com/toll.jpg',
  };

  const createExpenseRes = await req('/expenses', 'POST', expenseBody, financeToken);
  if (createExpenseRes.status !== 201) {
    throw new Error(`Failed to create expense: ${JSON.stringify(createExpenseRes.data)}`);
  }
  console.log('Created expense with amount:', createExpenseRes.data.data.amount);

  console.log('\n--- 6. Analytics ---');
  const fleetAnalyticsRes = await req('/analytics/dashboard', 'GET', null, fleetManagerToken);
  if (fleetAnalyticsRes.status !== 200 || !fleetAnalyticsRes.data.data.vehicles) {
    throw new Error(`Failed to query fleet dashboard analytics: ${JSON.stringify(fleetAnalyticsRes.data)}`);
  }
  console.log('Fleet Analytics response:', JSON.stringify(fleetAnalyticsRes.data.data));

  const expenseAnalyticsRes = await req('/analytics/costs', 'GET', null, financeToken);
  if (expenseAnalyticsRes.status !== 200 || !expenseAnalyticsRes.data.data.summary) {
    throw new Error(`Failed to query expense costs analytics: ${JSON.stringify(expenseAnalyticsRes.data)}`);
  }
  console.log('Expense Analytics response:', JSON.stringify(expenseAnalyticsRes.data.data));

  console.log('\n--- 7. Cancellation ---');
  await req(`/trips/${tripId2}/dispatch`, 'PATCH', null, dispatcherToken);
  const t2Dispatched = await prisma.trip.findUnique({ where: { id: tripId2 } });
  if (t2Dispatched.status !== 'DISPATCHED') {
    throw new Error('Trip 2 failed to dispatch');
  }

  const cancelRes = await req(`/trips/${tripId2}/cancel`, 'PATCH', null, dispatcherToken);
  if (cancelRes.status !== 200 || cancelRes.data.data.status !== 'CANCELLED') {
    throw new Error('Failed to cancel trip 2');
  }
  console.log('Cancelled trip 2 successfully');

  const vehicleFinal = await prisma.vehicle.findUnique({ where: { id: truck.id } });
  const driverFinal = await prisma.driver.findUnique({ where: { id: driverRecord.id } });
  if (vehicleFinal.status !== 'AVAILABLE' || driverFinal.status !== 'AVAILABLE') {
    throw new Error(`Cancel failed to restore vehicle/driver status back to AVAILABLE. Vehicle: ${vehicleFinal.status}, Driver: ${driverFinal.status}`);
  }
  console.log('Verified vehicle and driver reset back to AVAILABLE after cancellation');

  const vehicleRegionRes = await req('/vehicles?region=Mumbai', 'GET', null, fleetManagerToken);
  if (vehicleRegionRes.status !== 200 || !vehicleRegionRes.data.data.every((v) => v.region.toLowerCase().includes('mumbai'))) {
    throw new Error('Failed region filter on vehicle list');
  }

  const offDutyDriver = await prisma.driver.create({
    data: {
      name: 'Off Duty Driver',
      phone: '9999999999',
      licenseNumber: 'TESTOFFDUTY',
      licenseCategory: 'HMV',
      licenseExpiry: new Date('2030-01-01'),
      status: 'OFF_DUTY',
    },
  });

  const tripBodyOffDuty = {
    originAddress: 'Source Location',
    originLat: 18.5204,
    originLng: 73.8567,
    destinationAddress: 'Destination Location',
    destinationLat: 19.0760,
    destinationLng: 72.8777,
    distanceKm: 150,
    plannedDeparture: new Date(Date.now() + 86400000).toISOString(),
    vehicleId: truck.id,
    driverId: offDutyDriver.id,
  };

  const createTripOffDutyRes = await req('/trips', 'POST', tripBodyOffDuty, dispatcherToken);
  await prisma.driver.delete({ where: { id: offDutyDriver.id } });
  if (createTripOffDutyRes.status !== 400 || createTripOffDutyRes.data.error.code !== 'DRIVER_NOT_AVAILABLE') {
    throw new Error('Dispatch did not block OFF_DUTY driver');
  }

  const tripToStart = await prisma.trip.create({
    data: {
      tripNumber: 'TRIP-START-TEST',
      originAddress: 'A',
      originLat: 0,
      originLng: 0,
      destinationAddress: 'B',
      destinationLat: 0,
      destinationLng: 0,
      status: 'DISPATCHED',
      plannedDeparture: new Date(),
      createdById: adminLogin.data.data.user.id,
    },
  });
  const startTripRes = await req(`/trips/${tripToStart.id}/start`, 'PATCH', null, dispatcherToken);
  await prisma.trip.delete({ where: { id: tripToStart.id } });
  if (startTripRes.status !== 200 || startTripRes.data.data.status !== 'ACTIVE') {
    throw new Error('PATCH /trips/:id/start failed');
  }

  const vehicleCostsRes = await req('/analytics/vehicle-costs', 'GET', null, fleetManagerToken);
  if (vehicleCostsRes.status !== 200 || !Array.isArray(vehicleCostsRes.data.data)) {
    throw new Error('GET /analytics/vehicle-costs failed');
  }

  const filteredFuelRes = await req(`/fuel-logs?vehicleId=${truck.id}`, 'GET', null, fleetManagerToken);
  if (filteredFuelRes.status !== 200 || !filteredFuelRes.data.data.every((f) => f.vehicleId === truck.id)) {
    throw new Error('fuel-logs vehicleId filtering failed');
  }
}

const server = app.listen(3001, async () => {
  console.log('Verification test server running on port 3001');
  try {
    await runTests();
    console.log('\nALL TESTS PASSED SUCCESSFULLY!\n');
    process.exit(0);
  } catch (err) {
    console.error('\nTEST SUITE FAILED:\n', err);
    process.exit(1);
  } finally {
    server.close();
  }
});
