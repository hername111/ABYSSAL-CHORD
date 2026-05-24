import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import { createInitialGameState, createMultiplayerPlayer } from './lib/multiplayer/gameLogic';
import type { MultiplayerGameState, MultiplayerPlayer } from './lib/multiplayer/types';

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
  hostId: string; // 房主ID
  gameState?: MultiplayerGameState; // 游戏状态
}

const rooms = new Map<string, Room>();

// Multiplayer game state management
interface GameRoom {
  id: string;
  gameState: MultiplayerGameState;
  playerWsMap: Map<string, WebSocket>;
}

const gameRooms = new Map<string, GameRoom>();

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

// Check game start conditions and start game if met
function checkAndStartGame(roomId: string) {
  const room = rooms.get(roomId);
  if (!room || room.isGameStarted) return;
  
  const players = Array.from(room.players.values());
  
  // 发车条件：至少2人，且所有人都准备好
  if (players.length >= 2 && players.every(p => p.isReady)) {
    room.isGameStarted = true;
    broadcastToRoom(roomId, {
      type: 'game-started'
    });
  }
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
const multiplayerWss = registerWsEndpoint('/ws/multiplayer');

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
            isGameStarted: false,
            hostId: playerId // 创建者成为房主
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
          
          // Broadcast room state to all players in the room
          broadcastRoomState(currentRoomId);
          break;
        }

        case 'start-game': {
          if (!currentRoomId || !currentPlayerId) break;
          
          const room = rooms.get(currentRoomId);
          if (!room || room.isGameStarted) break;
          
          // 只有房主可以开始游戏
          if (room.hostId !== currentPlayerId) {
            ws.send(JSON.stringify({
              type: 'error',
              payload: { message: '只有房主可以开始游戏' }
            }));
            break;
          }
          
          const players = Array.from(room.players.values());
          
          // 检查条件：至少2人，且所有非房主玩家都准备好
          if (players.length < 2) {
            ws.send(JSON.stringify({
              type: 'error',
              payload: { message: '至少需要2名玩家' }
            }));
            break;
          }
          
          const nonHostPlayers = players.filter(p => p.id !== room.hostId);
          if (nonHostPlayers.length > 0 && !nonHostPlayers.every(p => p.isReady)) {
            ws.send(JSON.stringify({
              type: 'error',
              payload: { message: '所有非房主玩家必须准备就绪' }
            }));
            break;
          }
          
          // 所有条件满足，开始游戏
          room.isGameStarted = true;
          
          // 初始化游戏状态
          const initialPlayers = Array.from(room.players.values()).map(p => 
            createMultiplayerPlayer(p.id, p.name)
          );
          room.gameState = createInitialGameState(currentRoomId, initialPlayers);
          
          // 第一个玩家是当前回合玩家
          if (room.gameState.players.length > 0) {
            room.gameState.players[0].isCurrentTurn = true;
          }
          
          // 先发送game-started消息，让lobby页面跳转
          broadcastToRoom(currentRoomId, {
            type: 'game-started',
            payload: {}
          });
          
          // 然后广播游戏状态
          broadcastToRoom(currentRoomId, {
            type: 'game-state',
            payload: {
              gameState: room.gameState
            }
          });
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
            
            // Check if game can start (though unlikely after player leaves)
            checkAndStartGame(currentRoomId);
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
        isGameStarted: room.isGameStarted,
        hostId: room.hostId // 房主ID
      }
    });
  }
});

// 多人对战 WebSocket 处理
multiplayerWss.on('connection', (ws: WebSocket) => {
  console.log('New client connected to multiplayer');
  let currentRoomId: string | null = null;
  let currentPlayerId: string | null = null;

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      console.log('Received multiplayer message:', msg);

      switch (msg.type) {
        case 'game:join': {
          const roomId = msg.payload.roomId;
          const playerId = msg.payload.playerId;
          const playerName = msg.payload.playerName;
          
          let gameRoom = gameRooms.get(roomId);
          
          if (!gameRoom) {
            // 创建新游戏房间
            const lobbyRoom = rooms.get(roomId);
            if (!lobbyRoom) {
              ws.send(JSON.stringify({
                type: 'error',
                payload: { message: 'Room not found' }
              }));
              break;
            }
            
            // 创建玩家列表
            const players: MultiplayerPlayer[] = Array.from(lobbyRoom.players.values()).map((p, index) => {
              const mpPlayer = createMultiplayerPlayer(p.id, p.name);
              if (index === 0) {
                mpPlayer.isCurrentTurn = true;
              }
              return mpPlayer;
            });
            
            // 创建初始游戏状态
            const gameState = createInitialGameState(roomId, players);
            
            // 创建游戏房间
            gameRoom = {
              id: roomId,
              gameState,
              playerWsMap: new Map(),
            };
            
            gameRooms.set(roomId, gameRoom);
          }
          
          // 添加玩家到游戏房间
          gameRoom.playerWsMap.set(playerId, ws);
          currentRoomId = roomId;
          currentPlayerId = playerId;
          
          // 发送游戏状态给玩家
          ws.send(JSON.stringify({
            type: 'game:state',
            payload: { gameState: gameRoom.gameState }
          }));
          
          break;
        }
        
        // TODO: 游戏逻辑暂时注释，先让编译通过
        // case 'card:play': { ... }
        // case 'target:select': { ... }
        // case 'turn:end': { ... }
      }
    } catch (error) {
      console.error('Error processing multiplayer message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Multiplayer client disconnected');
    
    if (currentRoomId && currentPlayerId) {
      const gameRoom = gameRooms.get(currentRoomId);
      if (gameRoom) {
        gameRoom.playerWsMap.delete(currentPlayerId);
        
        // 如果房间为空，删除它
        if (gameRoom.playerWsMap.size === 0) {
          gameRooms.delete(currentRoomId);
        }
      }
    }
  });

  // 广播游戏状态给所有玩家
  function broadcastGameState(roomId: string) {
    const gameRoom = gameRooms.get(roomId);
    if (!gameRoom) return;
    
    gameRoom.playerWsMap.forEach((playerWs, playerId) => {
      if (playerWs.readyState === WebSocket.OPEN) {
        playerWs.send(JSON.stringify({
          type: 'game:state',
          payload: { gameState: gameRoom.gameState }
        }));
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
