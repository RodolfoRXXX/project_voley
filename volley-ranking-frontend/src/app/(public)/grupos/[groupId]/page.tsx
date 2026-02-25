"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import UserAvatar from "@/components/ui/avatar/UserAvatar";
import { ActionButton } from "@/components/ui/action/ActionButton";
import { readJsonSafely } from "@/lib/http/readJsonSafely";
import useToast from "@/components/ui/toast/useToast";

type GroupMember = {
  id: string;
  name: string;
  email?: string | null;
  photoURL?: string | null;
  positions?: string[];
  isAdmin?: boolean;
};

type GroupMatch = {
  id: string;
  title: string;
  visibility: "public" | "group_only";
  startsAt: string | null;
  status?: string | null;
};

type GroupDetail = {
  id: string;
  name: string;
  description: string;
  visibility: "public" | "private";
  joinApproval: boolean;
  members: GroupMember[];
  pendingRequests: GroupMember[];
  pendingAdminRequests: GroupMember[];
  memberIds: string[];
  pendingRequestIds: string[];
  pendingAdminRequestIds: string[];
  adminIds: string[];
  ownerId: string | null;
  canManageMembers: boolean;
  canManageAdmins: boolean;
  canRequestAdminRole: boolean;
};

export default function GrupoPublicDetailPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const { firebaseUser, loading: authLoading } = useAuth();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [matches, setMatches] = useState<GroupMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingKey, setActingKey] = useState<string | null>(null);
  const { showToast } = useToast();

  const loadGroup = useCallback(async () => {
    if (!groupId || authLoading) return;

    try {
      setError(null);

      const getHeaders = async (forceRefresh = false) => {
        if (!firebaseUser) return undefined;
        const token = await firebaseUser.getIdToken(forceRefresh);
        return { Authorization: `Bearer ${token}` };
      };

      let res = await fetch(`/api/groups/${groupId}/public`, {
        method: "GET",
        headers: await getHeaders(),
      });

      let payload = (await readJsonSafely(res)) as
        | { error?: string; group?: GroupDetail | null; matches?: GroupMatch[] }
        | null;

      if (res.status === 403 && firebaseUser) {
        res = await fetch(`/api/groups/${groupId}/public`, {
          method: "GET",
          headers: await getHeaders(true),
        });

        payload = (await readJsonSafely(res)) as
          | { error?: string; group?: GroupDetail | null; matches?: GroupMatch[] }
          | null;
      }

      if (!res.ok) throw new Error(payload?.error || "No se pudo cargar el grupo");

      setGroup(payload?.group || null);
      setMatches(payload?.matches || []);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo cargar el grupo");
    } finally {
      setLoading(false);
    }
  }, [groupId, firebaseUser, authLoading]);

  useEffect(() => {
    loadGroup();
  }, [loadGroup]);

  const postWithAuth = async (url: string) => {
    if (!firebaseUser) throw new Error("Debes iniciar sesión para realizar esta acción");

    const token = await firebaseUser.getIdToken();
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const payload = (await readJsonSafely(res)) as { error?: string } | null;
    if (!res.ok) {
      throw new Error(payload?.error || "No se pudo completar la acción");
    }

    return payload;
  };

  const removeMember = async (userId: string) => {
    try {
      setActingKey(`remove-${userId}`);
      await postWithAuth(`/api/groups/${groupId}/members/${userId}/remove`);
      await loadGroup();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo eliminar el integrante");
    } finally {
      setActingKey(null);
    }
  };

  const resolveRequest = async (userId: string, action: "approve" | "reject") => {
    try {
      setActingKey(`${action}-${userId}`);
      await postWithAuth(`/api/groups/${groupId}/requests/${userId}/${action}`);
      await loadGroup();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la solicitud");
    } finally {
      setActingKey(null);
    }
  };

  const resolveAdminRequest = async (userId: string, action: "approve" | "reject") => {
    try {
      setActingKey(`admin-${action}-${userId}`);
      await postWithAuth(`/api/groups/${groupId}/admin-requests/${userId}/${action}`);
      await loadGroup();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar la solicitud de administrador");
    } finally {
      setActingKey(null);
    }
  };

  const requestAdminRole = async () => {
    try {
      setActingKey("request-admin-role");
      await postWithAuth(`/api/groups/${groupId}/admin-request`);
      await loadGroup();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "No se pudo enviar la postulación");
    } finally {
      setActingKey(null);
    }
  };

  const removeAdmin = async (userId: string) => {
    try {
      setActingKey(`remove-admin-${userId}`);
      await postWithAuth(`/api/groups/${groupId}/admins/${userId}/remove`);
      await loadGroup();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "No se pudo eliminar al administrador";
      if (message.toLowerCase().includes("único owner") || message.toLowerCase().includes("unico owner")) {
        showToast({ type: "error", message });
      } else {
        setError(message);
      }
    } finally {
      setActingKey(null);
    }
  };

  const renderMember = (member: GroupMember, isPending = false) => (
    <li key={`${isPending ? "pending" : "member"}-${member.id}`} className="rounded-xl border border-neutral-200 p-3 text-sm flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <UserAvatar nombre={member.name} photoURL={member.photoURL} size={36} />
        <div>
          <p className="font-medium text-neutral-900">{member.name}</p>
          <p className="text-xs text-neutral-500">
            {member.positions?.length ? member.positions.join(" · ") : "Sin posiciones cargadas"}
          </p>
        </div>
      </div>

      {group?.canManageMembers && (
        <div className="flex items-center gap-2">
          {isPending ? (
            <>
              <ActionButton
                onClick={() => resolveRequest(member.id, "approve")}
                loading={actingKey === `approve-${member.id}`}
                variant="success_outline"
                compact
              >
                Aceptar
              </ActionButton>
              <ActionButton
                onClick={() => resolveRequest(member.id, "reject")}
                loading={actingKey === `reject-${member.id}`}
                variant="danger_outline"
                compact
              >
                Eliminar
              </ActionButton>
            </>
          ) : !member.isAdmin ? (
            <ActionButton
              onClick={() => removeMember(member.id)}
              loading={actingKey === `remove-${member.id}`}
              variant="danger_outline"
              compact
            >
              Eliminar
            </ActionButton>
          ) : null}
        </div>
      )}
    </li>
  );

  const adminMembers = group?.members.filter((member) => member.isAdmin) || [];
  const playerMembers = group?.members.filter((member) => !member.isAdmin) || [];

  return (
    <main className="max-w-4xl mx-auto mt-6 sm:mt-10 px-4 md:px-0 pb-12 space-y-6">
      <Link href="/grupos" className="text-sm text-neutral-600 hover:underline">
        ← Volver a grupos
      </Link>

      {loading && <p className="text-gray-500">Cargando detalle del grupo...</p>}
      {error && <p className="text-red-500">{error}</p>}

      {!loading && !error && group && (
        <>
          <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm space-y-2">
            <h1 className="text-2xl font-bold text-neutral-900">{group.name}</h1>
            <p className="text-neutral-600">{group.description || "Sin descripción"}</p>
            {group.canRequestAdminRole && (
              <ActionButton
                onClick={requestAdminRole}
                loading={actingKey === "request-admin-role"}
                variant="warning"
                compact
              >
                Postularme como administrador
              </ActionButton>
            )}
            <div className="flex flex-wrap gap-2 text-sm">
              <span className={`px-2 py-1 rounded-full ${group.visibility === "public" ? "bg-green-100 text-green-700" : "bg-neutral-200 text-neutral-700"}`}>
                {group.visibility === "public" ? "Público" : "Privado"}
              </span>
              {group.joinApproval && (
                <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-700">Aprobación requerida</span>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm space-y-3">
            <h2 className="text-lg font-semibold text-neutral-900">Partidos del grupo</h2>
            {matches.length === 0 ? (
              <p className="text-sm text-neutral-500">No hay partidos para mostrar.</p>
            ) : (
              <ul className="space-y-2">
                {matches.map((match) => (
                  <li key={match.id} className="rounded-xl border border-neutral-200 p-3 text-sm">
                    <p className="font-medium text-neutral-900">{match.title}</p>
                    <p className="text-neutral-600">Estado: {match.status || "—"}</p>
                    <p className="text-neutral-600">
                      Inicio: {match.startsAt ? new Date(match.startsAt).toLocaleString("es-AR") : "Sin fecha"}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm space-y-4">
            <h2 className="text-lg font-semibold text-neutral-900">Integrantes</h2>

            {group.pendingAdminRequests.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-amber-700">Solicitud de administrador</p>
                <ul className="space-y-2">
                  {group.pendingAdminRequests.map((member) => (
                    <li key={`admin-pending-${member.id}`} className="rounded-xl border border-neutral-200 p-3 text-sm flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <UserAvatar nombre={member.name} photoURL={member.photoURL} size={36} />
                        <div>
                          <p className="font-medium text-neutral-900">{member.name}</p>
                          <p className="text-xs text-neutral-500">Postulación pendiente</p>
                        </div>
                      </div>

                      {group.canManageAdmins && (
                        <div className="flex items-center gap-2">
                          <ActionButton
                            onClick={() => resolveAdminRequest(member.id, "approve")}
                            loading={actingKey === `admin-approve-${member.id}`}
                            variant="success_outline"
                            compact
                          >
                            Aceptar
                          </ActionButton>
                          <ActionButton
                            onClick={() => resolveAdminRequest(member.id, "reject")}
                            loading={actingKey === `admin-reject-${member.id}`}
                            variant="danger_outline"
                            compact
                          >
                            Eliminar
                          </ActionButton>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {group.pendingRequests.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-amber-700">Solicitudes de ingreso</p>
                <ul className="space-y-2">{group.pendingRequests.map((member) => renderMember(member, true))}</ul>
              </div>
            )}

            {group.members.length === 0 ? (
              <p className="text-sm text-neutral-500">Aún no hay integrantes en este grupo.</p>
            ) : (
              <div className="space-y-3">
                {adminMembers.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-neutral-700">Admins</p>
                    <ul className="space-y-2">
                      {adminMembers.map((member) => (
                        <li key={`admin-${member.id}`} className="rounded-xl border border-neutral-200 p-3 text-sm flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <UserAvatar nombre={member.name} photoURL={member.photoURL} size={36} />
                            <div>
                              <p className="font-medium text-neutral-900">{member.name}</p>
                              <p className="text-xs text-neutral-500">
                                {member.positions?.length ? member.positions.join(" · ") : "Sin posiciones cargadas"}
                              </p>
                            </div>
                          </div>

                          {group.canManageAdmins && (
                            <ActionButton
                              onClick={() => removeAdmin(member.id)}
                              loading={actingKey === `remove-admin-${member.id}`}
                              variant="danger_outline"
                              compact
                            >
                              Eliminar
                            </ActionButton>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {playerMembers.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-neutral-700">Jugadores</p>
                    <ul className="space-y-2">{playerMembers.map((member) => renderMember(member))}</ul>
                  </div>
                )}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
