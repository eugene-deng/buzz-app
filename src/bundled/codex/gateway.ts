// Gateway mode for Codex: the Buzz context on a turn whose membership routes
// through the agent gateway. Routing is the person's own: their Codex
// `config.toml`, which the gateway's setup controls, points a local Codex at
// the gateway, and Buzz never changes it. Every thread start or resume of a
// local agent's gateway turn replaces the active provider's headers with its
// own plus the turn's whole inference bundle. Context validation and session
// lifecycle belong to the shared gateway module.
import type { AgentKey } from "../../features/agents/membership";
import type { Delivery } from "../../features/agents/service";
import {
  composeGatewayHeaders,
  type GatewayHeaders,
} from "../../features/agents/gateway/contract";
import {
  routeFor,
  subscribeRoute,
  upstreamFor,
  type GatewayRoute,
} from "../../features/agents/gateway/route";

/** Codex's stable harness name, which the gateway enables per membership. */
export const HARNESS = "codex";

/** A delivery's frozen gateway routing. */
export type CodexGateway = NonNullable<Delivery["gateway"]>;
/** A route and upstream with no turn yet. */
export type CodexRoute = Omit<CodexGateway, "turn">;

/** The shared route functions Codex reads outside a delivery: compaction's
 * route, and the route a running gateway turn must stay on. */
export type CodexRoutes = Readonly<{
  routeFor(key: AgentKey): GatewayRoute;
  subscribeRoute(key: AgentKey, listener: () => void): () => void;
  upstreamFor(harness: string): Readonly<{ base: string }> | undefined;
}>;
export const CODEX_ROUTES: CodexRoutes = Object.freeze({
  routeFor,
  subscribeRoute,
  upstreamFor,
});

/** The route a session control (compaction) goes by, read now, as the
 * runner reads a turn's: undefined where it wouldn't send the agent's turns
 * to the gateway; else the eligible route that enables Codex with its
 * upstream, or the blocked one its turns would fall back from. */
export function controlRoute(
  routes: CodexRoutes,
  agent: AgentKey,
):
  | Readonly<{ kind: "eligible"; gateway: CodexRoute }>
  | Readonly<{
      kind: "blocked";
      route: Extract<GatewayRoute, { kind: "blocked" }>;
    }>
  | undefined {
  const upstream = routes.upstreamFor(HARNESS);
  if (!upstream) return undefined;
  const route = routes.routeFor(agent);
  if (route.kind === "blocked") return { kind: "blocked", route };
  return route.kind === "eligible" && route.harnesses.includes(HARNESS)
    ? { kind: "eligible", gateway: { route, upstream } }
    : undefined;
}

/** The parts of Codex's normalized configuration (`config/read`) read here. */
export type ProviderConfig = Readonly<{
  model_provider?: string | null;
  model_providers?: Readonly<
    Record<
      string,
      Readonly<{
        http_headers?: Readonly<Record<string, string>> | null;
      }>
    >
  > | null;
}>;
/** The person's provider that routes to the gateway. */
export type GatewayProvider = Readonly<{
  id: string;
  /** Its configured headers, which a thread's table keeps. */
  headers: Readonly<Record<string, string>>;
}>;

/** The provider a local agent's gateway turns go through: Codex's active
 * one, which the gateway's setup of the person's `config.toml` points at
 * the gateway. A local Codex on a gateway route is taken to use the gateway,
 * so its endpoint isn't checked: the context goes to the provider configured.
 * Only a provider that configuration defines takes headers; Codex refuses
 * any override of its built-in one (`openai`), so with it Buzz sends nothing
 * and says so. */
export function gatewayProvider(
  config: ProviderConfig,
): GatewayProvider | undefined {
  const id = config.model_provider;
  // A dotted id would address another key of the thread's config.
  if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) return undefined;
  const provider = config.model_providers?.[id];
  if (!provider) return undefined;
  return { id, headers: { ...provider.http_headers } };
}

/** A thread's config override for `provider`: its whole header table, as the
 * person configured it with every Buzz-reserved header replaced by the
 * turn's bundle. A role with no value is absent, never empty. */
export const threadConfig = (
  gateway: Pick<CodexGateway, "route">,
  provider: GatewayProvider,
  bundle: GatewayHeaders,
) => ({
  [`model_providers.${provider.id}.http_headers`]: composeGatewayHeaders(
    gateway.route.profile,
    provider.headers,
    bundle,
  ),
});

export const NO_PROVIDER =
  "Ran without the Buzz context: Codex's configuration has no model provider of its own to send the gateway headers with.";
export const REMOTE_UNATTRIBUTED =
  "Ran without the Buzz context: Codex on another machine doesn't send the gateway headers yet.";
export const ROUTE_CHANGED =
  "This agent's gateway access changed, so the turn was stopped. Try again.";
export const UNCERTAIN =
  "This conversation's Codex session didn't finish cleanly through the agent gateway, so it can't continue. Start a new session to continue.";
export const TO_GATEWAY =
  "This conversation now runs through the agent gateway, so Codex started a new session for it. Earlier messages are still in the conversation history.";
export const FROM_GATEWAY =
  "This conversation no longer runs through the agent gateway, so Codex started a new session for it. Earlier messages are still in the conversation history.";
export const COMPACT_ORDINARY =
  "This conversation's session ran without the agent gateway, so it can't be compacted through it. Send a message to start its gateway session first.";
export const COMPACT_GATEWAY =
  "This conversation's session ran through the agent gateway, which this agent doesn't use now. Send a message to start a new session first.";
