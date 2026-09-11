import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import type { GenerationData, GenerationRequest } from '@canvas/contracts';
import { createGeneration, getGeneration, listGenerations } from '../../lib/api/generations';
import { ApiError, toApiError } from '../../lib/api/errors';
import { pollUntilSettled } from '../../lib/async/poll';
import { isAbortError } from '../../lib/async/abort';
import { pickCurrentGenerations } from '../../lib/generation/reconcile';
import type { GraphSyncController } from '../graph/GraphSyncController';

export type Scenario = GenerationRequest['scenario'];

export interface AttemptState {
  status: 'idle' | 'submitting' | 'processing' | 'succeeded' | 'failed' | 'error';
  generation: GenerationData | null;
  error: ApiError | null;
  retryableKey: string | null;
  retryableBody: GenerationRequest | null;
}

const IDLE_ATTEMPT: AttemptState = {
  status: 'idle',
  generation: null,
  error: null,
  retryableKey: null,
  retryableBody: null,
};

type Listener = () => void;

class GenerationsController {
  private attempts = new Map<string, AttemptState>();
  private readonly submitting = new Set<string>();
  private readonly listeners = new Set<Listener>();
  private readonly abort = new AbortController();
  private snapshot = new Map(this.attempts);

  constructor(
    private readonly spaceId: string,
    private readonly graphSync: GraphSyncController,
    private readonly pollIntervalMs: number,
  ) {
    void this.restore();
  }

  private emit() {
    this.snapshot = new Map(this.attempts);
    for (const listener of this.listeners) listener();
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): Map<string, AttemptState> => this.snapshot;

  private setAttempt(nodeId: string, attempt: AttemptState) {
    this.attempts.set(nodeId, attempt);
    this.emit();
  }

  private async restore(): Promise<void> {
    try {
      await this.graphSync.ready$;
      const nodeIds = new Set(this.graphSync.getSnapshot().nodes.map((node) => node.id));
      const generations = await listGenerations(this.spaceId, this.abort.signal);
      const current = pickCurrentGenerations(generations, nodeIds);
      for (const [nodeId, generation] of current) {
        this.attempts.set(nodeId, {
          status: generation.status,
          generation,
          error: null,
          retryableKey: null,
          retryableBody: null,
        });
        if (generation.status === 'processing') void this.trackUntilSettled(nodeId, generation.id);
      }
      this.emit();
    } catch {}
  }

  async generate(nodeId: string, scenario: Scenario): Promise<void> {
    if (this.submitting.has(nodeId)) return;
    const current = this.attempts.get(nodeId);
    if (current?.status === 'processing') return;

    this.submitting.add(nodeId);
    this.setAttempt(nodeId, { ...IDLE_ATTEMPT, status: 'submitting' });

    const flushed = await this.graphSync.flush();
    if (!flushed.ok) {
      this.submitting.delete(nodeId);
      this.setAttempt(nodeId, { ...IDLE_ATTEMPT, status: 'error', error: flushed.error });
      return;
    }

    const etag = this.graphSync.getCommittedEtag();
    if (!etag) {
      this.submitting.delete(nodeId);
      this.setAttempt(nodeId, {
        ...IDLE_ATTEMPT,
        status: 'error',
        error: new ApiError('GRAPH_NOT_READY', 'Граф ещё не готов к запуску генерации.'),
      });
      return;
    }

    const key = crypto.randomUUID();
    const body: GenerationRequest = { nodeId, graphETag: etag, scenario };
    await this.submit(nodeId, key, body);
  }

  async retryAfterNetworkError(nodeId: string): Promise<void> {
    const current = this.attempts.get(nodeId);
    if (!current?.retryableKey || !current.retryableBody || this.submitting.has(nodeId)) return;
    this.submitting.add(nodeId);
    this.setAttempt(nodeId, { ...current, status: 'submitting' });
    await this.submit(nodeId, current.retryableKey, current.retryableBody);
  }

  private async submit(nodeId: string, key: string, body: GenerationRequest): Promise<void> {
    try {
      const generation = await createGeneration(this.spaceId, body, key, this.abort.signal);
      this.submitting.delete(nodeId);
      this.setAttempt(nodeId, {
        status: generation.status,
        generation,
        error: null,
        retryableKey: null,
        retryableBody: null,
      });
      if (generation.status === 'processing') void this.trackUntilSettled(nodeId, generation.id);
    } catch (error) {
      this.submitting.delete(nodeId);
      const apiError = toApiError(error, 'Не удалось запустить генерацию.');
      const networkError = apiError.code === 'NETWORK_ERROR';
      this.setAttempt(nodeId, {
        status: 'error',
        generation: null,
        error: apiError,
        retryableKey: networkError ? key : null,
        retryableBody: networkError ? body : null,
      });
    }
  }

  private async trackUntilSettled(nodeId: string, generationId: string): Promise<void> {
    try {
      const settled = await pollUntilSettled(
        (signal) => getGeneration(this.spaceId, generationId, signal),
        {
          intervalMs: this.pollIntervalMs,
          isSettled: (value) => value.status !== 'processing',
          signal: this.abort.signal,
        },
      );
      this.setAttempt(nodeId, {
        status: settled.status,
        generation: settled,
        error: null,
        retryableKey: null,
        retryableBody: null,
      });
    } catch (error) {
      if (isAbortError(error)) return;
      this.setAttempt(nodeId, {
        status: 'error',
        generation: null,
        error: toApiError(error, 'Не удалось получить статус генерации.'),
        retryableKey: null,
        retryableBody: null,
      });
    }
  }

  destroy(): void {
    this.abort.abort();
    this.listeners.clear();
  }
}

const EMPTY_ATTEMPTS: ReadonlyMap<string, AttemptState> = new Map();
const noopSubscribe = () => () => {};
const getEmptyAttempts = () => EMPTY_ATTEMPTS;

export function useGenerations(
  spaceId: string,
  graphSync: GraphSyncController,
  pollIntervalMs: number,
) {
  const [controller, setController] = useState<GenerationsController | null>(null);

  useEffect(() => {
    const next = new GenerationsController(spaceId, graphSync, pollIntervalMs);
    setController(next);
    return () => next.destroy();
  }, [spaceId, graphSync, pollIntervalMs]);

  const attempts = useSyncExternalStore(
    controller ? controller.subscribe : noopSubscribe,
    controller ? controller.getSnapshot : getEmptyAttempts,
  );

  const generate = useCallback(
    (nodeId: string, scenario: Scenario) => controller?.generate(nodeId, scenario),
    [controller],
  );
  const retryAfterNetworkError = useCallback(
    (nodeId: string) => controller?.retryAfterNetworkError(nodeId),
    [controller],
  );

  return { attempts, generate, retryAfterNetworkError };
}
