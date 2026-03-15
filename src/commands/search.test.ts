import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { createTempVault } from "../utils/test-helpers.js";
import { search } from "./search.js";

let v: { path: string; cleanup: () => void };

async function captureJson(
  fn: () => Promise<void>,
): Promise<Record<string, unknown>> {
  const orig = console.log;
  const logs: string[] = [];
  console.log = (...args: unknown[]) => logs.push(args.map(String).join(" "));
  await fn();
  console.log = orig;
  return JSON.parse(logs.join(""));
}

beforeEach(() => {
  v = createTempVault({
    "Projects/alpha.md": "# Alpha\nThis is the alpha project\nWith TODO items",
    "Projects/beta.md": "# Beta\nBeta has no tasks",
    "Resources/guide.md": "# Guide\nRefer to the [[alpha]] project here",
    "README.md": "# Vault\nWelcome to the vault",
  });
});

afterEach(() => {
  v.cleanup();
});

describe("search", () => {
  test("finds files matching query with scores", async () => {
    const data = await captureJson(() =>
      search({ json: true, vault: v.path, query: "alpha" }),
    );
    const results = data.results as { file: string; score?: number }[];
    const files = results.map((r) => r.file);
    expect(files).toContain("Projects/alpha.md");
    expect(files).toContain("Resources/guide.md");
    // Score hidden by default
    expect(results[0].score).toBeUndefined();

    // Score shown with --score flag
    const withScore = await captureJson(() =>
      search({ json: true, vault: v.path, query: "alpha", score: true }),
    );
    const scored = withScore.results as { score: number }[];
    expect(scored[0].score).toBeGreaterThan(0);
  });

  test("results include snippets by default", async () => {
    const data = await captureJson(() =>
      search({ json: true, vault: v.path, query: "TODO" }),
    );
    const results = data.results as {
      file: string;
      snippets: { line: number; text: string }[];
    }[];
    expect(results.length).toBeGreaterThan(0);
    const alpha = results.find((r) => r.file === "Projects/alpha.md");
    expect(alpha).toBeDefined();
    expect(alpha!.snippets.length).toBeGreaterThan(0);
    expect(alpha!.snippets.some((s) => s.text.includes("TODO"))).toBeTrue();
  });

  test("no-snippets returns files only", async () => {
    const data = await captureJson(() =>
      search({
        json: true,
        vault: v.path,
        query: "alpha",
        snippets: false,
      }),
    );
    const results = data.results as { file: string; snippets?: unknown }[];
    expect(results[0].snippets).toBeUndefined();
  });

  test("filters by folder", async () => {
    const data = await captureJson(() =>
      search({
        json: true,
        vault: v.path,
        query: "alpha",
        path: "Projects",
      }),
    );
    const results = data.results as { file: string }[];
    expect(results.length).toBe(1);
    expect(results[0].file).toBe("Projects/alpha.md");
  });

  test("returns total", async () => {
    const data = await captureJson(() =>
      search({ json: true, vault: v.path, query: "alpha", total: true }),
    );
    expect(data.total).toBe(2);
  });

  test("limits results", async () => {
    const data = await captureJson(() =>
      search({ json: true, vault: v.path, query: "the", limit: "1" }),
    );
    const results = data.results as { file: string }[];
    expect(results.length).toBe(1);
  });

  test("results include backlink count", async () => {
    const data = await captureJson(() =>
      search({ json: true, vault: v.path, query: "alpha" }),
    );
    const results = data.results as { file: string; links: number }[];
    const alpha = results.find((r) => r.file === "Projects/alpha.md");
    expect(alpha).toBeDefined();
    // guide.md links to [[alpha]], so alpha should have links >= 1
    expect(alpha!.links).toBeGreaterThanOrEqual(1);
  });

  test("results include modified time", async () => {
    const data = await captureJson(() =>
      search({ json: true, vault: v.path, query: "alpha" }),
    );
    const results = data.results as { file: string; modified: string }[];
    expect(results[0].modified).toMatch(/ago$/);
  });
});
