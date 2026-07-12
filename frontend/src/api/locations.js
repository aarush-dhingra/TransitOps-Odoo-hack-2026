import api from '../lib/axios';

export const searchLocations = (query, signal) =>
  api.get('/locations/search', {
    params: { q: query },
    signal,
  });
