import api from '../lib/axios';

export const getUsers   = ()        => api.get('/admin/users');
export const createUser = (data)    => api.post('/admin/users', data);
export const updateUser = (id, data)=> api.put(`/admin/users/${id}`, data);
export const deleteUser = (id)      => api.delete(`/admin/users/${id}`);
export const unlockUser = (id)      => api.patch(`/admin/users/${id}/unlock`);
