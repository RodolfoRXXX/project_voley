export type RequestToken = Readonly<{ generation: number; contextKey: string }>;
export function createLatestRequestGate(): Readonly<{
  begin(contextKey: string): RequestToken;
  isCurrent(token: RequestToken): boolean;
  invalidate(contextKey?: string): void;
}>;
export function visibleMovementRows<T>(items: T[], page: number, pageSize: number): Readonly<{
  page: number;
  pageCount: number;
  rows: T[];
}>;
