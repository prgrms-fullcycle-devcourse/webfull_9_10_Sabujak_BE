import { Response } from "express";

type MessageCountSubscriber = {
  cleanup: () => void;
  id: number;
  response: Response;
};

type MessageCountChannel = {
  lastDeliveredCount: number;
  subscribers: Set<MessageCountSubscriber>;
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
  private readonly channels = new Map<string, MessageCountChannel>();
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

    const channel = this.getOrCreateChannel(slug, initialMessageCount);
    channel.lastDeliveredCount = Math.max(
      channel.lastDeliveredCount,
      initialMessageCount,
    );
    channel.subscribers.add(subscriber);

    response.write(
      formatSseEvent("messageCount", { messageCount: initialMessageCount }),
    );

    const heartbeatTimer = setInterval(() => {
      response.write(": keep-alive\n\n");
    }, HEARTBEAT_INTERVAL_MS);

    const cleanup = () => {
      clearInterval(heartbeatTimer);
      response.off("close", cleanup);

      const channel = this.channels.get(slug);

      if (!channel) {
        return;
      }

      channel.subscribers.forEach((candidate) => {
        if (candidate.id === subscriber.id) {
          channel.subscribers.delete(candidate);
        }
      });

      if (channel.subscribers.size === 0) {
        this.channels.delete(slug);
      }
    };

    subscriber.cleanup = cleanup;
    response.on("close", cleanup);
    return cleanup;
  }

  publish(slug: string, payload: PublishPayload) {
    const channel = this.channels.get(slug);

    if (!channel || channel.subscribers.size === 0) {
      return;
    }

    // 생성 이벤트만 존재하는 현재 범위에서는 더 작은 count를 늦게 보내지 않습니다.
    if (payload.messageCount < channel.lastDeliveredCount) {
      return;
    }

    channel.lastDeliveredCount = payload.messageCount;

    const event = formatSseEvent("messageCount", payload);

    Array.from(channel.subscribers).forEach((subscriber) => {
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

    if (channel.subscribers.size === 0) {
      this.channels.delete(slug);
    }
  }

  getSubscriberCount(slug: string) {
    return this.channels.get(slug)?.subscribers.size ?? 0;
  }

  clear() {
    Array.from(this.channels.values()).forEach((channel) => {
      Array.from(channel.subscribers).forEach((subscriber) => {
        subscriber.cleanup();
      });
    });
  }

  private getOrCreateChannel(slug: string, initialMessageCount: number) {
    const existingChannel = this.channels.get(slug);

    if (existingChannel) {
      return existingChannel;
    }

    const channel: MessageCountChannel = {
      lastDeliveredCount: initialMessageCount,
      subscribers: new Set<MessageCountSubscriber>(),
    };

    this.channels.set(slug, channel);
    return channel;
  }
}

export const capsuleMessageCountPublisher =
  new InMemoryCapsuleMessageCountPublisher();
