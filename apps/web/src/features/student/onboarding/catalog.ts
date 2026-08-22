/** Catalog queries for the student onboarding wizard (public endpoints). */

import { useQuery } from "@tanstack/react-query";

import { studentApiFetch } from "../api";
import type {
  Exam,
  Series,
  SeriesSubject,
  Subject,
} from "@/lib/types";

export function useOnboardingExamsQuery() {
  return useQuery({
    queryKey: ["onboarding", "exams"],
    queryFn: () => studentApiFetch<Exam[]>("/api/v1/exams"),
    staleTime: 10 * 60 * 1000,
  });
}

export function useOnboardingSeriesQuery(examId: string | null) {
  return useQuery({
    queryKey: ["onboarding", "series", examId ?? ""],
    queryFn: () =>
      studentApiFetch<Series[]>(`/api/v1/exams/${examId}/series`),
    enabled: examId !== null,
    staleTime: 10 * 60 * 1000,
  });
}

export function useOnboardingPoolQuery(seriesId: string | null) {
  return useQuery({
    queryKey: ["onboarding", "pool", seriesId ?? ""],
    queryFn: () =>
      studentApiFetch<SeriesSubject[]>(`/api/v1/series/${seriesId}/subjects`),
    enabled: seriesId !== null,
    staleTime: 10 * 60 * 1000,
  });
}

export function useOnboardingSubjectsQuery(examId: string | null) {
  return useQuery({
    queryKey: ["onboarding", "subjects", examId ?? ""],
    queryFn: () =>
      studentApiFetch<Subject[]>(`/api/v1/exams/${examId}/subjects`),
    enabled: examId !== null,
    staleTime: 10 * 60 * 1000,
  });
}
