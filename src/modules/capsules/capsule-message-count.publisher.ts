import { Response } from "express";

type MessageCountSubscriber = {
  cleanup: () => void;
  expirationTimer: NodeJS.Timeout | null;
  id: number;
  initialized: boolean;
  response: Response;
};

type MessageCountChannel = {
  lastDeliveredCount: number;
  subscribers: Set<MessageCountSubscriber>;
};

type SubscribeInput = {
  getSnapshot: () => Promise<{
    expiresAt: string;
    messageCount: number;
  }>;
  response: Response;
  slug: string;
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
  closeSlug(slug: string): void;
}

export class InMemoryCapsuleMessageCountPublisher implements CapsuleMessageCountPublisher {
  private readonly channels = new Map<string, MessageCountChannel>();
  private nextSubscriberId = 1;

  subscribe({ slug, response, getSnapshot }: SubscribeInput) {
    response.setHeader("Content-Type", "text/event-stream");
    response.setHeader("Cache-Control", "no-cache, no-transform");
    response.setHeader("Connection", "keep-alive");
    response.setHeader("X-Accel-Buffering", "no");
    response.flushHeaders();

    const subscriber: MessageCountSubscriber = {
      cleanup: () => undefined,
      expirationTimer: null,
      id: this.nextSubscriberId,
      initialized: false,
      response,
    };
    this.nextSubscriberId += 1;

    // 조회보다 먼저 구독자를 채널에 붙여야 subscribe 직전 publish 를 놓치지 않습니다.
    const channel = this.getOrCreateChannel(slug);
    const handleClose = () => cleanup();
    response.on("close", handleClose);

    const cleanup = () => {
      if (subscriber.expirationTimer) {
        clearTimeout(subscriber.expirationTimer);
        subscriber.expirationTimer = null;
      }

      response.off("close", handleClose);

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

    channel.subscribers.add(subscriber);

    const heartbeatTimer = setInterval(() => {
      response.write(": keep-alive\n\n");
    }, HEARTBEAT_INTERVAL_MS);

    const release = () => {
      clearInterval(heartbeatTimer);
      cleanup();
    };

    void this.initializeSubscriber(slug, subscriber, getSnapshot).catch(
      (error) => {
        console.error(
          "[capsules] Failed to initialize messageCount SSE subscriber.",
          error,
        );

        release();

        if (!response.writableEnded) {
          response.end();
        }
      },
    );

    subscriber.cleanup = release;
    return release;
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
      if (!subscriber.initialized) {
        return;
      }

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

  closeSlug(slug: string) {
    const channel = this.channels.get(slug);

    if (!channel) {
      return;
    }

    Array.from(channel.subscribers).forEach((subscriber) => {
      subscriber.cleanup();

      if (!subscriber.response.writableEnded) {
        subscriber.response.end();
      }
    });

    this.channels.delete(slug);
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

  private async initializeSubscriber(
    slug: string,
    subscriber: MessageCountSubscriber,
    getSnapshot: SubscribeInput["getSnapshot"],
  ) {
    const snapshot = await getSnapshot();
    const channel = this.channels.get(slug);

    if (!channel || !channel.subscribers.has(subscriber)) {
      return;
    }

    // 초기 스냅샷이 늦게 도착해도, 이미 같은 채널에 전달된 더 큰 count 아래로 내려가지 않습니다.
    const initialMessageCount = Math.max(
      snapshot.messageCount,
      channel.lastDeliveredCount,
    );

    channel.lastDeliveredCount = initialMessageCount;
    subscriber.initialized = true;
    subscriber.expirationTimer = this.createExpirationTimer(
      slug,
      snapshot.expiresAt,
    );

    subscriber.response.write(
      formatSseEvent("messageCount", { messageCount: initialMessageCount }),
    );
  }

  private createExpirationTimer(slug: string, expiresAt: string) {
    const delay = new Date(expiresAt).getTime() - Date.now();

    if (delay <= 0) {
      this.closeSlug(slug);
      return null;
    }

    // polling 대신 구독 시점의 expiresAt 기준 타이머로 만료된 stream 을 정리합니다.
    return setTimeout(() => {
      this.closeSlug(slug);
    }, delay);
  }

  private getOrCreateChannel(slug: string) {
    const existingChannel = this.channels.get(slug);

    if (existingChannel) {
      return existingChannel;
    }

    const channel: MessageCountChannel = {
      lastDeliveredCount: 0,
      subscribers: new Set<MessageCountSubscriber>(),
    };

    this.channels.set(slug, channel);
    return channel;
  }
}

export const capsuleMessageCountPublisher =
  new InMemoryCapsuleMessageCountPublisher();
