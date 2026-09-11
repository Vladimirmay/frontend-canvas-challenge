import {
  applyEdgeChanges,
  applyNodeChanges,
  type EdgeChange,
  type NodeChange,
  type Viewport,
} from '@xyflow/react';
import { getGraph, putGraph } from '../../lib/api/graph';
import { ApiError, toApiError } from '../../lib/api/errors';
import { createDebouncer, type Debouncer } from '../../lib/async/debounce';
import { fromPersistedGraph, toPersistedGraph } from '../../lib/graph/persist';
import type { CanvasEdge, CanvasNode, LabelData, PromptData } from '../../lib/graph/types';

export type SaveStatus = 'loading' | 'unsaved' | 'saving' | 'saved' | 'error';
export type SaveResult = { ok: true } | { ok: false; error: ApiError };

export interface GraphSnapshot {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
  viewport: Viewport;
  saveStatus: SaveStatus;
  error: ApiError | null;
  conflict: boolean;
  ready: boolean;
}

type Listener = () => void;

const EMPTY_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };

export class GraphSyncController {
  private nodes: CanvasNode[] = [];
  private edges: CanvasEdge[] = [];
  private viewport: Viewport = EMPTY_VIEWPORT;
  private committedEtag: string | null = null;
  private dirty = false;
  private ready = false;
  private saveStatus: SaveStatus = 'loading';
  private error: ApiError | null = null;
  private conflictDraft: string | null = null;
  private driver: Promise<SaveResult> | null = null;
  private readonly debouncer: Debouncer;
  private readonly listeners = new Set<Listener>();
  private snapshot: GraphSnapshot;
  readonly ready$: Promise<void>;

  constructor(
    private readonly spaceId: string,
    debounceMs: number,
  ) {
    this.debouncer = createDebouncer(() => void this.ensureSaved(), debounceMs);
    this.snapshot = this.buildSnapshot();
    this.ready$ = this.load();
  }

  private buildSnapshot(): GraphSnapshot {
    return {
      nodes: this.nodes,
      edges: this.edges,
      viewport: this.viewport,
      saveStatus: this.saveStatus,
      error: this.error,
      conflict: this.conflictDraft !== null,
      ready: this.ready,
    };
  }

