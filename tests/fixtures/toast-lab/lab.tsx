import { useState, useRef, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { samples, conciseSamples, defaults, type Config } from "./catalog";
import inventory from "./inventory.json";
import "./lab.css";
function App() {
  const [c, set] = useState(defaults),
    [query, search] = useState(""),
    [log, setLog] = useState("All actions are simulated.");
  const frames = useRef<HTMLIFrameElement[]>([]);
  const update = (patch: Partial<Config>) => set((v) => ({ ...v, ...patch }));
  const send = () =>
    frames.current.forEach((f, i) => {
      f?.contentWindow?.postMessage(
        { type: "toast-lab", config: c, baseline: c.compare && i === 0 },
        location.origin,
      );
    });
  useEffect(send, [c]);
  useEffect(() => {
    const receive = (e: MessageEvent) => {
      if (
        e.origin === location.origin &&
        frames.current.some((f) => f?.contentWindow === e.source) &&
        e.data?.type === "toast-result"
      )
        setLog(e.data.text);
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);
  const sample = conciseSamples[c.sample];
  const select = (index: number) => {
    const s = conciseSamples[index];
    if (!s) return;
    update({
      sample: index,
      title: s.title,
      description: s.description ?? "",
      dismiss: s.dismiss,
      timeout: s.timeout,
      sequence: c.sequence + 1,
    });
  };
  const range = (
    key: "width" | "padding" | "radius" | "text" | "timeout" | "stack",
    label: string,
    min: number,
    max: number,
    step = 1,
  ) => (
    <label>
      {label}{" "}
      <span className="value" aria-hidden="true">
        {c[key]}
        {key === "text"
          ? "%"
          : key === "timeout"
            ? " ms"
            : key === "stack"
              ? ""
              : " px"}
      </span>
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
  const check = (
    key: "dismiss" | "modal" | "composer" | "compare" | "narrow",
    label: string,
  ) => (
    <label className="check">
      <input
        type="checkbox"
        checked={c[key]}
        onChange={(e) => update({ [key]: e.target.checked })}
      />
      {label}
    </label>
  );
  const entries = inventory.entries.filter((e) =>
    (e.file + " " + e.source).toLowerCase().includes(query.toLowerCase()),
  );
  if (!sample) return null;
  return (
    <>
      <header>
        <div>
          <span className="eyebrow">BUZZ / DESIGN WORKSHOP</span>
          <h1>Toast playground</h1>
        </div>
        <p>
          Current main · {inventory.commit.slice(0, 9)}
          <br />
          Local experiments · actual shared toast renderer
        </p>
      </header>
      <main>
        <aside>
          <fieldset
            style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}
            aria-label="Toast scenarios"
            className="scenario-grid"
          >
            {samples.map((sample, index) => (
              <button
                type="button"
                key={sample.name}
                aria-pressed={c.sample === index}
                onClick={() => select(index)}
              >
                {sample.name}
              </button>
            ))}
          </fieldset>
          <p className="note">{sample.note}</p>
          <label>
            Title
            <textarea
              value={c.title}
              rows={2}
              onChange={(e) => update({ title: e.target.value })}
            />
          </label>
          <label>
            Description
            <textarea
              value={c.description}
              rows={2}
              onChange={(e) => update({ description: e.target.value })}
            />
          </label>
          <div className="twocol">
            <label>
              Placement
              <select
                value={c.position}
                onChange={(e) => update({ position: e.target.value })}
              >
                <option>bottom-right</option>
                <option>bottom-left</option>
                <option>top-right</option>
                <option>top-center</option>
                <option>top-bar</option>
              </select>
            </label>
            <label>
              Appearance
              <select
                value={c.theme}
                onChange={(e) => update({ theme: e.target.value })}
              >
                <option>light</option>
                <option>dark</option>
              </select>
            </label>
          </div>
          {range("width", "Width", 260, 620, 4)}
          {range("padding", "Padding", 8, 32)}
          {range("radius", "Corner radius", 0, 40)}
          {range("text", "Text size", 100, 200, 10)}
          {range("timeout", "Expiry (0 = persistent)", 0, 16000, 1000)}
          {range("stack", "Stack count", 1, 6)}
          {check("dismiss", "Show dismiss button")}
          {check("composer", "Docked composer clearance")}
          {check("modal", "Open plugin-review modal")}
          {check("compare", "Compare with current main")}
          {check("narrow", "Narrow viewport (390px)")}
          <div className="buttons">
            <button
              type="button"
              onClick={() => update({ sequence: c.sequence + 1 })}
            >
              Replay
            </button>
            <button
              type="button"
              onClick={() => {
                set({
                  ...defaults,
                  sample: c.sample,
                  title: sample.title,
                  description: sample.description ?? "",
                  dismiss: sample.dismiss,
                  timeout: sample.timeout,
                  sequence: c.sequence + 1,
                });
              }}
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => {
                const blob = new Blob(
                  [
                    JSON.stringify(
                      {
                        snapshot: inventory.commit,
                        scenario: sample.name,
                        ...c,
                      },
                      null,
                      2,
                    ),
                  ],
                  { type: "application/json" },
                );
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "buzz-toast-experiment.json";
                a.click();
                URL.revokeObjectURL(a.href);
                setLog("Experiment exported as JSON.");
              }}
            >
              Export settings
            </button>
          </div>
          <p className="note" role="status">
            {log}
          </p>
        </aside>
        <section className="workspace">
          <div className="preview-heading">
            <h2>{c.compare ? "Current main / experiment" : "Experiment"}</h2>
            <span>Buttons simulate actions; no account connection</span>
          </div>
          <div className={"frames " + (c.compare ? "compare" : "")}>
            {(c.compare ? ["baseline", "experiment"] : ["experiment"]).map(
              (frame, i) => (
                <div className="frame-wrap" key={frame}>
                  <strong>
                    {c.compare && i === 0
                      ? "Current main — source defaults"
                      : "Experiment — your controls"}
                  </strong>
                  <iframe
                    title={
                      c.compare && i === 0
                        ? "Current toast baseline"
                        : "Toast experiment"
                    }
                    ref={(el) => {
                      if (el) frames.current[i] = el;
                    }}
                    onLoad={send}
                    src="./preview.html"
                    style={{ width: c.narrow ? "390px" : "100%" }}
                  />
                </div>
              ),
            )}
          </div>
          <p className="note">
            Source: src/{sample.file}. Examples use fictional names and
            representative dynamic error text. Top placements and styling
            changes are experiments, not shipped behavior. Hover/focus pauses
            expiry.
          </p>
          <details>
            <summary>
              Source inventory · {inventory.entries.length} call sites /{" "}
              {new Set(inventory.entries.map((e) => e.file)).size} files
            </summary>
            <p>
              All direct ToastNotice uses and locally bound toast/media
              notification calls under src, excluding tests. Source excerpts
              show dynamic variants; helper callbacks can add indirect uses.
            </p>
            <label>
              Search inventory
              <input
                placeholder="connection, Update, Retry, Undo…"
                value={query}
                onChange={(e) => search(e.target.value)}
              />
            </label>
            <div className="inventory">
              {entries.map((e) => (
                <details key={e.file + e.line}>
                  <summary>
                    {e.kind} · {e.file}:{e.line}
                  </summary>
                  <pre>{e.source}</pre>
                </details>
              ))}
            </div>
          </details>
        </section>
      </main>
    </>
  );
}
const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
