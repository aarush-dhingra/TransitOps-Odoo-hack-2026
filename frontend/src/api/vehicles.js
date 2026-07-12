import api from '../lib/axios';

export const getVehicles = (params) =>
  api.get('/vehicles', { params });

export const getVehicle = (id) =>
  api.get(`/vehicles/${id}`);

export const createVehicle = (data) =>
  api.post('/vehicles', data);

export const updateVehicle = (id, data) =>
  api.put(`/vehicles/${id}`, data);

export const updateVehicleStatus = (id, status) =>
  api.patch(`/vehicles/${id}/status`, { status });
