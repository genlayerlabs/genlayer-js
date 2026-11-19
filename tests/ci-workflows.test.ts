import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";

const { load } = createRequire(import.meta.url)("js-yaml");
const workflow = (name: string) =>
  load(readFileSync(new URL(`../.github/workflows/${name}.yml`, import.meta.url), "utf8"));

describe("development branch CI coverage", () => {
  for (const name of ["test", "chains-drift"]) {
    for (const event of ["push", "pull_request"]) {
      it(`${name} runs on ${event} for supported branches`, () => {
        expect(workflow(name).on[event].branches).toEqual(
          expect.arrayContaining(["v1", "v2-dev", "v2", "v3-dev"]),
        );
      });
    }
  }

  it.each([
    ["pull_request", "v2-dev", false],
    ["pull_request", "v3-dev", false],
    ["pull_request", "v1", true],
    ["pull_request", "v2", true],
    ["pull_request", "main", true],
    ["schedule", "", true],
    ["workflow_dispatch", "v3-dev", true],
  ])("smoke policy for %s / %s is %s", (event, base, expected) => {
    const smoke = workflow("smoke");
    expect(Object.keys(smoke.on)).toContain(event);
    // Guard the shared subset before evaluating it as JavaScript. GitHub-only
    // functions require extending this test's evaluator, not changing CI.
    expect(
      smoke.jobs.smoke.if,
      "Unsupported smoke expression: extend the test evaluator for GitHub-only syntax",
    ).toMatch(/^(?:github\.(?:event_name|base_ref)|'[^'\\]*'|!=|&&|\|\||[()\s])+$/);
    const enabled = new Function("github", `return (${smoke.jobs.smoke.if});`);
    expect(enabled({ event_name: event, base_ref: base })).toBe(expected);
  });
});
