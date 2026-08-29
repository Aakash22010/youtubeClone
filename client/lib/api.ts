import axios from 'axios';
import { getAnonymousId } from './anonymousId';
import { clearToken, getToken } from './authToken';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    config.headers['X-Anonymous-Id'] = getAnonymousId();
  }
  return config;
});

// An expired or revoked token should not leave the app stuck retrying with it.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401 && getToken()) clearToken();
    return Promise.reject(error);
  },
);

export default api;
