// Local staging-only workshop. No relay writes or plugin installation.
import type {} from "../../../src/features/panels/service";
import type { Context } from "@deepseek-ai/cordis";
import { Button } from "../../../src/shared/design-system/ui/Button";
import { ToastWorkshop, ToolbarToast } from "./shell-workshop";
export const inject = ["panels"];
export function apply(ctx: Context) {
  ctx.effect(() => {
    document.body.classList.add("toast-workshop-native");
    return () => document.body.classList.remove("toast-workshop-native");
  });
  ctx.panels.register({
    id: "workshop-launcher",
    title: "Toast workshop",
    matches: (target) => target === "toast-workshop-global",
    component: ToastWorkshop,
    launcher: {
      icon:
        "data:image/svg+xml," +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="5" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
        ),
      target: "toast-workshop-global",
    },
  });
  ctx.panels.register({
    id: "workshop",
    title: "Toast workshop",
    matches: (target) => target === "toast-workshop",
    component: ToastWorkshop,
    keepOpen: true,
    toolbar: ToolbarToast,
    channelPlacement: "side",
    channelLauncher: (props) => (
      <Button size="compact" onClick={() => props.toggle("toast-workshop")}>
        Toast workshop
      </Button>
    ),
  });
}
