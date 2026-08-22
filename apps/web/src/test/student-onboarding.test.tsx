import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useOnboardingStore } from "../features/student/onboarding/store";
import AppRoutes from "../routes/AppRoutes";

const EXAM = {
  id: "11111111-1111-1111-1111-111111111111",
  code: "GCE_AL",
  name: "GCE Advanced Level",
  system: "EN",
  is_active: true,
};

const PARENT_SERIES = {
  id: "22222222-2222-2222-2222-222222222222",
  exam_id: EXAM.id,
  parent_series_id: null,
  code: "SCI",
  label: "Science grouping",
  stream_group: "science",
  is_binding: true,
  min_subjects: null,
  max_subjects: null,
  is_active: true,
};

const CHILD_SERIES = {
  id: "33333333-3333-3333-3333-333333333333",
  exam_id: EXAM.id,
  parent_series_id: PARENT_SERIES.id,
  code: "S1",
  label: "Upper Science 1",
  stream_group: "science",
  is_binding: true,
  min_subjects: null,
  max_subjects: null,
  is_active: true,
};

const NONBINDING_SERIES = {
  id: "44444444-4444-4444-4444-444444444444",
  exam_id: EXAM.id,
  parent_series_id: null,
  code: "ARTS",
  label: "Arts",
  stream_group: "arts",
  is_binding: false,
  min_subjects: null,
  max_subjects: null,
  is_active: true,
};

const SUBJECT = {
  subject_id: "55555555-5555-5555-5555-555555555555",
  name: "Pure Mathematics",
  coefficient: null,
  is_compulsory: true,
  subject_category: null,
};

const EXTRA_SUBJECT = {
  id: "66666666-6666-6666-6666-666666666666",
  exam_id: EXAM.id,
  name: "Literature",
  is_active: true,
};

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const PROFILE = {
  id: "77777777-7777-7777-7777-777777777777",
  phone_number: "+237670000000",
  full_name: "Test Student",
  school: "Lycée",
  city: "Douala",
  exam_id: EXAM.id,
  exam_name: EXAM.name,
  series_id: CHILD_SERIES.id,
  series_label: CHILD_SERIES.label,
  subjects: [SUBJECT],
};

function installFetchMock() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input.toString();

      if (url === "/api/v1/exams") return jsonResponse(200, [EXAM]);
      if (url === `/api/v1/exams/${EXAM.id}/series`) {
        return jsonResponse(200, [PARENT_SERIES, CHILD_SERIES, NONBINDING_SERIES]);
      }
      if (url === `/api/v1/exams/${EXAM.id}/subjects`) {
        return jsonResponse(200, [EXTRA_SUBJECT]);
      }
      if (url === `/api/v1/series/${NONBINDING_SERIES.id}/subjects`) {
        return jsonResponse(200, []);
      }
      if (url === `/api/v1/series/${CHILD_SERIES.id}/subjects`) {
        return jsonResponse(200, [SUBJECT]);
      }
      if (url === "/api/v1/students/register" && init?.method === "POST") {
        return jsonResponse(201, {
          access_token: "at",
          refresh_token: "rt",
        });
      }
      if (url === "/api/v1/students/me") {
        return jsonResponse(200, PROFILE);
      }

      const headers = new Headers(init?.headers);
      const token = headers.get("Authorization");
      if (token && url === "/api/v1/students/me") {
        return jsonResponse(200, PROFILE);
      }

      return jsonResponse(404, {});
    }),
  );
}

