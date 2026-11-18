// Fixture-only bridge. The plugin contains no runtime imports and is never installed.
import { ToastWorkshop, ToolbarToast } from "./shell-workshop.tsx";
globalThis.__toastWorkshop = ToastWorkshop;

globalThis.__toolbarToast = ToolbarToast;
