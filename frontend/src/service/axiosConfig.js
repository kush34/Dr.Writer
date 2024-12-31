import axios from 'axios';
import { getAuth } from 'firebase/auth';

const auth = getAuth();

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_Backend_URL, // Replace with your API URL
});

// Add a request interceptor to attach the token
apiClient.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken(); // Get the Firebase token
    config.headers.Authorization = `Bearer ${token}`; // Attach token
  }
  return config;
});

export default apiClient;
