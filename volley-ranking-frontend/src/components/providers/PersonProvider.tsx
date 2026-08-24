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
  personError: string | null;
  personOutcome: "created" | "existing" | null;
  savingPerson: boolean;
  ensureMyPerson: (input: EnsureMyPersonInput) => Promise<EnsureMyPersonResult>;
  retryPerson: () => void;
};

const PersonContext = createContext<PersonState | null>(null);

export function PersonProvider({ children }: { children: React.ReactNode }) {
  const { account, accountStatus } = useAuthContext();
  const [person, setPerson] = useState<MyPerson | null>(null);
  const [personStatus, setPersonStatus] = useState<PersonStatus>("idle");
  const [personError, setPersonError] = useState<string | null>(null);
  const [personOutcome, setPersonOutcome] = useState<"created" | "existing" | null>(null);
  const [savingPerson, setSavingPerson] = useState(false);
  const [retryVersion, setRetryVersion] = useState(0);
  const inFlight = useRef<Promise<EnsureMyPersonResult> | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      await Promise.resolve();
      if (!active) return;
      if (accountStatus !== "ready" || !account) {
        setPerson(null);
        setPersonError(null);
        setPersonOutcome(null);
        setPersonStatus("idle");
        return;
      }

      setPersonStatus("loading");
      setPersonError(null);
      try {
        const nextPerson = await getMyPerson();
        if (!active) return;
        setPerson(nextPerson);
        setPersonOutcome(nextPerson ? "existing" : null);
        setPersonStatus(nextPerson ? "ready" : "empty");
      } catch (error) {
        if (!active) return;
        setPerson(null);
        setPersonError(getPersonErrorMessage(error));
        const reason = getPersonErrorReason(error);
        setPersonStatus(reason === "PERSON_LINK_INCONSISTENT" ? "inconsistent" : reason === "AUTHENTICATION_REQUIRED" ? "sessionInvalid" : "error");
      }
    };
    void load();

    return () => {
      active = false;
    };
  }, [account, accountStatus, retryVersion]);

  const ensureMyPerson = useCallback((input: EnsureMyPersonInput) => {
    if (inFlight.current) return inFlight.current;
    setPersonError(null);
    setSavingPerson(true);
    const request = ensureMyPersonRequest(input)
      .then((result) => {
        setPerson(result.person);
        setPersonOutcome(result.outcome);
        setPersonStatus("ready");
        return result;
      })
      .catch((error) => {
        setPersonError(getPersonErrorMessage(error));
        const reason = getPersonErrorReason(error);
        setPersonStatus(reason === "PERSON_LINK_INCONSISTENT" ? "inconsistent" : reason === "AUTHENTICATION_REQUIRED" ? "sessionInvalid" : "error");
        throw error;
      })
      .finally(() => {
        inFlight.current = null;
        setSavingPerson(false);
      });
    inFlight.current = request;
    return request;
  }, []);

  const retryPerson = useCallback(() => setRetryVersion((version) => version + 1), []);
  const value = useMemo<PersonState>(() => ({
    person,
    personStatus,
    personError,
    personOutcome,
    savingPerson,
    ensureMyPerson,
    retryPerson,
  }), [ensureMyPerson, person, personError, personOutcome, personStatus, retryPerson, savingPerson]);

  return <PersonContext.Provider value={value}>{children}</PersonContext.Provider>;
}

export function usePersonContext() {
  const context = useContext(PersonContext);
  if (!context) throw new Error("usePersonContext must be used inside PersonProvider");
  return context;
}
