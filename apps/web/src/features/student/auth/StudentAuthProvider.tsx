/**
 * Student auth provider: the student session state.
 *
 * - access_token in memory only
 * - refresh_token in localStorage under "ashare.student_refresh_token"
 * - on mount, a stored refresh token is silently exchanged to rehydrate
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";

import {
  configureStudentApi,
  studentApiFetch,
  STUDENT_REFRESH_TOKEN_KEY,
  studentSilentRefresh,
} from "../api";
import {
  StudentAuthContext,
  type StudentProfile,
  type StudentAuthStatus,
} from "./student-auth";

interface StudentTokenResponse {
  access_token: string;
  refresh_token: string;
}

export function StudentAuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<StudentAuthStatus>("loading");
  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [accessToken, setAccessTokenState] = useState<string | null>(null);
  const tokenRef = useRef<string | null>(null);
  const navigate = useNavigate();

  const setToken = useCallback((token: string | null) => {
    tokenRef.current = token;
    setAccessTokenState(token);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setStudent(null);
    setStatus("unauthenticated");
    localStorage.removeItem(STUDENT_REFRESH_TOKEN_KEY);
    navigate("/onboarding", { replace: true });
  }, [navigate, setToken]);

  useEffect(() => {
    configureStudentApi({
      getAccessToken: () => tokenRef.current,
      setAccessToken: (token) => setToken(token),
      onAuthFailure: () => logout(),
    });
  }, [setToken, logout]);

  useEffect(() => {
    let cancelled = false;

    async function rehydrate() {
      const token = await studentSilentRefresh();
      if (cancelled) return;
      if (!token) {
        localStorage.removeItem(STUDENT_REFRESH_TOKEN_KEY);
        setStatus("unauthenticated");
        return;
      }
      setToken(token);
      try {
        const me = await studentApiFetch<StudentProfile>("/api/v1/students/me");
        if (cancelled) return;
        setStudent(me);
        setStatus("authenticated");
      } catch {
        if (cancelled) return;
        setToken(null);
        localStorage.removeItem(STUDENT_REFRESH_TOKEN_KEY);
        setStatus("unauthenticated");
      }
    }

    void rehydrate();
    return () => {
      cancelled = true;
    };
  }, [setToken]);

  const completeRegistration = useCallback(
    async (accessToken: string, refreshToken: string) => {
      tokenRef.current = accessToken;
      localStorage.setItem(STUDENT_REFRESH_TOKEN_KEY, refreshToken);
      setAccessTokenState(accessToken);
      const me = await studentApiFetch<StudentProfile>("/api/v1/students/me");
      setStudent(me);
      setStatus("authenticated");
    },
    [],
  );

  const login = useCallback(async (phone: string, pin: string) => {
    const tokens = await studentApiFetch<StudentTokenResponse>(
      "/api/v1/auth/student/login",
      {
        method: "POST",
        body: JSON.stringify({ phone_number: phone, pin }),
      },
    );
    await completeRegistration(tokens.access_token, tokens.refresh_token);
  }, [completeRegistration]);

  const value = useMemo(
    () => ({
      status,
      student,
      accessToken,
      login,
      completeRegistration,
      logout,
    }),
    [status, student, accessToken, login, completeRegistration, logout],
  );

  return (
    <StudentAuthContext.Provider value={value}>
      {children}
    </StudentAuthContext.Provider>
  );
}
