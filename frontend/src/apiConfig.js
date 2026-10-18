/**
 * API Client Configuration
 *
 * In Production: Directly targets the live Render backend (https://nagar-yojana.onrender.com)
 * In Development: Uses localhost:5000 (or Vite dev proxy)
 */
export const API_BASE_URL = import.meta.env.PROD
  ? (import.meta.env.VITE_API_BASE_URL || 'https://nagar-yojana.onrender.com')
  : (import.meta.env.VITE_API_BASE_URL || '');
