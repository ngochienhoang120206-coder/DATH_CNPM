import { io } from 'socket.io-client';
import api from './api';

export async function connectClassroomSocket() {
  const { data } = await api.get('/auth/socket-ticket');
  const rawUrl = import.meta.env.VITE_SOCKET_URL || 'https://dath-cnpm-ru1s.onrender.com';
  const socketUrl = rawUrl.trim().replace(/\/+$/, '');

  const socket = io(socketUrl, {
    auth: { ticket: data?.data?.ticket },
    transports: ['websocket', 'polling'],
    withCredentials: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    randomizationFactor: 0.5,
    timeout: 10000
  });

  // Refresh single-use ticket automatically if reconnection fails due to expired auth
  socket.on('connect_error', async (err) => {
    if (err?.message === 'UNAUTHORIZED_SOCKET') {
      try {
        const refreshRes = await api.get('/auth/socket-ticket');
        const newTicket = refreshRes.data?.data?.ticket;
        if (newTicket) {
          socket.auth = { ticket: newTicket };
        }
      } catch (_e) {
        // Wait for next exponential backoff cycle
      }
    }
  });

  return socket;
}