/** Click "Continuer" until the Profile (nom complet) form appears. */
async function goToProfile(user: ReturnType<typeof userEvent.setup>) {
  for (let i = 0; i < 4; i++) {
    if (screen.queryByLabelText(/nom complet/i)) {
      return;
    }
    const button = await screen.findByRole("button", { name: /continuer/i });
    await user.click(button);
    // framer-motion exit animations finish asynchronously; wait for the step
    // to settle before checking again.
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error("goToProfile: profile form did not appear");
}

function renderWizard(path = "/onboarding") {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <AppRoutes />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("student onboarding", () => {
  beforeEach(() => {
    localStorage.clear();
    useOnboardingStore.getState().reset();
    installFetchMock();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("visiting / without a session redirects to /onboarding", async () => {
    renderWizard("/");
    expect(
      await screen.findByRole("button", { name: /continuer/i }),
    ).toBeInTheDocument();
  });

  it("full flow: wizard advances, series drills down, subjects are selectable, registration succeeds and navigates to /", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderWizard("/onboarding");

    // Welcome → profile.
    await goToProfile(user);
    await user.type(await screen.findByLabelText(/nom complet/i), "Test Student");
    await user.click(screen.getByRole("button", { name: /continuer/i }));
    // Exam
    await user.click(await screen.findByText(EXAM.name));
    // Series: parent with children drills within same step.
    await user.click(await screen.findByText(PARENT_SERIES.code));
    expect(await screen.findByText(CHILD_SERIES.code)).toBeInTheDocument();
    // Still on the same wizard step conceptually (step label doesn't reset).
    expect(screen.getByText(/étape/i)).toBeInTheDocument();
    await user.click(screen.getByText(CHILD_SERIES.code));
    // Subjects
    expect(
      await screen.findByText(SUBJECT.name),
    ).toBeInTheDocument();
    expect(screen.getByText("obligatoire")).toBeInTheDocument();
    await user.click(screen.getByText(SUBJECT.name)); // locked, no toggle
    await user.click(screen.getByRole("button", { name: /continuer/i }));
    // Account
    await user.type(await screen.findByLabelText(/numéro de téléphone/i), "0670000000");
    await user.type(screen.getByLabelText(/^pin/i), "1234");
    await user.type(screen.getByLabelText(/confirme le pin/i), "1234");
    await user.click(screen.getByRole("button", { name: /créer mon compte/i }));

    await waitFor(() =>
      expect(screen.queryByText(/créer mon compte/i)).not.toBeInTheDocument(),
    );
  });

  it("validation blocks continuing without full_name", async () => {
    const user = userEvent.setup();
    renderWizard("/onboarding");
    await goToProfile(user);
    expect(screen.getByRole("button", { name: /continuer/i })).toBeDisabled();
  });

  it("non-binding series shows extras in a separate section and allows selection", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderWizard("/onboarding");
    await goToProfile(user);
    await user.type(await screen.findByLabelText(/nom complet/i), "T");
    await user.click(screen.getByRole("button", { name: /continuer/i }));
    await user.click(await screen.findByText(EXAM.name));
    // The Arts series (non-binding, root) appears directly and is chosen.
    await user.click(await screen.findByText(NONBINDING_SERIES.code));

    expect(
      await screen.findByText(/ajouter d'autres matières/i),
    ).toBeInTheDocument();
    expect(screen.getByText(EXTRA_SUBJECT.name)).toBeInTheDocument();
    await user.click(screen.getByText(EXTRA_SUBJECT.name));
    expect(screen.getByRole("button", { name: /continuer/i })).toBeEnabled();
  });

  it("duplicate phone shows the specific inline error, not a toast", async () => {
    const user = userEvent.setup({ pointerEventsCheck: 0 });
    renderWizard("/onboarding");
    await goToProfile(user);
    await user.type(await screen.findByLabelText(/nom complet/i), "T");
    await user.click(screen.getByRole("button", { name: /continuer/i }));
    await user.click(await screen.findByText(EXAM.name));
    await user.click(await screen.findByText(PARENT_SERIES.code));
    await user.click(await screen.findByText(CHILD_SERIES.code));
    await user.click(await screen.findByText(SUBJECT.name));
    await user.click(screen.getByRole("button", { name: /continuer/i }));

    // Mock the register endpoint to return 409.
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === "string" ? input : input.toString();
        if (url === "/api/v1/students/register" && init?.method === "POST") {
          return jsonResponse(409, {
            detail: "This phone number is already registered.",
          });
        }
        if (url === "/api/v1/exams") return jsonResponse(200, [EXAM]);
        if (url === `/api/v1/exams/${EXAM.id}/series`) {
          return jsonResponse(200, [PARENT_SERIES, CHILD_SERIES]);
        }
        if (url === `/api/v1/series/${CHILD_SERIES.id}/subjects`) {
          return jsonResponse(200, [SUBJECT]);
        }
        return jsonResponse(404, {});
      }),
    );

    await user.type(
      await screen.findByLabelText(/numéro de téléphone/i),
      "0670000000",
    );
    await user.type(screen.getByLabelText(/^pin/i), "1234");
    await user.type(screen.getByLabelText(/confirme le pin/i), "1234");
    await user.click(screen.getByRole("button", { name: /créer mon compte/i }));

    expect(
      await screen.findByText("This phone number is already registered."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /créer mon compte/i }),
    ).toBeInTheDocument();
  });
});
