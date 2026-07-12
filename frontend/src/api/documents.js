import api from '../lib/axios';

export const uploadDocument = (formData) =>
  api.post('/documents', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

export const deleteDocument = (id) =>
  api.delete(`/documents/${id}`);

export const downloadDocument = async (id, filename) => {
  const response = await api.get(`/documents/${id}/file`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(response.data);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.URL.revokeObjectURL(url);
};
