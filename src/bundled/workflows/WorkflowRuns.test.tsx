// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { WorkflowRuns } from "./WorkflowRuns";
import {
  createWorkflowFixture,
  fixtureDefinition,
  fixtureRun,
  fixtureView,
} from "./fixtures";

afterEach(cleanup);
it("labels each status and shows a step only while a run is live or failed", async () => {
  const fixture = createWorkflowFixture();
  const run = (status: (typeof fixtureRun)["status"], currentStep: number) => ({
    ...fixtureRun,
    id: `${fixtureRun.id.slice(0, -1)}${currentStep}`,
    status,
    currentStep,
  });
  const runs = fixtureView({
    runs: [
      run("pending", 0),
      run("running", 2),
      run("waiting_approval", 3),
      run("failed", 4),
      run("cancelled", 5),
      run("completed", 6),
    ],
    next: null,
  });
  runs.update({ status: "ready", data: runs.view.snapshot().data });
  render(
    <WorkflowRuns
      capability={{ ...fixture.capability, runs: () => runs.view }}
      workflow={fixtureDefinition}
    />,
  );
  for (const label of [
    "Pending",
    "Running",
    "Waiting for approval",
    "Failed",
    "Cancelled",
    "Completed",
  ])
    expect(await screen.findByText(label)).toBeVisible();
  expect(
    screen.getAllByText(/^Current step:/).map((line) => line.textContent),
  ).toEqual(["Current step: 2", "Current step: 3"]);
  expect(screen.getByText("Failed at step 4")).toBeVisible();
  expect(screen.queryByText(/step [056]$/)).toBeNull();
});

it("says a workflow has no runs yet on the first page", async () => {
  const fixture = createWorkflowFixture();
  const runs = fixtureView({ runs: [], next: null });
  runs.update({ status: "ready", data: { runs: [], next: null } });
  render(
    <WorkflowRuns
      capability={{ ...fixture.capability, runs: () => runs.view }}
      workflow={fixtureDefinition}
    />,
  );
  expect(await screen.findByText("No runs yet.")).toBeVisible();
  expect(screen.queryByText("No runs returned on this page.")).toBeNull();
});

it("keeps loaded runs visible without a refresh banner and retains failures", async () => {
  const fixture = createWorkflowFixture();
  const data = { runs: [fixtureRun], next: null };
  const runs = fixtureView(data);
  render(
    <WorkflowRuns
      capability={{ ...fixture.capability, runs: () => runs.view }}
      workflow={fixtureDefinition}
    />,
  );
  await screen.findByText("Completed");
  act(() => runs.update({ status: "loading", data }));
  expect(screen.getByText("Completed")).toBeVisible();
  expect(screen.queryByText("Reading runs…")).toBeNull();
  expect(screen.getByRole("button", { name: "Refresh runs" })).toBeDisabled();
  act(() => runs.update({ status: "error", error: "Read failed", data }));
  expect(screen.getByRole("alert")).toHaveTextContent("Read failed");
  expect(screen.getByRole("button", { name: "Refresh runs" })).toBeEnabled();
});
