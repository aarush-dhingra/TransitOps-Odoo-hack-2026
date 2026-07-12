import api from '../lib/axios';

export const login          = (email, password) =>
  api.post('/auth/login', { email, password });

export const getMe          = () =>
  api.get('/auth/me');

export const forgotPassword = (email) =>
  api.post('/auth/forgot-password', { email });

export const verifyOtp      = (email, otp) =>
  api.post('/auth/verify-otp', { email, otp });

export const resetPassword  = (email, otp, newPassword) =>
  api.post('/auth/reset-password', { email, otp, newPassword });
