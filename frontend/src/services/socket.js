import { io } from 'socket.io-client';
import api from './api';

export async function connectClassroomSocket() {
  const { data } = await api.get('/auth/socket-ticket');
  const rawUrl = import.meta.env.VITE_SOCKET_URL || 'https://dath-cnpm-ru1s.onrender.com';
  const socketUrl = rawUrl.trim().replace(/\/+$/, '');
  return io(socketUrl, {
    auth: { ticket: data.data.ticket },
    transports: ['websocket', 'polling'],
    withCredentials: true,
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000
  });
}