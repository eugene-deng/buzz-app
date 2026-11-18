import { useEffect, useId, useRef } from "react";
import { Toaster, toast } from "sonner";
import { Button } from "../../../src/shared/design-system/ui/Button";
import { conciseSamples, type Config } from "./catalog";

// Keep Sonner’s layout and motion, with Buzz controls and typography.
const windowInset = 8;

export function SonnerReference({ c }: { c: Config }) {
  const id = useId();
  const ids = useRef<(string | number)[]>([]);
  useEffect(() => {
    const sample = conciseSamples[c.sample];
    if (!sample) return;
    const toastId = `${id}-${c.sequence}`;
    ids.current.push(
      toast(c.title, {
        id: toastId,
        toasterId: id,
        className: `toast-tone-${sample.tone}`,
        description: c.description || undefined,
        duration: c.timeout > 0 ? c.timeout : Infinity,
        action: sample.actions?.[0] ? (
          <span className="toast-sonner-action">
            {sample.actions.map((label) => (
              <Button
                key={label}
                variant="subtle"
                size="compact"
                onClick={() => toast.dismiss(toastId)}
              >
                {label}
              </Button>
            ))}
          </span>
        ) : undefined,
      }),
    );
  }, [id, c.sample, c.sequence, c.title, c.description, c.timeout]);
  useEffect(
    () => () => {
      ids.current.forEach((value) => {
        toast.dismiss(value);
      });
    },
    [],
  );
  return (
    <Toaster
      id={id}
      position="top-right"
      expand={false}
      visibleToasts={3}
      closeButton
      offset={windowInset}
      className="toast-sonner-reference"
      style={
        {
          "--width": `${c.width}px`,
          "--toast-window-inset": `${windowInset}px`,
        } as React.CSSProperties
      }
    />
  );
}
