'use strict';

const axios = require('axios');
const { z } = require('zod');

const { success, error } = require('../utils/response');

const searchLocationsSchema = z.object({
  q: z.string().trim().min(3).max(200),
});

const routeSchema = z.object({
  originLat: z.coerce.number().min(-90).max(90),
  originLng: z.coerce.number().min(-180).max(180),
  destinationLat: z.coerce.number().min(-90).max(90),
  destinationLng: z.coerce.number().min(-180).max(180),
});

const nearbyPlacesSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
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

async function getRoute(req, res, next) {
  if (!process.env.GEOAPIFY_API_KEY) {
    return error(res, 'LOCATION_SERVICE_NOT_CONFIGURED', 'Routing is unavailable.', 503);
  }

  try {
    const { originLat, originLng, destinationLat, destinationLng } = req.query;
    const response = await axios.get('https://api.geoapify.com/v1/routing', {
      params: {
        waypoints: `${originLat},${originLng}|${destinationLat},${destinationLng}`,
        mode: 'drive',
        details: 'instruction_details',
        apiKey: process.env.GEOAPIFY_API_KEY,
      },
      timeout: 8000,
    });
    const feature = response.data.features?.[0];
    if (!feature) {
      return error(res, 'ROUTE_NOT_FOUND', 'No driving route was found.', 404);
    }
    const rawCoordinates = feature.geometry?.coordinates || [];
    const coordinates = rawCoordinates
      .flat(Infinity)
      .reduce((pairs, value, index, flat) => {
        if (index % 2 === 0 && Number.isFinite(value) && Number.isFinite(flat[index + 1])) {
          pairs.push([flat[index + 1], value]);
        }
        return pairs;
      }, []);

    return success(res, {
      distanceKm: Math.round((feature.properties.distance / 1000) * 10) / 10,
      durationMinutes: Math.round(feature.properties.time / 60),
      coordinates,
    });
  } catch (err) {
    if (axios.isAxiosError(err)) {
      return error(res, 'ROUTING_SERVICE_UNAVAILABLE', 'Routing is temporarily unavailable.', 502);
    }
    return next(err);
  }
}

async function getNearbyPlaces(req, res, next) {
  if (!process.env.GEOAPIFY_API_KEY) {
    return error(res, 'LOCATION_SERVICE_NOT_CONFIGURED', 'Nearby places are unavailable.', 503);
  }

  try {
    const { lat, lng } = req.query;
    const response = await axios.get('https://api.geoapify.com/v2/places', {
      params: {
        categories: 'commercial.gas,catering.restaurant,service.vehicle',
        filter: `circle:${lng},${lat},15000`,
        bias: `proximity:${lng},${lat}`,
        limit: 12,
        apiKey: process.env.GEOAPIFY_API_KEY,
      },
      timeout: 8000,
    });
    const places = (response.data.features || []).map((feature) => ({
      id: feature.properties.place_id,
      name: feature.properties.name || feature.properties.address_line1 || 'Useful stop',
      address: feature.properties.formatted,
      latitude: feature.properties.lat,
      longitude: feature.properties.lon,
      categories: feature.properties.categories || [],
    }));
    return success(res, places);
  } catch (err) {
    if (axios.isAxiosError(err)) {
      return error(res, 'PLACES_SERVICE_UNAVAILABLE', 'Nearby places are temporarily unavailable.', 502);
    }
    return next(err);
  }
}

module.exports = {
  searchLocations,
  searchLocationsSchema,
  getRoute,
  routeSchema,
  getNearbyPlaces,
  nearbyPlacesSchema,
};
