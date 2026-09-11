import type { GroupJoinRequestDecisionResult, PendingGroupJoinRequestForOwner } from "../../types/GroupJoinRequest";
export declare const uncertainDecisionReasons: Set<string>;
export declare function newDecisionIntent(action: "approve" | "reject", requestId: string, keyFactory: () => string): Readonly<{ action: "approve" | "reject"; requestId: string; idempotencyKey: string }>;
export declare function createDecisionIntentRegistry(keyFactory: () => string): Readonly<{ getOrCreate(action: "approve" | "reject", requestId: string): Readonly<{ action: "approve" | "reject"; requestId: string; idempotencyKey: string }>; confirm(action: "approve" | "reject", requestId: string): void; requireNewConfirmation(action: "approve" | "reject", requestId: string): void }>;
export declare function createRequestFlights(): Readonly<{ start(requestId: string): boolean; finish(requestId: string): void; isActive(requestId: string): boolean }>;
export declare function scheduleFocus(target: { focus(): void } | null, schedule?: (callback: () => void) => void): void;
export declare function dismissesDecisionDialog(key: string): boolean;
export declare function applyAuthoritativeDecision(items: PendingGroupJoinRequestForOwner[], result: GroupJoinRequestDecisionResult): PendingGroupJoinRequestForOwner[];
export declare function shouldConsultAfterDecisionError(reason: string): boolean;
