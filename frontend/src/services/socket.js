import { io } from 'socket.io-client';
import api from './api';

export async function connectClassroomSocket() {
  const { data } = await api.get('/auth/socket-ticket');
  const socketUrl = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';
  return io(socketUrl, {
    auth: { ticket: data.data.ticket },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000
  });
}