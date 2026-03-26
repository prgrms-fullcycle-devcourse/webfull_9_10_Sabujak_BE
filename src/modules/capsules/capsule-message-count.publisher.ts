import { Response } from "express";

type MessageCountSubscriber = {
  cleanup: () => void;
  id: number;
  response: Response;
};

type SubscribeInput = {
  slug: string;
  response: Response;
  initialMessageCount: number;
};

type PublishPayload = {
  messageCount: number;
};

const HEARTBEAT_INTERVAL_MS = 25_000;

const formatSseEvent = (event: string, payload: PublishPayload) =>
  `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;

export interface CapsuleMessageCountPublisher {
  subscribe(input: SubscribeInput): () => void;
  publish(slug: string, payload: PublishPayload): void;
}

export class InMemoryCapsuleMessageCountPublisher implements CapsuleMessageCountPublisher {
  private readonly subscribers = new Map<string, Set<MessageCountSubscriber>>();
  private nextSubscriberId = 1;

  subscribe({ slug, response, initialMessageCount }: SubscribeInput) {
    response.setHeader("Content-Type", "text/event-stream");
    response.setHeader("Cache-Control", "no-cache, no-transform");
    response.setHeader("Connection", "keep-alive");
    response.setHeader("X-Accel-Buffering", "no");
    response.flushHeaders();

    const subscriber: MessageCountSubscriber = {
      cleanup: () => undefined,
      id: this.nextSubscriberId,
      response,
    };
    this.nextSubscriberId += 1;

    const group =
      this.subscribers.get(slug) ?? new Set<MessageCountSubscriber>();
    group.add(subscriber);
    this.subscribers.set(slug, group);

    response.write(
      formatSseEvent("messageCount", { messageCount: initialMessageCount }),
    );

    const heartbeatTimer = setInterval(() => {
      response.write(": keep-alive\n\n");
    }, HEARTBEAT_INTERVAL_MS);

    const cleanup = () => {
      clearInterval(heartbeatTimer);
      response.off("close", cleanup);

      const currentGroup = this.subscribers.get(slug);

      if (!currentGroup) {
        return;
      }

      currentGroup.forEach((candidate) => {
        if (candidate.id === subscriber.id) {
          currentGroup.delete(candidate);
        }
      });

      if (currentGroup.size === 0) {
        this.subscribers.delete(slug);
      }
    };

    subscriber.cleanup = cleanup;
    response.on("close", cleanup);
    return cleanup;
  }

  publish(slug: string, payload: PublishPayload) {
    const group = this.subscribers.get(slug);

    if (!group || group.size === 0) {
      return;
    }

    const event = formatSseEvent("messageCount", payload);

    Array.from(group).forEach((subscriber) => {
      try {
        subscriber.response.write(event);
      } catch (error) {
        console.error(
          "[capsules] Failed to write messageCount SSE event.",
          error,
        );
        subscriber.cleanup();
      }
    });

    if (group.size === 0) {
      this.subscribers.delete(slug);
    }
  }

  getSubscriberCount(slug: string) {
    return this.subscribers.get(slug)?.size ?? 0;
  }

  clear() {
    Array.from(this.subscribers.values()).forEach((group) => {
      Array.from(group).forEach((subscriber) => {
        subscriber.cleanup();
      });
    });
  }
}

export const capsuleMessageCountPublisher =
  new InMemoryCapsuleMessageCountPublisher();
