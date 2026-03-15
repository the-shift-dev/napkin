import { describe, expect, test } from "bun:test";
import { createTempVault } from "../utils/test-helpers.js";
import { overview } from "./overview.js";

describe("overview", () => {
  test("generates overview for vault with folders", async () => {
    const vault = createTempVault({
      "projects/roadmap.md":
        "---\ntags: [active]\n---\n# Roadmap\nLaunch the product in Q2",
      "projects/design.md": "# Design\nUI mockups and #wireframes",
      "notes/meeting.md": "# Meeting Notes\nDiscussed #hiring timeline",
      "readme.md": "# Welcome\nThis is the vault root",
    });

    // Test JSON output by capturing
    const captured: unknown[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => captured.push(...args);
    await overview({
      vault: vault.path,
      json: true,
      quiet: false,
      copy: false,
    });
    console.log = origLog;

    const result = JSON.parse(captured[0] as string);
    expect(result.overview).toBeArray();
    expect(result.overview.length).toBeGreaterThanOrEqual(3);

    const projectsFolder = result.overview.find(
      (f: { path: string }) => f.path === "projects",
    );
    expect(projectsFolder).toBeDefined();
    expect(projectsFolder.notes).toBe(2);
    expect(projectsFolder.tags).toContain("active");

    vault.cleanup();
  });

  test("respects depth limit", async () => {
    const vault = createTempVault({
      "a/b/c/deep.md": "# Deep note",
      "top.md": "# Top",
    });

    const captured: unknown[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => captured.push(...args);
    await overview({
      vault: vault.path,
      json: true,
      quiet: false,
      copy: false,
      depth: "1",
    });
    console.log = origLog;

    const result = JSON.parse(captured[0] as string);
    const paths = result.overview.map((f: { path: string }) => f.path);
    expect(paths).not.toContain("a/b/c");

    vault.cleanup();
  });

  test("empty vault", async () => {
    const vault = createTempVault({});

    const captured: unknown[] = [];
    const origLog = console.log;
    console.log = (...args: unknown[]) => captured.push(...args);
    await overview({
      vault: vault.path,
      json: true,
      quiet: false,
      copy: false,
    });
    console.log = origLog;

    const result = JSON.parse(captured[0] as string);
    expect(result.overview).toEqual([]);

    vault.cleanup();
  });
});
