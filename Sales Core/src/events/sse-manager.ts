// ── Server-Sent Events manager ──
import { Response } from 'express';
import { SseNotification } from '../types';

export class SseManager {
  private connections: Map<string, Response> = new Map();

  addConnection(id: string, res: Response): void {
    this.connections.set(id, res);
  }

  removeConnection(id: string): void {
    this.connections.delete(id);
  }

  broadcast(notification: SseNotification): void {
    const payload = `data: ${JSON.stringify(notification)}\n\n`;
    for (const res of this.connections.values()) {
      if (!res.writableEnded) {
        res.write(payload);
      }
    }
  }
}

export const sseManager = new SseManager();
