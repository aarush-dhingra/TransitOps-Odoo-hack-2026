import api from '../lib/axios';

export const getTrips = (params) =>
  api.get('/trips', { params });

export const getTrip = (id) =>
  api.get(`/trips/${id}`);

export const createTrip = (data) =>
  api.post('/trips', data);

export const dispatchTrip = (id) =>
  api.patch(`/trips/${id}/dispatch`);

export const completeTrip = (id, data) =>
  api.patch(`/trips/${id}/complete`, data);

export const startTrip = (id) =>
  api.patch(`/trips/${id}/start`);

export const cancelTrip = (id) =>
  api.patch(`/trips/${id}/cancel`);

export const getDispatchRecommendations = (params) =>
  api.get('/trips/recommendations', { params });

export const getTripSummary = (id) =>
  api.get(`/trips/${id}/summary`);

export const downloadTripSummaryPdf = async (id, tripNumber) => {
  const response = await api.get(`/trips/${id}/summary/pdf`, { responseType: 'blob' });
  const blob = new Blob([response.data], { type: 'application/pdf' });
  const link = document.createElement('a');
  link.href = window.URL.createObjectURL(blob);
  link.download = `trip-${tripNumber}-summary.pdf`;
  link.click();
  window.URL.revokeObjectURL(link.href);
};
