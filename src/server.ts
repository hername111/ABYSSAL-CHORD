import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';

const dev = process.env.COZE_PROJECT_ENV !== 'PROD';
const hostname = process.env.HOSTNAME || 'localhost';
const port = parseInt(process.env.PORT || '5000', 10);

// Create Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Room state management
interface Player {
  id: string;
  name: string;
  isReady: boolean;
  ws: WebSocket;
}

interface Room {
  id: string;
  players: Map<string, Player>;
  isGameStarted: boolean;
}

const rooms = new Map<string, Room>();

// Generate random room ID
function generateRoomId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

// Broadcast message to all players in a room
function broadcastToRoom(roomId: string, message: any) {
  const room = rooms.get(roomId);
  if (!room) return;
  
  room.players.forEach(player => {
    if (player.ws.readyState === WebSocket.OPEN) {
      player.ws.send(JSON.stringify(message));
    }
  });
}

// ─── WS 路由注册（与 SKILL.md 通用模式一致）────────
const wssMap = new Map<string, WebSocketServer>();

function registerWsEndpoint(path: string): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });
  wssMap.set(path, wss);
  return wss;
}

function handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer) {
  const { pathname } = new URL(req.url!, `http://${req.headers.host}`);
  const wss = wssMap.get(pathname);
  if (wss) {
    wss.handleUpgrade(req, socket, head, (ws) => wss.emit('connection', ws, req));
  } else if (!dev) {
    // 生产环境销毁未注册的 upgrade 请求，防止连接泄漏
    // 开发环境不销毁 —— Next.js HMR 需要通过 /_next/webpack-hmr 建立 WebSocket
    socket.destroy();
  }
}

// ─── 注册端点 & 绑定业务逻辑 ──────────────────────
// 设置 WebSocket 处理器
const lobbyWss = registerWsEndpoint('/ws/lobby');

lobbyWss.on('connection', (ws: WebSocket) => {
  console.log('New client connected to lobby');
  let currentRoomId: string | null = null;
  let currentPlayerId: string | null = null;

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      console.log('Received message:', msg);

      switch (msg.type) {
        case 'create-room': {
          const roomId = generateRoomId();
          const playerId = msg.payload.playerId || Math.random().toString(36).substring(2, 12);
          const playerName = msg.payload.playerName || 'Player 1';
          
          const room: Room = {
            id: roomId,
            players: new Map(),
            isGameStarted: false
          };
          
          const player: Player = {
            id: playerId,
            name: playerName,
            isReady: false,
            ws
          };
          
          room.players.set(playerId, player);
          rooms.set(roomId, room);
          
          currentRoomId = roomId;
          currentPlayerId = playerId;
          
          // Send room created message back to creator
          ws.send(JSON.stringify({
            type: 'room-created',
            payload: { roomId, playerId }
          }));
          
          // Broadcast room state to all players in the room
          broadcastRoomState(roomId);
          break;
        }

        case 'join-room': {
          const roomId = msg.payload.roomId.toUpperCase();
          const room = rooms.get(roomId);
          
          if (!room) {
            ws.send(JSON.stringify({
              type: 'error',
              payload: { message: 'Room not found' }
            }));
            break;
          }
          
          if (room.isGameStarted) {
            ws.send(JSON.stringify({
              type: 'error',
              payload: { message: 'Game already started' }
            }));
            break;
          }
          
          const playerId = msg.payload.playerId || Math.random().toString(36).substring(2, 12);
          const playerName = msg.payload.playerName || `Player ${room.players.size + 1}`;
          
          const player: Player = {
            id: playerId,
            name: playerName,
            isReady: false,
            ws
          };
          
          room.players.set(playerId, player);
          currentRoomId = roomId;
          currentPlayerId = playerId;
          
          // Send joined message back to player
          ws.send(JSON.stringify({
            type: 'room-joined',
            payload: { roomId, playerId }
          }));
          
          // Broadcast room state to all players in the room
          broadcastRoomState(roomId);
          break;
        }

        case 'toggle-ready': {
          if (!currentRoomId || !currentPlayerId) break;
          
          const room = rooms.get(currentRoomId);
          if (!room) break;
          
          const player = room.players.get(currentPlayerId);
          if (!player) break;
          
          player.isReady = !player.isReady;
          
          // Check if all players are ready (at least 2 players)
          const readyPlayers = Array.from(room.players.values()).filter(p => p.isReady);
          if (readyPlayers.length >= 2 && readyPlayers.length === room.players.size) {
            room.isGameStarted = true;
            broadcastToRoom(currentRoomId, {
              type: 'game-started'
            });
          }
          
          // Broadcast room state to all players in the room
          broadcastRoomState(currentRoomId);
          break;
        }

        case 'leave-room': {
          if (!currentRoomId || !currentPlayerId) break;
          
          const room = rooms.get(currentRoomId);
          if (!room) break;
          
          room.players.delete(currentPlayerId);
          
          // If room is empty, delete it
          if (room.players.size === 0) {
            rooms.delete(currentRoomId);
          } else {
            // Broadcast room state to remaining players
            broadcastRoomState(currentRoomId);
          }
          
          currentRoomId = null;
          currentPlayerId = null;
          break;
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    
    // If player was in a room, remove them
    if (currentRoomId && currentPlayerId) {
      const room = rooms.get(currentRoomId);
      if (room) {
        room.players.delete(currentPlayerId);
        
        // If room is empty, delete it
        if (room.players.size === 0) {
          rooms.delete(currentRoomId);
        } else {
          // Broadcast room state to remaining players
          broadcastRoomState(currentRoomId);
        }
      }
    }
  });

  // Helper function to broadcast room state
  function broadcastRoomState(roomId: string) {
    const room = rooms.get(roomId);
    if (!room) return;
    
    const players = Array.from(room.players.values()).map(p => ({
      id: p.id,
      name: p.name,
      isReady: p.isReady
    }));
    
    broadcastToRoom(roomId, {
      type: 'room-state',
      payload: {
        roomId: room.id,
        players,
        isGameStarted: room.isGameStarted
      }
    });
  }
});

app.prepare().then(() => {
  const server = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url!, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });
  server.once('error', err => {
    console.error(err);
    process.exit(1);
  });

  server.on('upgrade', handleUpgrade);

  server.listen(port, () => {
    console.log(
      `> Server listening at http://${hostname}:${port} as ${
        dev ? 'development' : process.env.COZE_PROJECT_ENV
      }`,
    );
  });
});
