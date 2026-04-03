import { Response } from "express";

type CapsuleStatsPayload = {
  totalCapsuleCount: number;
  totalMessageCount: number;
};

type CapsuleStatsSubscriber = {
  cleanup: () => void;
  id: number;
  initialized: boolean;
  response: Response;
};

type SubscribeInput = {
  getSnapshot: () => Promise<CapsuleStatsPayload>;
  response: Response;
};

const HEARTBEAT_INTERVAL_MS = 25_000;

const formatSseEvent = (event: string, payload: CapsuleStatsPayload) =>
  `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;

export interface CapsuleStatsPublisher {
  subscribe(input: SubscribeInput): Promise<() => void>;
  publish(payload: CapsuleStatsPayload): void;
  clear(): void;
}

export class InMemoryCapsuleStatsPublisher implements CapsuleStatsPublisher {
  private readonly subscribers = new Set<CapsuleStatsSubscriber>();
  private nextSubscriberId = 1;
  private lastDeliveredPayload: CapsuleStatsPayload | null = null;

  async subscribe({ response, getSnapshot }: SubscribeInput) {
    const subscriber: CapsuleStatsSubscriber = {
      cleanup: () => undefined,
      id: this.nextSubscriberId,
      initialized: false,
      response,
    };
    this.nextSubscriberId += 1;

    const handleClose = () => cleanup();
    response.on("close", handleClose);

    const cleanup = () => {
      response.off("close", handleClose);
      this.subscribers.forEach((candidate) => {
        if (candidate.id === subscriber.id) {
          this.subscribers.delete(candidate);
        }
      });
    };

    this.subscribers.add(subscriber);

    try {
      const snapshot = await getSnapshot();

      if (!this.subscribers.has(subscriber)) {
        return () => undefined;
      }

      response.setHeader("Content-Type", "text/event-stream");
      response.setHeader("Cache-Control", "no-cache, no-transform");
      response.setHeader("Connection", "keep-alive");
      response.setHeader("X-Accel-Buffering", "no");
      response.flushHeaders();

      const heartbeatTimer = setInterval(() => {
        response.write(": keep-alive\n\n");
      }, HEARTBEAT_INTERVAL_MS);

      const release = () => {
        clearInterval(heartbeatTimer);
        cleanup();
      };

      subscriber.cleanup = release;
      this.initializeSubscriber(subscriber, snapshot);

      return release;
    } catch (error) {
      cleanup();
      throw error;
    }
  }

  publish(payload: CapsuleStatsPayload) {
    if (this.subscribers.size === 0) {
      this.lastDeliveredPayload = payload;
      return;
    }

    if (
      this.lastDeliveredPayload &&
      this.lastDeliveredPayload.totalCapsuleCount === payload.totalCapsuleCount &&
      this.lastDeliveredPayload.totalMessageCount === payload.totalMessageCount
    ) {
      return;
    }

    this.lastDeliveredPayload = payload;
    const event = formatSseEvent("capsuleStats", payload);

    Array.from(this.subscribers).forEach((subscriber) => {
      if (!subscriber.initialized) {
        return;
      }

      try {
        subscriber.response.write(event);
      } catch (error) {
        console.error("[capsules] Failed to write capsuleStats SSE event.", error);
        subscriber.cleanup();
      }
    });
  }

  clear() {
    Array.from(this.subscribers).forEach((subscriber) => {
      subscriber.cleanup();
    });
    this.lastDeliveredPayload = null;
  }

  private initializeSubscriber(
    subscriber: CapsuleStatsSubscriber,
    snapshot: CapsuleStatsPayload,
  ) {
    if (!this.subscribers.has(subscriber)) {
      return;
    }

    this.lastDeliveredPayload = snapshot;
    subscriber.initialized = true;
    subscriber.response.write(formatSseEvent("capsuleStats", snapshot));
  }
}

export const capsuleStatsPublisher = new InMemoryCapsuleStatsPublisher();
