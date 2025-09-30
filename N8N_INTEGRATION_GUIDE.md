# n8n Integration Guide for Admin Chat Assistant

## Current Implementation (HTTP/Fetch)

The chat currently uses HTTP POST requests to communicate with your n8n webhook. This is simple and works well for most use cases.

### Setup Steps:

1. **Update the endpoint in `src/components/ChatPopup.tsx`:**
   ```typescript
   const N8N_ENDPOINT = 'https://your-n8n-instance.com/webhook/chat';
   ```

2. **Configure your n8n workflow:**
   - Create a Webhook node (listening for POST requests)
   - Accept JSON with structure: `{ message: string, conversationId: string }`
   - Process the message (e.g., send to OpenAI, Claude, or other AI)
   - Return JSON response: `{ response: string }` or `{ message: string }`

### Example n8n Workflow:
```
Webhook (POST) → AI Node (OpenAI/Claude) → Response Node
```

---

## WebSocket Implementation (Advanced)

For real-time, bidirectional communication, you can upgrade to WebSockets. This enables:
- Streaming responses (word-by-word)
- Lower latency
- Persistent connections
- Server-initiated messages

### Option 1: Using n8n with WebSocket Proxy

Since n8n doesn't natively support WebSocket endpoints, you'll need a proxy server:

1. **Create a Node.js WebSocket Server:**

```javascript
// server.js
const WebSocket = require('ws');
const fetch = require('node-fetch');

const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', async (message) => {
    const data = JSON.parse(message);
    
    try {
      // Forward to n8n webhook
      const response = await fetch('https://your-n8n-instance.com/webhook/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      
      const result = await response.json();
      
      // Send response back through WebSocket
      ws.send(JSON.stringify({
        type: 'response',
        data: result
      }));
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        message: error.message
      }));
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});
```

2. **Update React Component to use WebSocket:**

```typescript
// src/hooks/useWebSocketChat.ts
import { useEffect, useRef, useState } from 'react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const useWebSocketChat = (url: string) => {
  const ws = useRef<WebSocket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    ws.current = new WebSocket(url);

    ws.current.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    ws.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'response') {
        const assistantMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: data.data.response || data.data.message,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMessage]);
        setIsLoading(false);
      }
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsLoading(false);
    };

    ws.current.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    return () => {
      ws.current?.close();
    };
  }, [url]);

  const sendMessage = (content: string) => {
    if (!ws.current || ws.current.readyState !== WebSocket.OPEN) {
      console.error('WebSocket not connected');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    ws.current.send(JSON.stringify({
      message: content,
      conversationId: 'admin-session-' + Date.now(),
    }));
  };

  return { messages, sendMessage, isConnected, isLoading };
};
```

### Option 2: Server-Sent Events (SSE) - Simpler Alternative

If you only need streaming responses (server to client), SSE is simpler than WebSocket:

```typescript
const sendMessageWithSSE = async (message: string) => {
  const eventSource = new EventSource(
    `${N8N_ENDPOINT}?message=${encodeURIComponent(message)}`
  );

  let assistantContent = '';

  eventSource.onmessage = (event) => {
    const chunk = JSON.parse(event.data);
    assistantContent += chunk.text;
    
    // Update message in real-time
    setMessages(prev => {
      const updated = [...prev];
      const lastMessage = updated[updated.length - 1];
      
      if (lastMessage?.role === 'assistant') {
        lastMessage.content = assistantContent;
      } else {
        updated.push({
          id: Date.now().toString(),
          role: 'assistant',
          content: assistantContent,
          timestamp: new Date(),
        });
      }
      
      return updated;
    });
  };

  eventSource.onerror = () => {
    eventSource.close();
    setIsLoading(false);
  };
};
```

---

## Recommendation

**For your use case (admin assistant with n8n):**

1. **Start with HTTP/Fetch** (current implementation) - It's simple, reliable, and works great for most scenarios
2. **Upgrade to SSE** if you want streaming responses without complexity
3. **Use WebSocket** only if you need bidirectional real-time features (e.g., server can push notifications, live updates)

The current implementation is production-ready and can handle thousands of requests efficiently!

---

## Security Considerations

### For HTTP Implementation:
- Add authentication headers to n8n requests
- Validate admin permissions before allowing chat access
- Rate limit requests to prevent abuse

### For WebSocket:
- Implement authentication on connection
- Use WSS (secure WebSocket) in production
- Add heartbeat/ping-pong to detect dead connections
- Implement reconnection logic with exponential backoff

---

## Testing Your Setup

1. **Test n8n webhook:**
   ```bash
   curl -X POST https://your-n8n-instance.com/webhook/chat \
     -H "Content-Type: application/json" \
     -d '{"message":"Hello","conversationId":"test-123"}'
   ```

2. **Expected response:**
   ```json
   {
     "response": "Hello! How can I help you today?"
   }
   ```

3. Update the endpoint in the code and test in the browser!
