import api from '../lib/axios';

// Driver portal API - all routes require DRIVER role

export const getMyTrips = () =>
  api.get('/portal/trips');

export const startTrip = (tripId) =>
  api.patch(`/portal/trips/${tripId}/start`);

export const completeTrip = (tripId, data) =>
  api.patch(`/portal/trips/${tripId}/complete`, data);

export const submitFuelLog = (data) =>
  api.post('/portal/fuel-logs', data);

export const submitExpense = (data) =>
  api.post('/portal/expenses', data);
