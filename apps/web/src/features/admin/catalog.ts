/**
 * Query keys, list queries, and optimistic mutations for the admin catalog.
 * Every mutation uses useOptimisticListMutation so the UI updates instantly
 * and reconciles with the server once the request settles.
 */

import { useQuery } from "@tanstack/react-query";

import { apiFetch } from "@/lib/api";
import { useOptimisticListMutation } from "@/lib/optimistic";
import type {
  Chapter,
  Exam,
  Series,
  SeriesSubject,
  Subject,
} from "@/lib/types";

export const catalogKeys = {
  exams: () => ["catalog", "exams"] as const,
  subjects: (examId: string) => ["catalog", "subjects", examId] as const,
  series: (examId: string) => ["catalog", "series", examId] as const,
  seriesSubjects: (seriesId: string) =>
    ["catalog", "seriesSubjects", seriesId] as const,
  chapters: (subjectId: string) => ["catalog", "chapters", subjectId] as const,
};

// Queries -------------------------------------------------------------------

export function useExamsQuery() {
  return useQuery({
    queryKey: catalogKeys.exams(),
    queryFn: () => apiFetch<Exam[]>("/api/v1/exams"),
  });
}

export function useSubjectsQuery(examId: string | null) {
  return useQuery({
    queryKey: catalogKeys.subjects(examId ?? ""),
    queryFn: () => apiFetch<Subject[]>(`/api/v1/exams/${examId}/subjects`),
    enabled: examId !== null,
  });
}

export function useSeriesQuery(examId: string | null) {
  return useQuery({
    queryKey: catalogKeys.series(examId ?? ""),
    queryFn: () => apiFetch<Series[]>(`/api/v1/exams/${examId}/series`),
    enabled: examId !== null,
  });
}

export function useSeriesSubjectsQuery(seriesId: string | null) {
  return useQuery({
    queryKey: catalogKeys.seriesSubjects(seriesId ?? ""),
    queryFn: () =>
      apiFetch<SeriesSubject[]>(`/api/v1/series/${seriesId}/subjects`),
    enabled: seriesId !== null,
  });
}

export function useChaptersQuery(subjectId: string | null) {
  return useQuery({
    queryKey: catalogKeys.chapters(subjectId ?? ""),
    queryFn: () =>
      apiFetch<Chapter[]>(`/api/v1/subjects/${subjectId}/chapters`),
    enabled: subjectId !== null,
  });
}

// Exam mutations --------------------------------------------------------------

export function useCreateExam() {
  return useOptimisticListMutation<Exam, Exam, Omit<Exam, "id" | "is_active">>({
    queryKey: catalogKeys.exams(),
    mutationFn: (vars) =>
      apiFetch<Exam>("/api/v1/admin/exams", {
        method: "POST",
        body: JSON.stringify(vars),
      }),
    optimisticApply: (prev, vars) => [
      ...prev,
      {
        id: `temp-${vars.code}`,
        is_active: true,
        ...vars,
      },
    ],
    successMessage: "Exam created",
    errorMessage: () => "Could not create the exam. Please try again.",
  });
}

