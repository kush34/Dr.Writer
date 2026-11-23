import { io } from 'socket.io-client';
import { auth } from '@/firebaseAuth/firebaseConfig';

// The server refuses sockets without a Firebase ID token, and socket.io does not retry a refused
// handshake by itself, so connect only once the editor has a signed-in user (see simple-editor).
// The auth callback runs on every (re)connect, so each attempt carries a fresh token.
const socket = io(import.meta.env.VITE_Socket_URL, {
  autoConnect: false,
  auth: (callback) => {
    auth.currentUser?.getIdToken().then(
      (token) => callback({ token }),
      () => callback({})
    );
    if (!auth.currentUser) callback({});
  },
});

export default socket;
