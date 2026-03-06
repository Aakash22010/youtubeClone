import axios from 'axios';
import { auth } from './firebase';
import { getAnonymousId } from './anonymousId';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    const anonymousId = getAnonymousId();
    config.headers['X-Anonymous-Id'] = anonymousId;
  }
  return config;
});

export default api;