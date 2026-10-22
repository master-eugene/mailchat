import type { Server as HttpServer } from 'node:http';

import { WebSocket, WebSocketServer } from 'ws';
import { z } from 'zod';

import { verifyAccessToken } from '../auth/jwt.js';

// Live channel while the app is open. It only carries notifications of new messages and
// receipts; the device still acknowledges over HTTPS so the server knows what to delete.
const socketsByUser = new Map<string, Set<WebSocket>>();

const authMessage = z.object({ type: z.literal('auth'), token: z.string().min(1) });

export const emitToUser = (userId: string, event: unknown) => {
  const data = JSON.stringify(event);
  socketsByUser.get(userId)?.forEach(socket => {
    if (socket.readyState === WebSocket.OPEN) socket.send(data);
  });
};

const register = (userId: string, socket: WebSocket) => {
  const sockets = socketsByUser.get(userId) ?? new Set<WebSocket>();
  sockets.add(socket);
  socketsByUser.set(userId, sockets);

  socket.on('close', () => {
    sockets.delete(socket);
    if (!sockets.size) socketsByUser.delete(userId);
  });
};

export const startRealtime = (server: HttpServer) => {
  const wss = new WebSocketServer({ server, path: '/ws', maxPayload: 4 * 1024 });

  wss.on('connection', socket => {
    let alive = true;
    socket.on('pong', () => (alive = true));

    // The token is sent as the first message rather than in the URL, so it stays out of logs.
    const authTimeout = setTimeout(() => socket.close(4401, 'Authentication timeout'), 10_000);

    socket.once('message', raw => {
      clearTimeout(authTimeout);
      try {
        const { token } = authMessage.parse(JSON.parse(raw.toString()));
        register(verifyAccessToken(token).sub, socket);
        socket.send(JSON.stringify({ type: 'ready' }));
      } catch {
        socket.close(4401, 'Unauthorized');
      }
    });

    const heartbeat = setInterval(() => {
      if (!alive) {
        socket.terminate();
        return;
      }
      alive = false;
      socket.ping();
    }, 30_000);

    socket.on('close', () => {
      clearTimeout(authTimeout);
      clearInterval(heartbeat);
    });
    socket.on('error', () => socket.terminate());
  });

  return wss;
};
