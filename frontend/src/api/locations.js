import api from '../lib/axios';

export const searchLocations = (query, signal) =>
  api.get('/locations/search', {
    params: { q: query },
    signal,
  });

export const getRoute = (params, signal) =>
  api.get('/locations/route', { params, signal });

export const getNearbyPlaces = (params, signal) =>
  api.get('/locations/nearby', { params, signal });
