import api from '../lib/axios';

export const getMaintenanceLogs = (params) =>
  api.get('/maintenance', { params });

export const getMaintenanceLog = (id) =>
  api.get(`/maintenance/${id}`);

export const createMaintenanceLog = (data) =>
  api.post('/maintenance', data);

export const updateMaintenanceLog = (id, data) =>
  api.put(`/maintenance/${id}`, data);

export const getMaintenanceSchedules = (vehicleId) =>
  api.get(`/maintenance/schedules/${vehicleId}`);

export const createMaintenanceSchedule = (data) =>
  api.post('/maintenance/schedules', data);
