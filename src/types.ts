export interface OutlineNode {
  id: string;
  title: string;
  snippet: string;
  fullText: string;
  level: 1 | 2 | 3;
  isSynthetic?: boolean;
  element: HTMLElement;
  scrollRatio: number;
  scrollPercent: string;
  children: OutlineNode[];
}