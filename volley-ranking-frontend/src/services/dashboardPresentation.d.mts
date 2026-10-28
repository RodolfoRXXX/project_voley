import type { DashboardTask } from "@/types/DashboardTask";

export function dashboardGreeting(accountDisplayName?: string | null, firebaseDisplayName?: string | null): string;
export function mergeDashboardTasks(current: DashboardTask[], incoming: DashboardTask[]): DashboardTask[];
