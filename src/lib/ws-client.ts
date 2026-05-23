export interface WsMessage<T = unknown> {
  type: string;
  payload: T;
}

interface WsOptions {
  path: string;
  onMessage: (msg: WsMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  reconnect?: boolean;
  heartbeatMs?: number;
}

export function createWsConnection(opts: WsOptions): {
  send: (msg: WsMessage) => void;
  close: () => void;
} {
  const {
    path,
    onMessage,
    onOpen,
    onClose,
    reconnect = true,
    heartbeatMs = 30000
  } = opts;
  
  let ws: WebSocket;
  let heartbeatTimer: ReturnType<typeof setInterval>;
  let closed = false;

  function connect() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${location.host}${path}`);

    ws.onopen = () => {
      console.log('WebSocket connected');
      heartbeatTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'ping', payload: null }));
        }
      }, heartbeatMs);
      onOpen?.();
    };

    ws.onmessage = (e) => {
      try {
        const msg: WsMessage = JSON.parse(e.data);
        if (msg.type === 'pong') return;
        onMessage(msg);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      clearInterval(heartbeatTimer);
      onClose?.();
      if (reconnect && !closed) {
        setTimeout(connect, 1000);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
  }

  connect();

  return {
    send: (msg) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    },
    close: () => {
      closed = true;
      ws.close();
    },
  };
}
