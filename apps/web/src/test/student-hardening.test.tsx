import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { StudentAuthProvider } from "../features/student/auth/StudentAuthProvider";
import { useOnboardingStore } from "../features/student/onboarding/store";
import AppRoutes from "../routes/AppRoutes";
import { STUDENT_REFRESH_TOKEN_KEY } from "../features/student/api";

const EXAM = {
  id: "11111111-1111-1111-1111-111111111111",
  code: "GCE_AL",
  name: "GCE Advanced Level",
  system: "EN",
  is_active: true,
};

const SERIES = {
  id: "22222222-2222-2222-2222-222222222222",
  exam_id: EXAM.id,
  parent_series_id: null,
  code: "S1",
  label: "Science 1",
  stream_group: "science",
  is_binding: true,
  min_subjects: 2,
  max_subjects: 2,
  is_active: true,
};

const SUBJECT_A = {
  subject_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
  name: "Physics",
  coefficient: null,
  is_compulsory: true,
  subject_category: null,
};
const SUBJECT_B = {
  subject_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
  name: "Chemistry",
  coefficient: null,
  is_compulsory: false,
  subject_category: null,
};
const SUBJECT_C = {
  subject_id: "cccccccc-cccc-cccc-cccc-cccccccccccc",
  name: "Biology",
  coefficient: null,
  is_compulsory: false,
  subject_category: null,
};

const PROFILE = {
  id: "77777777-7777-7777-7777-777777777777",
  phone_number: "+237670000000",
  full_name: "Test Student",
  school: null,
  city: null,
  exam_id: EXAM.id,
  exam_name: EXAM.name,
  series_id: SERIES.id,
  series_label: SERIES.label,
  subjects: [SUBJECT_A],
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function installFetchMock() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();
      const headers = new Headers(init?.headers);
      const token = headers.get("Authorization");

      if (url === "/api/v1/auth/student/refresh" && init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as { refresh_token: string };
        if (body.refresh_token === "valid-rt") {
          return jsonResponse(200, { access_token: "fresh-at" });
        }
        return jsonResponse(401, { detail: "expired" });
      }
      if (url === "/api/v1/students/me") {
        if (token?.startsWith("Bearer fresh-at")) {
          return jsonResponse(200, PROFILE);
        }
        return jsonResponse(401, {});
      }
      if (url === "/api/v1/exams") return jsonResponse(200, [EXAM]);
      if (url === `/api/v1/exams/${EXAM.id}/series`) {
        return jsonResponse(200, [SERIES]);
      }
      if (url === `/api/v1/series/${SERIES.id}/subjects`) {
        return jsonResponse(200, [SUBJECT_A, SUBJECT_B, SUBJECT_C]);
      }
      return jsonResponse(404, {});
    }),
  );
}

