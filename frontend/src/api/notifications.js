import api from '../lib/axios';
export const getNotifications = () => api.get('/notifications');