export function useUpdateExam() {
  return useOptimisticListMutation<
    Exam,
    Exam,
    { id: string } & Partial<Pick<Exam, "name" | "system">>
  >({
    queryKey: catalogKeys.exams(),
    mutationFn: ({ id, ...patch }) =>
      apiFetch<Exam>(`/api/v1/admin/exams/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    optimisticApply: (prev, { id, ...patch }) =>
      prev.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    successMessage: "Exam updated",
    errorMessage: () => "Could not update the exam. Please try again.",
  });
}

export function useDeleteExam() {
  return useOptimisticListMutation<void, Exam, { id: string }>({
    queryKey: catalogKeys.exams(),
    mutationFn: ({ id }) =>
      apiFetch<void>(`/api/v1/admin/exams/${id}`, { method: "DELETE" }),
    optimisticApply: (prev, { id }) => prev.filter((e) => e.id !== id),
    successMessage: "Exam deactivated",
    errorMessage: () => "Could not deactivate the exam. Please try again.",
  });
}

// Subject mutations -----------------------------------------------------------

export function useCreateSubject(examId: string) {
  return useOptimisticListMutation<Subject, Subject, { name: string }>({
    queryKey: catalogKeys.subjects(examId),
    mutationFn: (vars) =>
      apiFetch<Subject>("/api/v1/admin/subjects", {
        method: "POST",
        body: JSON.stringify({ exam_id: examId, ...vars }),
      }),
    optimisticApply: (prev, vars) => [
      ...prev,
      {
        id: `temp-${vars.name}`,
        exam_id: examId,
        is_active: true,
        ...vars,
      },
    ],
    successMessage: "Subject created",
    errorMessage: () => "Could not create the subject. Please try again.",
  });
}

export function useUpdateSubject(examId: string) {
  return useOptimisticListMutation<
    Subject,
    Subject,
    { id: string } & Partial<Pick<Subject, "name">>
  >({
    queryKey: catalogKeys.subjects(examId),
    mutationFn: ({ id, ...patch }) =>
      apiFetch<Subject>(`/api/v1/admin/subjects/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    optimisticApply: (prev, { id, ...patch }) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    successMessage: "Subject updated",
    errorMessage: () => "Could not update the subject. Please try again.",
  });
}

export function useDeleteSubject(examId: string) {
  return useOptimisticListMutation<void, Subject, { id: string }>({
    queryKey: catalogKeys.subjects(examId),
    mutationFn: ({ id }) =>
      apiFetch<void>(`/api/v1/admin/subjects/${id}`, { method: "DELETE" }),
    optimisticApply: (prev, { id }) => prev.filter((s) => s.id !== id),
    successMessage: "Subject deactivated",
    errorMessage: () => "Could not deactivate the subject. Please try again.",
  });
}

// Series mutations ------------------------------------------------------------

export interface SeriesFormVars {
  exam_id: string;
  parent_series_id: string | null;
  code: string;
  label: string;
  stream_group: string | null;
  is_binding: boolean;
  min_subjects: number | null;
  max_subjects: number | null;
}

export function useCreateSeries(examId: string) {
  return useOptimisticListMutation<Series, Series, SeriesFormVars>({
    queryKey: catalogKeys.series(examId),
    mutationFn: (vars) =>
      apiFetch<Series>("/api/v1/admin/series", {
        method: "POST",
        body: JSON.stringify(vars),
      }),
    optimisticApply: (prev, vars) => [
      ...prev,
      {
        id: `temp-${vars.code}`,
        is_active: true,
        ...vars,
      },
    ],
    successMessage: "Series created",
    errorMessage: () => "Could not create the series. Please try again.",
  });
}

export function useUpdateSeries(examId: string) {
  return useOptimisticListMutation<
    Series,
    Series,
    { id: string } & Partial<Omit<SeriesFormVars, "exam_id">>
  >({
    queryKey: catalogKeys.series(examId),
    mutationFn: ({ id, ...patch }) =>
      apiFetch<Series>(`/api/v1/admin/series/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    optimisticApply: (prev, { id, ...patch }) =>
      prev.map((s) => (s.id === id ? { ...s, ...patch } : s)),
    successMessage: "Series updated",
    errorMessage: () => "Could not update the series. Please try again.",
  });
}

export function useDeleteSeries(examId: string) {
  return useOptimisticListMutation<void, Series, { id: string }>({
    queryKey: catalogKeys.series(examId),
    mutationFn: ({ id }) =>
      apiFetch<void>(`/api/v1/admin/series/${id}`, { method: "DELETE" }),
    optimisticApply: (prev, { id }) => prev.filter((s) => s.id !== id),
    successMessage: "Series deactivated",
    errorMessage: (error) =>
      error instanceof Error && error.message.includes("child")
        ? "Cannot deactivate — this series still has active sub-series."
        : "Could not deactivate the series. Please try again.",
  });
}

// Series-subject pool mutations ------------------------------------------------

export interface PoolAttachVars {
  seriesId: string;
  subject_id: string;
  coefficient: number | null;
  is_compulsory: boolean;
  subject_category: string | null;
}

export function useAttachSubjectToSeries(seriesId: string) {
  return useOptimisticListMutation<
    SeriesSubject,
    SeriesSubject,
    PoolAttachVars
  >({
    queryKey: catalogKeys.seriesSubjects(seriesId),
    mutationFn: (vars) =>
      apiFetch<SeriesSubject>(`/api/v1/admin/series/${vars.seriesId}/subjects`, {
        method: "POST",
        body: JSON.stringify({
          subject_id: vars.subject_id,
          coefficient: vars.coefficient,
          is_compulsory: vars.is_compulsory,
          subject_category: vars.subject_category,
        }),
      }),
    optimisticApply: (prev, vars) => [
      ...prev,
      {
        subject_id: vars.subject_id,
        name: "",
        coefficient: vars.coefficient?.toString() ?? null,
        is_compulsory: vars.is_compulsory,
        subject_category: vars.subject_category,
      },
    ],
    successMessage: "Subject attached to the pool",
    errorMessage: () => "Could not attach the subject. Please try again.",
  });
}

export function useUpdateSeriesSubjectLink(seriesId: string) {
  return useOptimisticListMutation<
    SeriesSubject,
    SeriesSubject,
    {
      subject_id: string;
      coefficient?: number | null;
      is_compulsory?: boolean;
      subject_category?: string | null;
    }
  >({
    queryKey: catalogKeys.seriesSubjects(seriesId),
    mutationFn: (vars) =>
      apiFetch<SeriesSubject>(
        `/api/v1/admin/series/${seriesId}/subjects/${vars.subject_id}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            coefficient: vars.coefficient,
            is_compulsory: vars.is_compulsory,
            subject_category: vars.subject_category,
          }),
        },
      ),
    optimisticApply: (prev, vars) =>
      prev.map((s) =>
        s.subject_id === vars.subject_id
          ? {
              ...s,
              coefficient:
                vars.coefficient !== undefined
                  ? vars.coefficient?.toString() ?? null
                  : s.coefficient,
              is_compulsory: vars.is_compulsory ?? s.is_compulsory,
              subject_category:
                vars.subject_category !== undefined
                  ? vars.subject_category
                  : s.subject_category,
            }
          : s,
      ),
    successMessage: "Pool entry updated",
    errorMessage: () => "Could not update the pool entry. Please try again.",
  });
}