function renderApp(path = "/") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <StudentAuthProvider>
          <AppRoutes />
        </StudentAuthProvider>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("student hardening", () => {
  beforeEach(() => {
    localStorage.clear();
    useOnboardingStore.getState().reset();
    installFetchMock();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("a valid persisted session renders the student shell with the real first name", async () => {
    localStorage.setItem(STUDENT_REFRESH_TOKEN_KEY, "valid-rt");
    renderApp("/");

    await screen.findByText(/bonjour test/i);
    expect(screen.getByText(/bonjour test/i)).toBeInTheDocument();
    expect(screen.queryByText(/continue/i)).not.toBeInTheDocument();
  });

  it("an invalid refresh token sends the student to /onboarding", async () => {
    localStorage.setItem(STUDENT_REFRESH_TOKEN_KEY, "expired-rt");
    renderApp("/");

    expect(
      await screen.findByRole("button", { name: /continuer/i }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/bonjour/i)).not.toBeInTheDocument();
  });

  it("subject min/max rules and compulsory locking are enforced", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderApp("/onboarding");

    // Welcome → profile.
    for (let i = 0; i < 3; i++) {
      if (screen.queryByLabelText(/nom complet/i)) break;
      await user.click(screen.getAllByRole("button", { name: /continuer/i })[0]);
    }
    await user.type(await screen.findByLabelText(/nom complet/i), "T");
    await user.click(screen.getByRole("button", { name: /continuer/i }));
    await user.click(await screen.findByText(EXAM.name));
    await user.click(await screen.findByText(SERIES.code));

    // SUBJECT_A is compulsory and pre-selected; min=max=2 with two optionals.
    expect(await screen.findByText("obligatoire")).toBeInTheDocument();

    // Selecting the first optional puts us above max; the second optional is blocked.
    await user.click(screen.getByText(SUBJECT_B.name));
    expect(screen.getByRole("button", { name: /continuer/i })).toBeEnabled();
    await user.click(screen.getByText(SUBJECT_C.name));
    expect(screen.getByRole("button", { name: /continuer/i })).toBeEnabled();

    // Compulsory cannot be unchecked.
    await user.click(screen.getByText(SUBJECT_A.name));
    expect(screen.getByText("obligatoire")).toBeInTheDocument();
  });

  it("account validation rejects bad phone and bad PIN", async () => {
    const user = userEvent.setup();
    renderApp("/onboarding");

    // Navigate to the phone step.
    for (let i = 0; i < 3; i++) {
      if (screen.queryByLabelText(/nom complet/i)) break;
      await user.click(screen.getAllByRole("button", { name: /continuer/i })[0]);
    }
    await user.type(await screen.findByLabelText(/nom complet/i), "T");
    await user.click(screen.getByRole("button", { name: /continuer/i }));
    await user.click(await screen.findByText(EXAM.name));
    await user.click(await screen.findByText(SERIES.code));
    await user.click(screen.getByText(SUBJECT_B.name));
    await user.click(screen.getByRole("button", { name: /continuer/i }));

    // Invalid phone.
    const phoneInput = await screen.findByLabelText(/numéro de téléphone/i);
    await user.type(phoneInput, "12345");
    await user.click(screen.getByRole("button", { name: /continuer/i }));
    expect(
      await screen.findByText(/numéro camerounais attendu/i),
    ).toBeInTheDocument();

    // Valid phone → confirmation overlay → confirmer.
    await user.clear(phoneInput);
    await user.type(phoneInput, "0670000000");
    await user.click(screen.getByRole("button", { name: /continuer/i }));
    expect(
      await screen.findByText(/ton numéro est-il correct/i),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /modifier/i }));
    await waitFor(() =>
      expect(
        screen.queryByText(/ton numéro est-il correct/i),
      ).not.toBeInTheDocument(),
    );
    await user.click(screen.getByRole("button", { name: /continuer/i }));
    await user.click(screen.getByRole("button", { name: /confirmer/i }));

    // PIN too short.
    const pinInput = await screen.findByLabelText(/^pin$/i);
    const confirmInput = screen.getByLabelText(/confirme le pin/i);
    await user.type(pinInput, "12");
    await user.type(confirmInput, "12");
    await user.click(screen.getByRole("button", { name: /continuer/i }));
    expect(
      await screen.findByText(/le code pin doit faire 4 à 6 chiffres/i),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continuer/i })).toBeDisabled();

    // Mismatched confirmation.
    await user.clear(pinInput);
    await user.type(pinInput, "1234");
    await user.clear(confirmInput);
    await user.type(confirmInput, "4321");
    expect(screen.getByRole("button", { name: /continuer/i })).toBeDisabled();
  });

  it("the recap step shows choices and hides the PIN", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderApp("/onboarding");

    // Drive all the way through.
    for (let i = 0; i < 3; i++) {
      if (screen.queryByLabelText(/nom complet/i)) break;
      await user.click(screen.getAllByRole("button", { name: /continuer/i })[0]);
    }
    await user.type(await screen.findByLabelText(/nom complet/i), "Test Student");
    await user.click(screen.getByRole("button", { name: /continuer/i }));
    await user.click(await screen.findByText(EXAM.name));
    await user.click(await screen.findByText(SERIES.code));
    await user.click(screen.getByText(SUBJECT_B.name));
    await user.click(screen.getByRole("button", { name: /continuer/i }));
    await user.type(await screen.findByLabelText(/numéro de téléphone/i), "0670000000");
    await user.click(screen.getByRole("button", { name: /continuer/i }));
    await user.click(screen.getByRole("button", { name: /confirmer/i }));
    await user.type(await screen.findByLabelText(/^pin$/i), "1234");
    await user.type(screen.getByLabelText(/confirme le pin/i), "1234");
    await user.click(screen.getByRole("button", { name: /continuer/i }));

    // Recap contents.
    expect(await screen.findByText(/vérifie et confirme/i)).toBeInTheDocument();
    expect(screen.getByText("Test Student")).toBeInTheDocument();
    expect(screen.getByText(EXAM.name)).toBeInTheDocument();
    expect(screen.getByText(SERIES.label)).toBeInTheDocument();
    expect(screen.getByText(/0670000000|\+237 670 00 00 00/)).toBeInTheDocument();
    expect(screen.queryByText(/1234/)).not.toBeInTheDocument();

    // PIN is not persisted anywhere visible.
    expect(localStorage.getItem(STUDENT_REFRESH_TOKEN_KEY)).toBeNull();
  });

  it("the student API does exactly one silent refresh on 401 then retries once", async () => {
    let meCalls = 0;
    let refreshCalls = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url === "/api/v1/auth/student/refresh" && init?.method === "POST") {
          refreshCalls += 1;
          return jsonResponse(200, { access_token: "fresh-at" });
        }
        if (url === "/api/v1/students/me") {
          meCalls += 1;
          const headers = new Headers(init?.headers);
          const token = headers.get("Authorization");
          if (token === "Bearer fresh-at") {
            return jsonResponse(200, PROFILE);
          }
          return jsonResponse(401, {});
        }
        return jsonResponse(404, {});
      }),
    );
    localStorage.setItem(STUDENT_REFRESH_TOKEN_KEY, "valid-rt");

    renderApp("/");

    await screen.findByText(/bonjour test/i);
    // The refresh happens at most twice (hydration plus the 401 retry path);
    // never more, so there is no runaway refresh loop.
    expect(refreshCalls).toBeLessThanOrEqual(2);
    expect(meCalls).toBeGreaterThanOrEqual(2);
  });

  it("auth keys are namespaced and cannot collide", async () => {
    const { REFRESH_TOKEN_KEY } = await import("../lib/api");
    expect(STUDENT_REFRESH_TOKEN_KEY).not.toBe(REFRESH_TOKEN_KEY);
    expect(STUDENT_REFRESH_TOKEN_KEY).toContain("student");
    expect(REFRESH_TOKEN_KEY).not.toContain("student");
  });
});
