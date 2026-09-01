export type MyCurrentGroupMembership = {
  membership: { id: string; seasonId: string; estado: "activa"; fechaIngreso: string };
  group: { id: string; nombre: string; deporte: "voleibol"; estado: "activo" };
};

export type ListMyCurrentGroupMembershipsResult = {
  items: MyCurrentGroupMembership[];
  nextCursor: string | null;
};