export function useDetachSubjectFromSeries(seriesId: string) {
  return useOptimisticListMutation<void, SeriesSubject, { subject_id: string }>({
    queryKey: catalogKeys.seriesSubjects(seriesId),
    mutationFn: (vars) =>
      apiFetch<void>(
        `/api/v1/admin/series/${seriesId}/subjects/${vars.subject_id}`,
        { method: "DELETE" },
      ),
    optimisticApply: (prev, { subject_id }) =>
      prev.filter((s) => s.subject_id !== subject_id),
    successMessage: "Subject removed from the pool",
    errorMessage: () => "Could not remove the subject. Please try again.",
  });
}

// Chapter mutations ------------------------------------------------------------

export interface ChapterFormVars {
  subject_id: string;
  parent_chapter_id: string | null;
  title: string;
  order_index: number;
  syllabus_year: number | null;
}

export function useCreateChapter(subjectId: string) {
  return useOptimisticListMutation<Chapter, Chapter, ChapterFormVars>({
    queryKey: catalogKeys.chapters(subjectId),
    mutationFn: (vars) =>
      apiFetch<Chapter>("/api/v1/admin/chapters", {
        method: "POST",
        body: JSON.stringify(vars),
      }),
    optimisticApply: (prev, vars) => [
      ...prev,
      {
        id: `temp-${vars.title}`,
        is_active: true,
        ...vars,
      },
    ],
    successMessage: "Chapter created",
    errorMessage: () => "Could not create the chapter. Please try again.",
  });
}

export function useUpdateChapter(subjectId: string) {
  return useOptimisticListMutation<
    Chapter,
    Chapter,
    { id: string } & Partial<Omit<ChapterFormVars, "subject_id">>
  >({
    queryKey: catalogKeys.chapters(subjectId),
    mutationFn: ({ id, ...patch }) =>
      apiFetch<Chapter>(`/api/v1/admin/chapters/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    optimisticApply: (prev, { id, ...patch }) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    successMessage: "Chapter updated",
    errorMessage: () => "Could not update the chapter. Please try again.",
  });
}

export function useDeleteChapter(subjectId: string) {
  return useOptimisticListMutation<void, Chapter, { id: string }>({
    queryKey: catalogKeys.chapters(subjectId),
    mutationFn: ({ id }) =>
      apiFetch<void>(`/api/v1/admin/chapters/${id}`, { method: "DELETE" }),
    optimisticApply: (prev, { id }) => prev.filter((c) => c.id !== id),
    successMessage: "Chapter deactivated",
    errorMessage: (error) =>
      error instanceof Error && error.message.includes("child")
        ? "Cannot deactivate — this chapter still has active sub-chapters."
        : "Could not deactivate the chapter. Please try again.",
  });
}
