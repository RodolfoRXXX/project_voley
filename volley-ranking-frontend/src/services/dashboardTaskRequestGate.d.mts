export class StaleDashboardTaskResponseError extends Error { readonly reason: "STALE_RESPONSE"; }
export function createDashboardTaskRequestGate<TSession extends string>(getSessionId: () => TSession | null): {
  run<TResult>(operation: () => Promise<TResult>): Promise<TResult>;
  invalidate(): void;
};
