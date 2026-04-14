import type { Response } from "express";

const clients = new Map<string, Response>();

export const crashSSEService = {
  addClient(userId: string, res: Response): void {
    clients.set(userId, res);
  },

  removeClient(userId: string): void {
    clients.delete(userId);
  },

  broadcast(event: object): void {
    const payload = `data: ${JSON.stringify(event)}\n\n`;
    for (const [userId, res] of clients) {
      try {
        res.write(payload);
      } catch {
        clients.delete(userId);
      }
    }
  },

  sendToClient(userId: string, event: object): void {
    const res = clients.get(userId);
    if (!res) return;
    try {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch {
      clients.delete(userId);
    }
  },
};
