import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import ExamsPage from "../features/admin/exams/ExamsPage";
import ChaptersPage from "../features/admin/chapters/ChaptersPage";
import SeriesPage from "../features/admin/series/SeriesPage";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
  Toaster: () => null,
}));

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const EXAM = {
  id: "11111111-1111-1111-1111-111111111111",
  code: "BAC",
  name: "Baccalauréat",
  system: "FR",
  is_active: true,
};

const SERIES_D = {
  id: "22222222-2222-2222-2222-222222222222",
  exam_id: EXAM.id,
  parent_series_id: null,
  code: "D",
  label: "Série D",
  stream_group: "science",
  is_binding: true,
  min_subjects: null,
  max_subjects: null,
  is_active: true,
};

const SUBJECT_MATH = {
  id: "33333333-3333-3333-3333-333333333333",
  exam_id: EXAM.id,
  name: "Mathématiques",
  is_active: true,
};

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

function renderWithClient(client: QueryClient, ui: React.ReactElement, path: string) {
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("admin CRUD", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("Exams page shows the empty state when the list is empty", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url === "/api/v1/exams") return jsonResponse(200, []);
        return jsonResponse(404, {});
      }),
    );

    const client = makeClient();
    renderWithClient(client, <ExamsPage />, "/admin/exams");

    expect(await screen.findByText("No exams yet")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /create your first exam/i }),
    ).toBeInTheDocument();
  });

  it("Creating an exam shows it in the table before the mutation resolves", async () => {
    let resolveCreate: (() => void) | null = null;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url === "/api/v1/exams" && (!init || !init.method)) {
          return jsonResponse(200, [EXAM]);
        }
        if (url === "/api/v1/admin/exams" && init?.method === "POST") {
          return new Promise<Response>((resolve) => {
            resolveCreate = () => resolve(jsonResponse(201, { ...EXAM, code: "GCE" }));
          });
        }
        return jsonResponse(404, {});
      }),
    );

    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const client = makeClient();
    renderWithClient(client, <ExamsPage />, "/admin/exams");

    await screen.findByText("BAC");
    await user.click(screen.getByRole("button", { name: /create exam/i }));
    await user.type(await screen.findByLabelText(/code/i), "GCE");
    await user.type(screen.getByLabelText(/name/i), "GCE Advanced");
    await user.click(screen.getByRole("button", { name: /^create exam$/i }));

    // The row appears immediately, before the (mocked delayed) response.
    expect(await screen.findByText("GCE")).toBeInTheDocument();
    expect(resolveCreate).not.toBeNull();

    resolveCreate!();
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("Exam created"),
    );
  });

  it("A failed delete rolls back and shows an error toast", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url === "/api/v1/exams" && (!init || !init.method)) {
          return jsonResponse(200, [EXAM]);
        }
        if (url.startsWith("/api/v1/admin/exams/") && init?.method === "DELETE") {
          return jsonResponse(500, { detail: "server error" });
        }
        return jsonResponse(404, {});
      }),
    );

    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const client = makeClient();
    renderWithClient(client, <ExamsPage />, "/admin/exams");

    await screen.findByText("BAC");
    await user.click(screen.getByRole("button", { name: /deactivate bac/i }));
    await user.click(await screen.findByRole("button", { name: /^deactivate$/i }));

    // After the failed request, the row is back in the table.
    await waitFor(() => expect(screen.getByText("BAC")).toBeInTheDocument());
    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining("Could not deactivate the exam"),
      ),
    );
  });

  it("Series page loads the tree for the selected exam and creates a child with the right parent", async () => {
    const capturedBodies: unknown[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url === "/api/v1/exams") return jsonResponse(200, [EXAM]);
        if (url === `/api/v1/exams/${EXAM.id}/series`) {
          return jsonResponse(200, [SERIES_D]);
        }
        if (url === "/api/v1/admin/series" && init?.method === "POST") {
          capturedBodies.push(JSON.parse(String(init.body)));
          return jsonResponse(201, {
            ...SERIES_D,
            id: "44444444-4444-4444-4444-444444444444",
            code: "D1",
            parent_series_id: SERIES_D.id,
          });
        }
        return jsonResponse(404, {});
      }),
    );

    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const client = makeClient();
    renderWithClient(
      client,
      <SeriesPage />,
      `/admin/series?examId=${EXAM.id}`,
    );

    await screen.findByText("D");
    await user.click(screen.getByRole("button", { name: /add child to d/i }));
    await user.type(await screen.findByLabelText(/^code$/i), "D1");
    await user.type(screen.getByLabelText(/^label$/i), "Child D");
    await user.click(screen.getByRole("button", { name: /add series/i }));

    await waitFor(() => expect(capturedBodies.length).toBe(1));
    const body = capturedBodies[0] as Record<string, unknown>;
    expect(body.parent_series_id).toBe(SERIES_D.id);
    expect(body.exam_id).toBe(EXAM.id);
  });

  it("Chapters page shows the specific 409 message when deleting a chapter with children", async () => {
    const CHAPTER_PARENT = {
      id: "55555555-5555-5555-5555-555555555555",
      subject_id: SUBJECT_MATH.id,
      parent_chapter_id: null,
      title: "Functions",
      order_index: 1,
      syllabus_year: 2023,
      is_active: true,
    };
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url === "/api/v1/exams") return jsonResponse(200, [EXAM]);
        if (url === `/api/v1/exams/${EXAM.id}/subjects`) {
          return jsonResponse(200, [SUBJECT_MATH]);
        }
        if (url === `/api/v1/subjects/${SUBJECT_MATH.id}/chapters`) {
          return jsonResponse(200, [CHAPTER_PARENT]);
        }
        if (
          url.startsWith("/api/v1/admin/chapters/") &&
          init?.method === "DELETE"
        ) {
          return jsonResponse(409, {
            detail: "Chapter has active child chapters; reassign or deactivate them first",
          });
        }
        return jsonResponse(404, {});
      }),
    );

    const user = userEvent.setup({ pointerEventsCheck: 0 });
    const client = makeClient();
    renderWithClient(
      client,
      <ChaptersPage />,
      `/admin/chapters?examId=${EXAM.id}&subjectId=${SUBJECT_MATH.id}`,
    );

    await screen.findByText("Functions");
    await user.click(screen.getByRole("button", { name: /deactivate functions/i }));
    await user.click(await screen.findByRole("button", { name: /^deactivate$/i }));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith(
        "Cannot deactivate — this chapter still has active sub-chapters.",
      ),
    );
    // Rollback: the chapter is still listed.
    expect(screen.getByText("Functions")).toBeInTheDocument();
  });
});
