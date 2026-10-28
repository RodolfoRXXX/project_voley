export function dashboardGreeting(accountDisplayName, firebaseDisplayName) {
  const name = [accountDisplayName, firebaseDisplayName]
    .find((candidate) => typeof candidate === "string" && candidate.trim())?.trim();
  return name ? `Hola, ${name}` : "Hola";
}

export function mergeDashboardTasks(current, incoming) {
  const byId = new Map(current.map((task) => [task.taskId, task]));
  for (const task of incoming) byId.set(task.taskId, task);
  return [...byId.values()];
}
