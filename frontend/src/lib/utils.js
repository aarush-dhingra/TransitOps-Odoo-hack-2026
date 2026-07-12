import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// shadcn/ui helper - merges Tailwind classes safely
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Format ISO date string to readable local date
export function formatDate(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// Format ISO date string to readable local datetime
export function formatDateTime(iso) {
  if (!iso) return '-';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Format a number as Indian Rupees
export function formatCurrency(amount) {
  if (amount == null) return '-';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

// Generate Google Maps navigation link from coordinates
export function mapsLink(lat, lng) {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}
