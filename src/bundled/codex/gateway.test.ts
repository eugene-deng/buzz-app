import { describe, expect, it } from "vitest";
import {
  VECTOR_BINDING,
  VECTOR_IDENTITY,
  VECTOR_PROFILE,
} from "../../features/agents/gateway/vectors";
import { inferenceBundle } from "../../features/agents/gateway/contract";
import type { EligibleRoute } from "../../features/agents/gateway/route";
import { gatewayProvider, threadConfig } from "./gateway";

const route: EligibleRoute = {
  kind: "eligible",
  revision: 1,
  gatewayOrigin: "https://gateway.test",
  identity: VECTOR_IDENTITY,
  profile: VECTOR_PROFILE,
  harnesses: ["codex"],
};

describe("gatewayProvider", () => {
  it("takes Codex's active configured provider, with its headers", () => {
    expect(
      gatewayProvider({
        model_provider: "corp",
        model_providers: {
          corp: { http_headers: { "x-team": "t" } },
          other: {},
        },
      }),
    ).toEqual({ id: "corp", headers: { "x-team": "t" } });
  });

  it.each([
    ["no active provider", { model_providers: { corp: {} } }],
    ["the built-in provider", { model_provider: "openai" }],
    ["a dotted id", { model_provider: "a.b", model_providers: { "a.b": {} } }],
  ])("finds none with %s", (_, providers) => {
    expect(gatewayProvider(providers)).toBeUndefined();
  });
});

describe("threadConfig", () => {
  it("keeps the person's headers and replaces every reserved one with the bundle", () => {
    const bundle = inferenceBundle(VECTOR_PROFILE, VECTOR_BINDING, {
      channel_id: null,
      message_id: null,
      thread_id: null,
    });
    if (!bundle.ok) throw new Error(bundle.message);
    const table = threadConfig(
      { route },
      {
        id: "corp",
        headers: {
          "x-team": "t",
          "X-GW-CTX-Channel-Id": "stale",
          x_gw_launcher_session: "stale",
        },
      },
      bundle.value,
    );
    expect(table).toEqual({
      "model_providers.corp.http_headers": { "x-team": "t", ...bundle.value },
    });
  });
});
