// Real-time synchronization bus across tabs, windows, and devices

export type SyncEventType = 'sale' | 'product' | 'stock' | 'purchase' | 'customer' | 'supplier' | 'settings' | 'refresh';

export interface SyncMessage {
  type: SyncEventType;
  action?: 'create' | 'update' | 'delete';
  id?: string;
  data?: any;
  timestamp: number;
  originId: string;
}

// Generate unique ID for this browser tab/session
const SESSION_ID = 'session_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now();

let channel: BroadcastChannel | null = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    channel = new BroadcastChannel('smartshop_pos_realtime_sync');
  }
} catch (e) {
  console.warn('BroadcastChannel not available, falling back to storage events:', e);
}

const listeners: Set<(msg: SyncMessage) => void> = new Set();

if (channel) {
  channel.onmessage = (event: MessageEvent<SyncMessage>) => {
    if (event.data && event.data.originId !== SESSION_ID) {
      listeners.forEach((listener) => {
        try {
          listener(event.data);
        } catch (err) {
          console.warn('Error in sync listener:', err);
        }
      });
    }
  };
}

// Fallback to localStorage events for cross-tab updates
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === 'smartshop_cross_tab_trigger' && event.newValue) {
      try {
        const msg = JSON.parse(event.newValue) as SyncMessage;
        if (msg && msg.originId !== SESSION_ID) {
          listeners.forEach((listener) => {
            try {
              listener(msg);
            } catch (err) {
              console.warn('Error in sync listener from storage event:', err);
            }
          });
        }
      } catch {
        // Ignore JSON parse errors
      }
    }
  });
}

/**
 * Broadcast an event to other tabs on the same device
 */
export function broadcastSync(type: SyncEventType, action: 'create' | 'update' | 'delete' = 'update', data?: any, id?: string): void {
  const msg: SyncMessage = {
    type,
    action,
    id,
    data,
    timestamp: Date.now(),
    originId: SESSION_ID,
  };

  try {
    if (channel) {
      channel.postMessage(msg);
    }
    // Also trigger storage event for browsers without BroadcastChannel or background contexts
    localStorage.setItem('smartshop_cross_tab_trigger', JSON.stringify(msg));
  } catch (err) {
    console.warn('broadcastSync error:', err);
  }
}

/**
 * Subscribe to sync messages from other tabs/windows
 */
export function subscribeToSync(listener: (msg: SyncMessage) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