  private emit() {
    this.snapshot = this.buildSnapshot();
    for (const listener of this.listeners) listener();
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = (): GraphSnapshot => this.snapshot;

  getCommittedEtag(): string | null {
    return this.committedEtag;
  }

  private async load(): Promise<void> {
    this.saveStatus = 'loading';
    this.emit();
    try {
      const { graph, etag } = await getGraph(this.spaceId);
      const restored = fromPersistedGraph(graph);
      this.nodes = restored.nodes;
      this.edges = restored.edges;
      this.viewport = restored.viewport;
      this.committedEtag = etag;
      this.dirty = false;
      this.conflictDraft = null;
      this.ready = true;
      this.saveStatus = 'saved';
      this.error = null;
    } catch (error) {
      this.error = toApiError(error, 'Не удалось загрузить граф.');
      this.saveStatus = 'error';
    }
    this.emit();
  }

  onNodesChange(changes: NodeChange<CanvasNode>[]): void {
    if (!this.ready) return;
    this.nodes = applyNodeChanges(changes, this.nodes);
    this.applyChange(
      changes.some((change) => change.type !== 'dimensions' && change.type !== 'select'),
    );
  }

  onEdgesChange(changes: EdgeChange<CanvasEdge>[]): void {
    if (!this.ready) return;
    this.edges = applyEdgeChanges(changes, this.edges);
    this.applyChange(changes.some((change) => change.type !== 'select'));
  }

  addNode(node: CanvasNode): void {
    if (!this.ready) return;
    this.nodes = [...this.nodes, node];
    this.applyChange(true);
  }

  addEdge(edge: CanvasEdge): void {
    if (!this.ready) return;
    this.edges = [...this.edges, edge];
    this.applyChange(true);
  }

  updateNodeData(nodeId: string, data: Partial<PromptData & LabelData>): void {
    if (!this.ready) return;
    this.nodes = this.nodes.map((node) =>
      node.id === nodeId ? ({ ...node, data: { ...node.data, ...data } } as CanvasNode) : node,
    );
    this.applyChange(true);
  }

  removeNodesCascade(deletedIds: Set<string>): void {
    if (!this.ready || deletedIds.size === 0) return;
    this.nodes = this.nodes.filter((node) => !deletedIds.has(node.id));
    this.edges = this.edges.filter(
      (edge) => !deletedIds.has(edge.source) && !deletedIds.has(edge.target),
    );
    this.applyChange(true);
  }

  setViewport(viewport: Viewport): void {
    if (!this.ready) return;
    this.viewport = viewport;
    this.applyChange(true);
  }

  private applyChange(isPersistedChange: boolean): void {
    if (isPersistedChange) {
      this.dirty = true;
      if (this.saveStatus !== 'saving') this.saveStatus = 'unsaved';
    }
    this.emit();
    if (isPersistedChange) this.debouncer.trigger();
  }

  async flush(): Promise<SaveResult> {
    if (!this.ready)
      return { ok: false, error: new ApiError('GRAPH_NOT_READY', 'Граф ещё не загружен.') };
    this.debouncer.cancel();
    return this.ensureSaved();
  }

  resolveConflict(): void {
    if (this.conflictDraft === null) return;
    this.conflictDraft = null;
    void this.load();
  }

  destroy(): void {
    this.debouncer.cancel();
    this.listeners.clear();
  }

  private ensureSaved(): Promise<SaveResult> {
    if (this.driver) return this.driver;
    const loop = this.runSaveLoop().finally(() => {
      this.driver = null;
    });
    this.driver = loop;
    return loop;
  }

  private async runSaveLoop(): Promise<SaveResult> {
    for (;;) {
      if (this.conflictDraft !== null) {
        return {
          ok: false,
          error: new ApiError(
            'GRAPH_VERSION_CONFLICT',
            'Граф изменился на сервере. Перечитайте его перед продолжением.',
          ),
        };
      }
      if (!this.dirty) return { ok: true };
      const result = await this.doSave();
      if (!result.ok) return result;
    }
  }

  private async doSave(): Promise<SaveResult> {
    const etag = this.committedEtag;
    if (!etag)
      return { ok: false, error: new ApiError('PRECONDITION_REQUIRED', 'Граф ещё не загружен.') };

    const raw = JSON.stringify(toPersistedGraph(this.nodes, this.edges, this.viewport));
    this.dirty = false;
    this.saveStatus = 'saving';
    this.emit();

    try {
      const saved = await putGraph(this.spaceId, raw, etag);
      this.committedEtag = saved.etag;
      this.error = null;
      this.saveStatus = this.dirty ? 'unsaved' : 'saved';
      this.emit();
      return { ok: true };
    } catch (error) {
      if (error instanceof ApiError && error.code === 'GRAPH_VERSION_CONFLICT') {
        this.conflictDraft = raw;
        this.dirty = true;
        this.error = error;
        this.saveStatus = 'error';
        this.emit();
        return { ok: false, error };
      }
      if (error instanceof ApiError && error.code === 'NETWORK_ERROR') {
        return this.recoverFromLostResponse(raw, etag, error);
      }
      this.dirty = true;
      this.error = toApiError(error, 'Не удалось сохранить граф.');
      this.saveStatus = 'error';
      this.emit();
      return { ok: false, error: this.error };
    }
  }

  private async recoverFromLostResponse(
    sentRaw: string,
    sentEtag: string,
    original: ApiError,
  ): Promise<SaveResult> {
    try {
      const server = await getGraph(this.spaceId);
      this.committedEtag = server.etag;
      if (server.raw === sentRaw) {
        this.error = null;
        this.saveStatus = this.dirty ? 'unsaved' : 'saved';
        this.emit();
        return { ok: true };
      }
      if (server.etag === sentEtag) {
        this.dirty = true;
        this.error = original;
        this.saveStatus = 'error';
        this.emit();
        return { ok: false, error: original };
      }
      const conflict = new ApiError(
        'GRAPH_VERSION_CONFLICT',
        'Граф изменился на сервере, пока соединение было потеряно.',
      );
      this.conflictDraft = sentRaw;
      this.dirty = true;
      this.error = conflict;
      this.saveStatus = 'error';
      this.emit();
      return { ok: false, error: conflict };
    } catch {
      this.dirty = true;
      this.error = original;
      this.saveStatus = 'error';
      this.emit();
      return { ok: false, error: original };
    }
  }
}
