import { useEffect, useRef, useState } from "react";
import {
  ToastNotice,
  useToastNotification,
  useToastDismiss,
} from "../../../src/shared/design-system/ui/Toast";
import { Button } from "../../../src/shared/design-system/ui/Button";
import { samples, conciseSamples, type Config } from "./catalog";
const report = (text: string) =>
  parent.postMessage({ type: "toast-result", text }, location.origin);
function Feedback({
  sample,
  count,
}: {
  sample: (typeof samples)[number];
  count: number;
}) {
  const notify = useToastNotification(),
    dismiss = useToastDismiss();
  const current = useRef({ notify, dismiss });
  current.current = { notify, dismiss };
  useEffect(() => {
    const ids = Array.from({ length: count }, () =>
      current.current.notify(
        sample.title,
        sample.tone === "warning" ? "info" : sample.tone,
        sample.actions?.[0]
          ? {
              label: sample.actions[0],
              onClick: () =>
                report(`Simulated ${sample.actions?.[0]} — no live changes.`),
              timeout: sample.timeout,
            }
          : undefined,
      ),
    );
    return () =>
      ids.forEach((id) => {
        current.current.dismiss(id);
      });
  }, [sample, count]);
  return null;
}
export function Notices({ c, baseline }: { c: Config; baseline: boolean }) {
  const s = (baseline ? samples : conciseSamples)[c.sample];
  const [closed, close] = useState<number[]>([]);
  if (!s) return null;
  if (baseline && s.feedback) return <Feedback sample={s} count={c.stack} />;
  return (
    <>
      {Array.from({ length: c.stack }, (_, i) => i).map((i) =>
        closed.includes(i) ? null : (
          <ToastNotice
            key={i}
            title={baseline ? s.title : c.title}
            {...((baseline ? s.description : c.description)
              ? { description: baseline ? s.description : c.description }
              : {})}
            tone={s.tone}
            timeout={baseline ? s.timeout : c.timeout}
            {...((baseline ? s.dismiss : c.dismiss)
              ? {
                  onDismiss: () => {
                    close((v) => [...v, i]);
                    report("Dismissed preview notification.");
                  },
                }
              : {})}
            {...(s.name.startsWith("Plugin · update")
              ? {
                  navigation: {
                    label: "Manage Calendar",
                    open: () => report("Simulated plugin settings."),
                  },
                }
              : {})}
          >
            {s.actions?.length
              ? s.actions.map((action) => (
                  <Button
                    key={action}
                    size={s.feedback ? "compact" : "sm"}
                    loading={baseline && s.name === "App update · retrying"}
                    onClick={() => {
                      report(`Simulated “${action}” — no live changes.`);
                      close((v) => [...v, i]);
                    }}
                  >
                    {action}
                  </Button>
                ))
              : undefined}
          </ToastNotice>
        ),
      )}
    </>
  );
}
