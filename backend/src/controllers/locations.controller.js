'use strict';

const axios = require('axios');
const { z } = require('zod');

const { success, error } = require('../utils/response');

const searchLocationsSchema = z.object({
  q: z.string().trim().min(3).max(200),
});

const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_ENTRIES = 100;
const cache = new Map();

function getCached(query) {
  const entry = cache.get(query);
  if (!entry) {
    return null;
  }
  if (Date.now() - entry.createdAt > CACHE_TTL_MS) {
    cache.delete(query);
    return null;
  }
  return entry.results;
}

function setCached(query, results) {
  if (cache.size >= CACHE_MAX_ENTRIES) {
    cache.delete(cache.keys().next().value);
  }
  cache.set(query, { results, createdAt: Date.now() });
}

async function searchLocations(req, res, next) {
  const query = req.query.q.toLowerCase();
  const cached = getCached(query);
  if (cached) {
    return success(res, cached);
  }

  if (!process.env.GEOAPIFY_API_KEY) {
    return error(res, 'LOCATION_SERVICE_NOT_CONFIGURED', 'Location search is unavailable.', 503);
  }

  try {
    const response = await axios.get('https://api.geoapify.com/v1/geocode/autocomplete', {
      params: {
        text: req.query.q,
        limit: 6,
        filter: 'countrycode:in',
        format: 'json',
        lang: 'en',
        apiKey: process.env.GEOAPIFY_API_KEY,
      },
      timeout: 5000,
    });

    const results = (response.data.results || [])
      .filter((place) => Number.isFinite(place.lat) && Number.isFinite(place.lon))
      .map((place) => ({
        id: String(place.place_id || `${place.lat},${place.lon}`),
        label: place.formatted,
        latitude: place.lat,
        longitude: place.lon,
        city: place.city || place.county || null,
        state: place.state || null,
        postcode: place.postcode || null,
        country: place.country || null,
      }));

    setCached(query, results);
    return success(res, results);
  } catch (err) {
    if (axios.isAxiosError(err)) {
      return error(res, 'LOCATION_SERVICE_UNAVAILABLE', 'Location search is temporarily unavailable.', 502);
    }
    return next(err);
  }
}

module.exports = {
  searchLocations,
  searchLocationsSchema,
};
