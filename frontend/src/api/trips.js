import api from '../lib/axios';

export const getTrips = (params) =>
  api.get('/trips', { params });

export const getTrip = (id) =>
  api.get(`/trips/${id}`);

export const createTrip = (data) =>
  api.post('/trips', data);

export const dispatchTrip = (id) =>
  api.patch(`/trips/${id}/dispatch`);

export const completeTrip = (id, data) =>
  api.patch(`/trips/${id}/complete`, data);

export const startTrip = (id) =>
  api.patch(`/trips/${id}/start`);

export const cancelTrip = (id) =>
  api.patch(`/trips/${id}/cancel`);
