import { createServer } from 'http';
import { parse } from 'url';
import next from 'next';
import { WebSocketServer, WebSocket } from 'ws';
import type { IncomingMessage } from 'http';
import type { Duplex } from 'stream';
import { createInitialGameState, createMultiplayerPlayer, handlePlayCard, nextPlayer, isCurrentPlayerTurn } from './lib/multiplayer/gameLogic';
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
          const playerId = msg.payload.playerId;
          const playerName = msg.payload.playerName;

          const room: Room = {
            id: roomId,
            players: new Map(),
            isGameStarted: false,
            hostId: playerId
          };

          room.players.set(playerId, {
            id: playerId,
            name: playerName,
            isReady: false,
            ws,
          });

          rooms.set(roomId, room);
          currentRoomId = roomId;
          currentPlayerId = playerId;

          ws.send(JSON.stringify({
            type: 'room-created',
            payload: { roomId, playerId }
          }));

          // 广播房间状态
          broadcastRoomState(roomId);
          break;
        }

        case 'join-room': {
          const roomId = msg.payload.roomId;
          const playerId = msg.payload.playerId;
          const playerName = msg.payload.playerName;

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

          room.players.set(playerId, {
            id: playerId,
            name: playerName,
            isReady: false,
            ws,
          });

          currentRoomId = roomId;
          currentPlayerId = playerId;

          ws.send(JSON.stringify({
            type: 'room-joined',
            payload: { roomId, playerId }
          }));

          // 广播房间状态
          broadcastRoomState(roomId);
          break;
        }

        case 'player-ready': {
          if (!currentRoomId || !currentPlayerId) break;

          const room = rooms.get(currentRoomId);
          if (!room) break;

          const player = room.players.get(currentPlayerId);
          if (player) {
            // 房主没有准备状态，只有"开始游戏"功能
            if (currentPlayerId !== room.hostId) {
              player.isReady = msg.payload.isReady;
            }
            broadcastRoomState(currentRoomId);
            
            // 检查是否可以开始游戏
            checkAndStartGame(currentRoomId);
          }
          break;
        }

        case 'start-game': {
          if (!currentRoomId || !currentPlayerId) break;

          const room = rooms.get(currentRoomId);
          if (!room) break;

          // 只有房主可以开始游戏
          if (currentPlayerId !== room.hostId) {
            ws.send(JSON.stringify({
              type: 'error',
              payload: { message: 'Only host can start game' }
            }));
            break;
          }

          const players = Array.from(room.players.values());
          
          // 检查人数是否足够
          if (players.length < 2) {
            ws.send(JSON.stringify({
              type: 'error',
              payload: { message: 'Need at least 2 players' }
            }));
            break;
          }

          // 检查除房主外的其他人是否都准备好了
          const otherPlayers = players.filter(p => p.id !== room.hostId);
          if (otherPlayers.length > 0 && !otherPlayers.every(p => p.isReady)) {
            ws.send(JSON.stringify({
              type: 'error',
              payload: { message: 'All players must be ready' }
            }));
            break;
          }

          // 开始游戏
          room.isGameStarted = true;
          broadcastToRoom(currentRoomId, {
            type: 'game-started'
          });
          break;
        }

        case 'leave-room': {
          if (currentRoomId && currentPlayerId) {
            const room = rooms.get(currentRoomId);
            if (room) {
              room.players.delete(currentPlayerId);
              
              // 如果房间为空，删除它
              if (room.players.size === 0) {
                rooms.delete(currentRoomId);
              } else {
                // 如果房主离开，指定新房主
                if (room.hostId === currentPlayerId) {
                  const newHost = room.players.values().next().value;
                  if (newHost) {
                    room.hostId = newHost.id;
                  }
                }
                // 广播房间状态给剩余玩家
                broadcastRoomState(currentRoomId);
              }
            }
            currentRoomId = null;
            currentPlayerId = null;
          }
          break;
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
    
    // If player was in a room, remove them only if game hasn't started
    if (currentRoomId && currentPlayerId) {
      const room = rooms.get(currentRoomId);
      if (room && !room.isGameStarted) {
        // 只有在游戏未开始时才清理玩家
        room.players.delete(currentPlayerId);
        
        // If room is empty, delete it
        if (room.players.size === 0) {
          rooms.delete(currentRoomId);
        } else {
          // Broadcast room state to remaining players
          broadcastRoomState(currentRoomId);
        }
      }
      // 如果游戏已经开始，不清理房间，保持房间存在供多人对战页面使用
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
const multiplayerWss = registerWsEndpoint('/ws/multiplayer');

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
            const players: MultiplayerPlayer[] = Array.from(lobbyRoom.players.values()).map((p) => {
              return createMultiplayerPlayer(p.id, p.name);
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
        
        case 'card:play': {
          if (!currentRoomId || !currentPlayerId) break;
          
          const gameRoom = gameRooms.get(currentRoomId);
          if (!gameRoom) break;
          
          const cardId = msg.payload.cardId;
          
          console.log('=== DEBUG card:play ===');
          console.log('cardId:', cardId);
          console.log('playerId:', currentPlayerId);
          
          const playerBefore = gameRoom.gameState.players[currentPlayerId];
          console.log('手牌数量（前）:', playerBefore.hand.length);
          console.log('手牌卡牌:', playerBefore.hand.map((c: any) => c.id));
          
          // 验证是否是当前玩家的回合
          if (!isCurrentPlayerTurn(gameRoom.gameState, currentPlayerId)) {
            ws.send(JSON.stringify({
              type: 'error',
              payload: { message: 'Not your turn' }
            }));
            break;
          }
          
          // 处理打出卡牌
          gameRoom.gameState = handlePlayCard(
            gameRoom.gameState,
            currentPlayerId,
            cardId
          );
          
          const playerAfter = gameRoom.gameState.players[currentPlayerId];
          console.log('手牌数量（后）:', playerAfter.hand.length);
          console.log('手牌卡牌:', playerAfter.hand.map((c: any) => c.id));
          console.log('=== END DEBUG ===');
          
          // 广播游戏状态给所有玩家
          broadcastGameState(currentRoomId);
          break;
        }
        
        case 'turn:end': {
          if (!currentRoomId || !currentPlayerId) break;
          
          const gameRoom = gameRooms.get(currentRoomId);
          if (!gameRoom) break;
          
          // 验证是否是当前玩家的回合
          if (!isCurrentPlayerTurn(gameRoom.gameState, currentPlayerId)) {
            ws.send(JSON.stringify({
              type: 'error',
              payload: { message: 'Not your turn' }
            }));
            break;
          }
          
          // 切换到下一个玩家
          gameRoom.gameState = nextPlayer(gameRoom.gameState);
          
          // 广播游戏状态给所有玩家
          broadcastGameState(currentRoomId);
          break;
        }
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
});

function broadcastGameState(roomId: string) {
  const gameRoom = gameRooms.get(roomId);
  if (!gameRoom) return;
  
  gameRoom.playerWsMap.forEach((ws, playerId) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'game:state',
        payload: { gameState: gameRoom.gameState }
      }));
    }
  });
}

// ─── Next.js 应用初始化 & HTTP 升级────────────────────
app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  // 监听 upgrade 事件，分发给对应 WS 端点
  server.on('upgrade', handleUpgrade);

  server.listen(port, () => {
    console.log(`> Server ready on http://${hostname}:${port}`);
  });
});
