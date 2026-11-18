export const inject = ["react", "panels"];
export function apply(ctx) {
  const component = globalThis.__toastWorkshop;
  if (!component)
    throw new Error("Run this fixture with its demo mocks module.");
  ctx.panels.register({
    id: "workshop",
    title: "Toast workshop",
    matches: (target) => target === "toast-workshop",
    component,
    keepOpen: true,
    toolbar: globalThis.__toolbarToast,
    launcher: {
      icon:
        "data:image/svg+xml," +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M7 10h10M7 14h6" stroke="currentColor" stroke-width="2"/></svg>',
        ),
      target: "toast-workshop",
    },
    channelPlacement: "side",
    channelLauncher: (props) =>
      ctx.react.createElement(
        "button",
        {
          type: "button",
          onClick: () => props.toggle("toast-workshop"),
          "aria-label": "Toast workshop",
        },
        "Toast workshop",
      ),
  });
}
