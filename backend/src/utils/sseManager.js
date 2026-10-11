/**
 * Server-Sent Events (SSE) manager.
 *
 * Manages real-time connections for pushing notifications to connected clients.
 * Uses a simple in-memory store of user connections.
 */

class SSEManager {
  constructor() {
    // Map<userId, Set<res>>
    this.connections = new Map();
  }

  /**
   * Add a new SSE connection for a user.
   */
  addConnection(userId, res) {
    if (!this.connections.has(userId)) {
      this.connections.set(userId, new Set());
    }

    this.connections.get(userId).add(res);

    // Clean up on close
    res.on('close', () => {
      this.removeConnection(userId, res);
    });
  }

  /**
   * Remove an SSE connection.
   */
  removeConnection(userId, res) {
    const userConnections = this.connections.get(userId);

    if (userConnections) {
      userConnections.delete(res);

      if (userConnections.size === 0) {
        this.connections.delete(userId);
      }
    }
  }

  /**
   * Send an event to a specific user.
   */
  sendToUser(userId, event) {
    const userConnections = this.connections.get(userId);

    if (!userConnections || userConnections.size === 0) {
      return false;
    }

    const data = `data: ${JSON.stringify(event)}\n\n`;

    for (const res of userConnections) {
      try {
        res.write(data);
      } catch (error) {
        console.error(`[sse] Failed to send to user ${userId}:`, error.message);
        this.removeConnection(userId, res);
      }
    }

    return true;
  }

  /**
   * Send an event to multiple users.
   */
  sendToUsers(userIds, event) {
    const results = {};

    for (const userId of userIds) {
      results[userId] = this.sendToUser(userId, event);
    }

    return results;
  }

  /**
   * Broadcast an event to all connected users.
   */
  broadcast(event) {
    const data = `data: ${JSON.stringify(event)}\n\n`;

    for (const [userId, connections] of this.connections) {
      for (const res of connections) {
        try {
          res.write(data);
        } catch (error) {
          console.error(`[sse] Broadcast failed for user ${userId}:`, error.message);
          this.removeConnection(userId, res);
        }
      }
    }
  }

  /**
   * Get connection count for a user.
   */
  getConnectionCount(userId) {
    return this.connections.get(userId)?.size || 0;
  }

  /**
   * Get total connection count.
   */
  getTotalConnectionCount() {
    let total = 0;

    for (const connections of this.connections.values()) {
      total += connections.size;
    }

    return total;
  }

  /**
   * Close all connections for a user.
   */
  closeUserConnections(userId) {
    const userConnections = this.connections.get(userId);

    if (userConnections) {
      for (const res of userConnections) {
        try {
          res.end();
        } catch {
          // Ignore errors on close
        }
      }

      this.connections.delete(userId);
    }
  }

  /**
   * Close all connections.
   */
  closeAll() {
    for (const [userId, connections] of this.connections) {
      for (const res of connections) {
        try {
          res.end();
        } catch {
          // Ignore errors on close
        }
      }
    }

    this.connections.clear();
  }
}

// Singleton instance
let sseManagerInstance = null;

export const getSSEManager = () => {
  if (!sseManagerInstance) {
    sseManagerInstance = new SSEManager();
  }

  return sseManagerInstance;
};

export {
  SSEManager,
};

export default getSSEManager;
