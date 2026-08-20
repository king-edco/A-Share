/** Catalog shapes mirrored from the backend read schemas. */

export interface Exam {
  id: string;
  code: string;
  name: string;
  system: "FR" | "EN";
  is_active: boolean;
}

export interface Subject {
  id: string;
  exam_id: string;
  name: string;
  is_active: boolean;
}

export interface Series {
  id: string;
  exam_id: string;
  parent_series_id: string | null;
  code: string;
  label: string;
  stream_group: string | null;
  is_binding: boolean;
  min_subjects: number | null;
  max_subjects: number | null;
  is_active: boolean;
}

export interface SeriesSubject {
  subject_id: string;
  name: string;
  coefficient: string | null;
  is_compulsory: boolean;
  subject_category: string | null;
}

export interface Chapter {
  id: string;
  subject_id: string;
  parent_chapter_id: string | null;
  title: string;
  order_index: number;
  syllabus_year: number | null;
  is_active: boolean;
}
