import { Notices } from "./notices";
import { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ToastProvider,
  useToastClearance,
} from "../../../src/shared/design-system/ui/Toast";
import { Button } from "../../../src/shared/design-system/ui/Button";
import { Dialog } from "../../../src/shared/design-system/ui/Dialog";
import { defaults, type Config } from "./catalog";
import "../../../src/shared/styles/globals.css";
import "./preview.css";
const report = (text: string) =>
  parent.postMessage({ type: "toast-result", text }, location.origin);
function Composer() {
  const ref = useRef<HTMLDivElement>(null);
  useToastClearance(ref);
  return (
    <div ref={ref} className="mock-composer">
      <input aria-label="Message draft" placeholder="Message Honey…" />
      <Button
        onClick={() => report("Simulated Send — composer remains usable.")}
      >
        Send
      </Button>
    </div>
  );
}
function App() {
  const [state, set] = useState<{ c: Config; baseline: boolean }>({
    c: defaults,
    baseline: false,
  });
  const { c, baseline } = state;
  const [modal, setModal] = useState(false);
  useEffect(() => {
    const receive = (event: MessageEvent) => {
      if (
        event.source === parent &&
        event.origin === location.origin &&
        event.data?.type === "toast-lab"
      )
        set({ c: event.data.config, baseline: !!event.data.baseline });
    };
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, []);
  useEffect(() => setModal(c.modal), [c.modal]);
  useEffect(() => {
    document.documentElement.dataset.colorMode = c.theme;
    document.documentElement.style.fontSize = `${(16 * c.text) / 100}px`;
  }, [c.theme, c.text]);
  const top = c.position.startsWith("top");
  const position =
    c.position === "bottom-left"
      ? "left:16px;right:auto;"
      : c.position === "top-center"
        ? "left:50%;right:auto;transform:translateX(-50%);"
        : c.position === "top-bar"
          ? "left:16px;right:16px;width:auto;"
          : "right:16px;left:auto;";
  return (
    <ToastProvider>
      {!baseline && (
        <style>{`.buzz-toast-viewport[data-sonner-toaster][data-x-position][data-y-position]{width:min(${c.width}px,calc(100vw - 32px));${position}${top ? "top:16px;bottom:auto;" : ""}}.buzz-toast.floating-surface{padding:${c.padding}px;--floating-radius:${c.radius}px;}`}</style>
      )}
      <div className="mock-app">
        <header>
          <span>✳ Buzz</span>
          <span>Design review</span>
          <span>•••</span>
        </header>
        <section className="mock-messages">
          <p className="mock-date">TODAY</p>
          <article>
            <div className="mock-avatar">J</div>
            <div>
              <strong>Jamie</strong>
              <small> 14:42</small>
              <p>Can we review the new notification styles?</p>
            </div>
          </article>
          <article>
            <div className="mock-avatar agent">H</div>
            <div>
              <strong>Honey</strong>
              <small> 14:43</small>
              <p>I’ve finished the review. The preview is ready.</p>
            </div>
          </article>
          <Button onClick={() => setModal(true)}>Open plugin review</Button>
          <p className="mock-hint">
            Test background controls, a modal, and the composer.
            <br />
            F6 focuses notifications; Tab reaches actions.
          </p>
        </section>
        {c.composer ? (
          <Composer />
        ) : (
          <footer>Preview workspace · fictional content</footer>
        )}
      </div>
      <Dialog
        open={modal}
        onOpenChange={setModal}
        title="Review Calendar plugin"
        description="A local modal for testing whether toast messages cover controls."
        actions={
          <>
            <Button
              onClick={() => {
                report("Modal Cancel clicked.");
                setModal(false);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() =>
                report("Simulated Enable plugin — modal action reached.")
              }
            >
              Enable plugin
            </Button>
          </>
        }
      >
        <div className="mock-permissions">
          {[
            "Read calendar",
            "Start background process",
            "Show upcoming events",
          ].map((x) => (
            <div key={x}>
              <strong>{x}</strong>
              <p>
                Example permission description. No permissions will be granted.
              </p>
            </div>
          ))}
        </div>
      </Dialog>
      <Notices
        key={`${c.sample}-${c.sequence}-${baseline}`}
        c={c}
        baseline={baseline}
      />
    </ToastProvider>
  );
}
const root = document.getElementById("root");
if (root) createRoot(root).render(<App />);
