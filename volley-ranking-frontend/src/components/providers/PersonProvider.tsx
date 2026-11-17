"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { useAuthContext } from "@/components/providers/AuthProvider";
import {
  ensureMyPerson as ensureMyPersonRequest,
  getMyPerson,
  getPersonErrorMessage,
  getPersonErrorReason,
} from "@/services/personService";
import type { EnsureMyPersonInput, EnsureMyPersonResult, MyPerson } from "@/types/MyPerson";

export type PersonStatus = "idle" | "loading" | "empty" | "ready" | "error" | "inconsistent" | "sessionInvalid";

type PersonState = {
  person: MyPerson | null;
  personStatus: PersonStatus;
  personAccountId: string | null;
  personError: string | null;
  personOutcome: "created" | "existing" | null;
  savingPerson: boolean;
  ensureMyPerson: (input: EnsureMyPersonInput) => Promise<EnsureMyPersonResult>;
  refreshMyPerson: () => Promise<MyPerson | null>;
  retryPerson: () => void;
};

const PersonContext = createContext<PersonState | null>(null);

export function PersonProvider({ children }: { children: React.ReactNode }) {
  const { account, accountStatus } = useAuthContext();
  const [person, setPerson] = useState<MyPerson | null>(null);
  const [personStatus, setPersonStatus] = useState<PersonStatus>("idle");
  const [personAccountId, setPersonAccountId] = useState<string | null>(null);
  const [personError, setPersonError] = useState<string | null>(null);
  const [personOutcome, setPersonOutcome] = useState<"created" | "existing" | null>(null);
  const [savingPerson, setSavingPerson] = useState(false);
  const [retryVersion, setRetryVersion] = useState(0);
  const inFlight = useRef<Promise<EnsureMyPersonResult> | null>(null);
  const activeAccountId = useRef<string | null>(null);
  const requestGeneration = useRef(0);

  const refreshMyPerson = useCallback(async () => {
    if (accountStatus !== "ready" || !account) return null;
    const accountId = account.userId;
    const generation = ++requestGeneration.current;
    setPersonStatus("loading");
    setPersonError(null);
    try {
      const nextPerson = await getMyPerson();
      if (activeAccountId.current !== accountId || requestGeneration.current !== generation) return null;
      setPerson(nextPerson);
      setPersonAccountId(accountId);
      setPersonOutcome(nextPerson ? "existing" : null);
      setPersonStatus(nextPerson ? "ready" : "empty");
      return nextPerson;
    } catch (error) {
      if (activeAccountId.current !== accountId || requestGeneration.current !== generation) return null;
      setPerson(null);
      setPersonAccountId(accountId);
      setPersonError(getPersonErrorMessage(error));
      const reason = getPersonErrorReason(error);
      setPersonStatus(reason === "PERSON_LINK_INCONSISTENT" ? "inconsistent" : reason === "AUTHENTICATION_REQUIRED" ? "sessionInvalid" : "error");
      throw error;
    }
  }, [account, accountStatus]);

  useEffect(() => {
    let active = true;
    activeAccountId.current = account?.userId ?? null;
    requestGeneration.current += 1;
    inFlight.current = null;
    queueMicrotask(() => {
      if (!active) return;
      setPersonAccountId(null);
      setPerson(null);
      setPersonError(null);
      setPersonOutcome(null);
      setSavingPerson(false);
      setPersonStatus("idle");
      if (accountStatus === "ready" && account) void refreshMyPerson().catch(() => undefined);
    });
    return () => {
      active = false;
      requestGeneration.current += 1;
    };
  }, [account, accountStatus, refreshMyPerson, retryVersion]);

  const ensureMyPerson = useCallback((input: EnsureMyPersonInput) => {
    if (inFlight.current) return inFlight.current;
    const accountId = account?.userId ?? null;
    const generation = ++requestGeneration.current;
    setPersonError(null);
    setSavingPerson(true);
    const request = ensureMyPersonRequest(input)
      .then((result) => {
        if (!accountId || activeAccountId.current !== accountId || requestGeneration.current !== generation) return result;
        setPerson(result.person);
        setPersonAccountId(accountId);
        setPersonOutcome(result.outcome);
        setPersonStatus("ready");
        return result;
      })
      .catch((error) => {
        if (!accountId || activeAccountId.current !== accountId || requestGeneration.current !== generation) throw error;
        setPersonError(getPersonErrorMessage(error));
        setPersonAccountId(account?.userId ?? null);
        const reason = getPersonErrorReason(error);
        setPersonStatus(reason === "PERSON_LINK_INCONSISTENT" ? "inconsistent" : reason === "AUTHENTICATION_REQUIRED" ? "sessionInvalid" : "error");
        throw error;
      })
      .finally(() => {
        if (inFlight.current === request) inFlight.current = null;
        if (activeAccountId.current === accountId && requestGeneration.current === generation) setSavingPerson(false);
      });
    inFlight.current = request;
    return request;
  }, [account?.userId]);

  const retryPerson = useCallback(() => setRetryVersion((version) => version + 1), []);
  const value = useMemo<PersonState>(() => ({
    person,
    personStatus,
    personAccountId,
    personError,
    personOutcome,
    savingPerson,
    ensureMyPerson,
    refreshMyPerson,
    retryPerson,
  }), [ensureMyPerson, person, personAccountId, personError, personOutcome, personStatus, refreshMyPerson, retryPerson, savingPerson]);

  return <PersonContext.Provider value={value}>{children}</PersonContext.Provider>;
}

export function usePersonContext() {
  const context = useContext(PersonContext);
  if (!context) throw new Error("usePersonContext must be used inside PersonProvider");
  return context;
}
