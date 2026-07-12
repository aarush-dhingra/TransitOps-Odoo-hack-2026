import api from '../lib/axios';

export const getFuelLogs = (params) =>
  api.get('/fuel-logs', { params: { limit: 100, ...params } });

export const createFuelLog = (data) =>
  api.post('/fuel-logs', data);

export const deleteFuelLog = (id) =>
  api.delete(`/fuel-logs/${id}`);
