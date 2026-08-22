/** Student auth context types and hook. */

import { createContext, useContext } from "react";

export interface StudentSubjectInProfile {
  subject_id: string;
  name: string;
}

export interface StudentProfile {
  id: string;
  phone_number: string;
  full_name: string;
  school: string | null;
  city: string | null;
  exam_id: string;
  exam_name: string;
  series_id: string;
  series_label: string;
  subjects: StudentSubjectInProfile[];
}

export type StudentAuthStatus = "loading" | "authenticated" | "unauthenticated";

export interface StudentAuthContextValue {
  status: StudentAuthStatus;
  student: StudentProfile | null;
  accessToken: string | null;
  login: (phone: string, pin: string) => Promise<void>;
  /** Complete a fresh registration: store tokens and load the profile. */
  completeRegistration: (accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => void;
}

export const StudentAuthContext = createContext<StudentAuthContextValue | null>(
  null,
);

export function useStudentAuth(): StudentAuthContextValue {
  const ctx = useContext(StudentAuthContext);
  if (!ctx) {
    throw new Error("useStudentAuth must be used inside <StudentAuthProvider>");
  }
  return ctx;
}
