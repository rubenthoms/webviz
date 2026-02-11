/**
 * Utilities for using the Publish/Subscribe pattern in React.
 */

import React from "react";

/**
 * A map of each payload that agents can send and receive for each topic
 */
export type TopicPayloads = Record<string, any>;

/**
 * Base pubsub interface
 */
export interface PublishSubscribe<TTopicPayloads extends TopicPayloads> {
    /**
     * Creates a function that fetches the most recent topic value. Note: make sure object payloads are reference stable when unchanged, to avoid unnecessary re-renders
     * @param topic Event topic
     */
    makeSnapshotGetter<T extends keyof TTopicPayloads>(topic: T): () => TTopicPayloads[T];
    getPublishSubscribeDelegate(): PublishSubscribeDelegate<TTopicPayloads>;
}

/**
 * PubSub subscriber manager. Can be used by PublishSubscribe implementers to manage registration and notification of subscribers
 */
export class PublishSubscribeDelegate<TTopicPayloads extends TopicPayloads> {
    private _subscribers = new Map<keyof TTopicPayloads, Set<() => void>>();

    // Transaction state
    private _transactionDepth = 0;
    private _pendingNotifications: Set<keyof TTopicPayloads> | null = null;

    beginTransaction(): void {
        this._transactionDepth++;
        if (this._transactionDepth === 1) {
            this._pendingNotifications = new Set();
        }
    }

    endTransaction(): void {
        if (this._transactionDepth === 0) {
            throw new Error("PublishSubscribeDelegate.endTransaction called without a matching beginTransaction.");
        }

        this._transactionDepth--;

        if (this._transactionDepth !== 0) return;

        const pendingNotifications = this._pendingNotifications;
        this._pendingNotifications = null;

        if (!pendingNotifications || pendingNotifications.size === 0) {
            return;
        }

        for (const topic of pendingNotifications) {
            const subscribers = this._subscribers.get(topic);
            if (subscribers) {
                subscribers.forEach((subscriber) => subscriber());
            }
        }
    }

    withTransaction<T>(transactionFunction: () => T): T {
        this.beginTransaction();
        try {
            const result = transactionFunction();
            return result;
        } finally {
            this.endTransaction();
        }
    }

    async withTransactionAsync<T>(transactionFunction: () => Promise<T>): Promise<T> {
        this.beginTransaction();
        try {
            return await transactionFunction();
        } finally {
            this.endTransaction();
        }
    }

    /**
     * Runs the topic callback for each subscriber
     * @param topic The topic to notify to
     */
    notifySubscribers(topic: keyof TTopicPayloads): void {
        if (this._transactionDepth > 0) {
            if (!this._pendingNotifications) {
                this._pendingNotifications = new Set();
            }
            this._pendingNotifications.add(topic);
            return;
        }

        const subscribers = this._subscribers.get(topic);
        if (subscribers) {
            subscribers.forEach((subscriber) => subscriber());
        }
    }

    subscribe(topic: keyof TTopicPayloads, handler: () => void): () => void {
        const subscribers = this._subscribers.get(topic) || new Set();
        subscribers.add(handler);
        this._subscribers.set(topic, subscribers);

        return () => {
            subscribers.delete(handler);
        };
    }

    /**
     * Registers a topic subscriber, returning an unsubscribe function
     * @param topic The topic to subscribe to
     * @returns An unsubscribe function
     */
    makeSubscriberFunction(topic: keyof TTopicPayloads): (onStoreChangeCallback: () => void) => () => void {
        // Using arrow function in order to keep "this" in context
        const subscriber = (onStoreChangeCallback: () => void): (() => void) => {
            return this.subscribe(topic, onStoreChangeCallback);
        };

        return subscriber;
    }
}

/**
 * Hook to set up a standard `React.useSyncExternalStore` pattern for a given topic.
 * @param publishSubscribe A PublishSubscribe instance.
 * @param topic The topic to subscribe to
 * @returns The current value of the topic.
 */
export function usePublishSubscribeTopicValue<
    TTopicPayloads extends TopicPayloads,
    TTopic extends keyof TTopicPayloads,
>(publishSubscribe: PublishSubscribe<TTopicPayloads>, topic: TTopic): TTopicPayloads[TTopic] {
    const value = React.useSyncExternalStore<TTopicPayloads[TTopic]>(
        publishSubscribe.getPublishSubscribeDelegate().makeSubscriberFunction(topic),
        publishSubscribe.makeSnapshotGetter(topic),
    );

    return value;
}
