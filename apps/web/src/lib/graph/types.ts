import type { Node, Edge } from '@xyflow/react';

export type PromptData = { text: string };
export type LabelData = { label: string };

export type PromptCanvasNode = Node<PromptData, 'prompt'>;
export type GeneratorCanvasNode = Node<LabelData, 'generator'>;
export type ResultCanvasNode = Node<LabelData, 'result'>;

export type CanvasNode = PromptCanvasNode | GeneratorCanvasNode | ResultCanvasNode;
export type CanvasEdge = Edge;
