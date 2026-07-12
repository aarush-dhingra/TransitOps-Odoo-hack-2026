import api from '../lib/axios';

// Do NOT set Content-Type manually — axios sets it automatically with the
// correct multipart boundary when a FormData object is passed.
export const uploadDocument = (formData) =>
  api.post('/documents', formData);

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
