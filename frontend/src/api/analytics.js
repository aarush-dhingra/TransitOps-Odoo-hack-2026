import api from '../lib/axios';

export const getDashboardStats = () =>
  api.get('/analytics/dashboard');

export const getFleetUtilization = (params) =>
  api.get('/analytics/utilization', { params });

export const getFuelEfficiency = (params) =>
  api.get('/analytics/fuel-efficiency', { params });

export const getCostBreakdown = (params) =>
  api.get('/analytics/costs', { params });

export const getAlerts = () =>
  api.get('/analytics/alerts');
