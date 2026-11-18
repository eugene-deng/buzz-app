import { useState, useSyncExternalStore } from "react";
import { ToastProvider } from "../../../src/shared/design-system/ui/Toast";
import "./toolbar.css";
import { Input } from "../../../src/shared/design-system/ui/Input";
import { Button } from "../../../src/shared/design-system/ui/Button";
import { Dialog } from "../../../src/shared/design-system/ui/Dialog";
import { samples, conciseSamples, defaults, type Config } from "./catalog";
import { SonnerReference } from "./sonner-reference";
import { Notices } from "./notices";
const listeners = new Set<() => void>();
let state = {
  c: { ...defaults, width: 420, padding: 6, radius: 12, position: "toolbar" },
  shown: false,
  baseline: false,
  reference: true,
};
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};
const snapshot = () => state;
function change(patch: Partial<typeof state>) {
  state = { ...state, ...patch };
  for (const fn of listeners) fn();
}
export function ToolbarToast() {
  const { c, shown, baseline, reference } = useSyncExternalStore(
    subscribe,
    snapshot,
  );
  const [container, containerRef] = useState<HTMLDivElement | null>(null);
  if (reference) return shown ? <SonnerReference c={c} /> : null;
  if (baseline || c.position !== "toolbar") return null;
  return (
    <div
      className="toolbar-toast-host"
      title={`${c.title}\n${c.description}`}
      ref={containerRef}
      style={{ width: shown ? `min(${c.width}px, calc(100vw - 180px))` : 0 }}
    >
      {container && (
        <ToastProvider portalContainer={container}>
          {shown && (
            <Notices
              key={`${c.sample}-${c.sequence}`}
              c={{ ...c, timeout: 0, stack: 1, dismiss: true }}
              baseline={false}
            />
          )}
        </ToastProvider>
      )}
    </div>
  );
}
export function ToastWorkshop() {
  const { c, shown, baseline, reference } = useSyncExternalStore(
    subscribe,
    snapshot,
  );
  const set = (fn: (previous: Config) => Config) => change({ c: fn(state.c) });
  const show = (shown: boolean) => change({ shown });
  const base = (baseline: boolean) => change({ baseline });
  const [modal, open] = useState(false);
  const [search, setSearch] = useState("");
  const update = (value: Partial<Config>) =>
    set((previous) => ({ ...previous, ...value }));
  const s = samples[c.sample];
  const select = (index: number) => {
    const next = conciseSamples[index];
    if (!next) return;
    update({
      sample: index,
      title: next.title,
      description: reference ? (next.description ?? "") : "",
      dismiss: next.dismiss,
      timeout: next.timeout,
      sequence: c.sequence + 1,
    });
    show(true);
  };
  const range = (
    key: "width" | "padding" | "radius" | "timeout" | "stack",
    label: string,
    min: number,
    max: number,
    step = 1,
  ) => (
    <label style={{ display: "grid", gap: "var(--space-1)" }}>
      {label}: {c[key]}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={c[key]}
        onChange={(e) => update({ [key]: Number(e.target.value) })}
      />
    </label>
  );
  const position =
    c.position === "bottom-left"
      ? "left:16px;right:auto;"
      : c.position === "top-center"
        ? "left:50%;right:auto;transform:translateX(-50%);"
        : c.position === "top-bar"
          ? "left:16px;right:16px;width:auto;"
          : "right:16px;left:auto;";
  if (!s) return null;
  return (
    <section
      aria-label="Toast workshop controls"
      style={{
        padding: "var(--space-4)",
        paddingTop: reference
          ? 260
          : c.position === "toolbar" && !baseline
            ? 48
            : undefined,
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
        overflow: "auto",
        minWidth: 0,
        minHeight: 0,
        height: "100%",
      }}
    >
      <p className="text-body-sm">
        Toast design workshop · sample notifications and simulated actions. Open
        any channel, then use these controls.
      </p>
      <label>
        <input
          type="checkbox"
          checked={reference}
          onChange={(e) =>
            change({
              reference: e.target.checked,
              baseline: false,
              shown: false,
            })
          }
        />{" "}
        Sonner stack · Buzz styles
      </label>
      {reference && (
        <p className="text-body-sm">
          Choose scenarios to add notifications. Hover the stack to expand it.
          Buzz buttons and typography with Sonner’s stacking and motion. Actions
          are simulated.{" "}
          {c.timeout > 0
            ? `This sample closes after ${c.timeout / 1000} seconds.`
            : "This sample stays until dismissed or its condition resolves."}{" "}
          Hover pauses timed notifications. Ongoing conditions do not resolve
          automatically in this simulation.
        </p>
      )}
      <p className="text-body-sm">
        {s.note} Source: {s.file}.
      </p>
      <Input
        aria-label="Search toast scenarios"
        placeholder={`Search ${samples.length} scenarios, messages, or source files`}
        value={search}
        onChange={(event) => setSearch(event.target.value)}
      />
      <fieldset
        style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
        aria-label="Toast scenarios"
        className="toast-scenario-grid"
      >
        {Array.from(
          new Set(
            samples.map((sample) => sample.name.split(" ·")[0] ?? sample.name),
          ),
        )
          .map((title) => ({
            title,
            matches: (name: string) => name.split(" ·")[0] === title,
          }))
          .filter((group) =>
            samples.some(
              (sample) =>
                group.matches(sample.name) &&
                `${sample.name} ${sample.title} ${sample.description ?? ""} ${sample.file}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
            ),
          )
          .map((group) => (
            <div key={group.title} style={{ gridColumn: "1 / -1" }}>
              <h3 className="text-label-sm">{group.title}</h3>
              {group.title === "App updates" && (
                <p className="text-body-sm">
                  Includes toolbar and Settings states adapted as toasts for
                  comparison. Update actions are simulated.
                </p>
              )}
              <div className="toast-scenario-grid">
                {samples.map(
                  (sample, index) =>
                    group.matches(sample.name) &&
                    `${sample.name} ${sample.title} ${sample.description ?? ""} ${sample.file}`
                      .toLowerCase()
                      .includes(search.toLowerCase()) && (
                      <Button
                        key={sample.name}
                        size="caption"
                        variant={c.sample === index ? "prominent" : "subtle"}
                        aria-pressed={c.sample === index}
                        onClick={() => select(index)}
                      >
                        {sample.name}
                      </Button>
                    ),
                )}
              </div>
            </div>
          ))}
      </fieldset>
      {!reference && (
        <label>
          <input
            type="checkbox"
            checked={baseline}
            onChange={(e) => base(e.target.checked)}
          />{" "}
          Current main defaults
        </label>
      )}
      {!baseline && (
        <>
          <label>
            Placement
            <select
              style={{ width: "100%" }}
              value={c.position}
              onChange={(e) => update({ position: e.target.value })}
            >
              {[
                "toolbar",
                "bottom-right",
                "bottom-left",
                "top-right",
                "top-center",
                "top-bar",
              ].map((p) => (
                <option key={p}>{p}</option>
              ))}
            </select>
          </label>
          <label>
            Title
            <textarea
              style={{ width: "100%" }}
              value={c.title}
              onChange={(e) => update({ title: e.target.value })}
            />
          </label>

          {reference && (
            <label>
              Subtitle
              <textarea
                style={{ width: "100%" }}
                value={c.description}
                onChange={(e) => update({ description: e.target.value })}
              />
            </label>
          )}
          {range("width", "Width", 260, 620, 4)}
          {c.position !== "toolbar" && range("padding", "Padding", 8, 32)}
          {c.position !== "toolbar" && range("radius", "Corners", 0, 40)}
          {c.position !== "toolbar" &&
            range("timeout", "Expiry ms (0 = persistent)", 0, 16000, 1000)}
        </>
      )}
      {c.position !== "toolbar" && range("stack", "Stack count", 1, 6)}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--space-2)" }}>
        <Button
          onClick={() => {
            update({ sequence: c.sequence + 1 });
            show(true);
          }}
        >
          Show toast
        </Button>
        <Button onClick={() => show(false)}>Clear toast</Button>
        <Button onClick={() => open(true)}>Test modal</Button>
      </div>
      <p className="text-caption">
        Toolbar preview extends down to the tab header and holds one notice for
        inspection. Use Buzz Settings for appearance and text size. The real
        composer, sidebar, tabs, menus, and panel resizing remain interactive.
      </p>
      {shown && !baseline && c.position !== "toolbar" && (
        <style>{`.buzz-toast-viewport[data-sonner-toaster][data-x-position][data-y-position]{width:min(${c.width}px,calc(100vw - 32px));${position}${c.position.startsWith("top") ? "top:16px;bottom:auto;" : ""}}.buzz-toast.floating-surface{padding:${c.padding}px;--floating-radius:${c.radius}px;}`}</style>
      )}
      {shown && !reference && (baseline || c.position !== "toolbar") && (
        <Notices
          key={`${c.sample}-${c.sequence}-${baseline}`}
          c={c}
          baseline={baseline}
        />
      )}
      <Dialog
        open={modal}
        onOpenChange={open}
        title="Review example plugin"
        description="A shared Buzz dialog over the full app chrome."
        actions={
          <>
            <Button onClick={() => open(false)}>Cancel</Button>
            <Button onClick={() => open(false)}>Enable example plugin</Button>
          </>
        }
      >
        <p>Read calendar</p>
        <p>Start a background process</p>
        <p>These are fictional permissions. This preview grants no access.</p>
      </Dialog>
    </section>
  );
}
