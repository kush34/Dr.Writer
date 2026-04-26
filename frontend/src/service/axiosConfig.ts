import axios from 'axios';
import { auth } from '@/firebaseAuth/firebaseConfig';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_Backend_URL, // Replace with your API URL
});

// Add a request interceptor to attach the token
apiClient.interceptors.request.use(async (config) => {
  // Wait until Firebase finishes restoring persisted auth state on refresh.
  await auth.authStateReady();

  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken(); // Get the Firebase token
    config.headers.Authorization = `Bearer ${token}`; // Attach token
  }
  return config;
});

export default apiClient;
