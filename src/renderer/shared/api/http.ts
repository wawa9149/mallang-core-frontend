import axios from 'axios';

const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';

export const http = axios.create({
  baseURL: BASE_URL,
  timeout: 10_000,
  withCredentials: true,
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    if (import.meta.env.DEV) {
      console.error('[http]', error?.response?.status, error?.message);
    }
    return Promise.reject(error);
  },
);
