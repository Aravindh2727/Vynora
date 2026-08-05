// This configuration file determines the correct backend URL for API calls.
// In development (npm run dev), it defaults to http://localhost:5000
// In production (Render), it will use the environment variable VITE_API_URL

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
