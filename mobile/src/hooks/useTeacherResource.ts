import { useCallback, useEffect, useRef, useState } from "react";
import type { MobileSession } from "../services/library";
import { createLatestRequest } from "../services/latest-request";

export type TeacherResource<T> = {
  status: "loading" | "error" | "ready";
  data: T | null;
  retry: () => void;
};

export function useTeacherResource<T>(session: MobileSession | null, load: (session: MobileSession) => Promise<T>): TeacherResource<T> {
  const requests = useRef(createLatestRequest());
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ session: MobileSession | null; load: typeof load | null; attempt: number; status: TeacherResource<T>["status"]; data: T | null }>({ session: null, load: null, attempt: -1, status: "loading", data: null });
  const retry = useCallback(() => {
    requests.current.cancel();
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    const gate = requests.current;
    if (session) {
      void gate.run(() => load(session),
        (data) => setResult({ session, load, attempt, status: "ready", data }),
        () => setResult({ session, load, attempt, status: "error", data: null }));
    }
    return () => gate.cancel();
  }, [session, load, attempt]);

  // Do not render a previous session/retry's data while its cleanup is pending.
  if (!session) return { status: "error", data: null, retry };
  if (result.session !== session || result.load !== load || result.attempt !== attempt) return { status: "loading", data: null, retry };
  return { status: result.status, data: result.data, retry };
}
