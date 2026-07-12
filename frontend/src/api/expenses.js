import api from '../lib/axios';

export const getExpenses = (params) =>
  api.get('/expenses', { params });

export const createExpense = (data) =>
  api.post('/expenses', data);

export const deleteExpense = (id) =>
  api.delete(`/expenses/${id}`);
