import * as fs from "node:fs";
import * as path from "node:path";
import MiniSearch from "minisearch";
import { EXIT_USER_ERROR } from "../utils/exit-codes.js";
import { listFiles, resolveFile } from "../utils/files.js";
import { extractLinks } from "../utils/markdown.js";
import {
  bold,
  dim,
  error,
  type OutputOptions,
  output,
} from "../utils/output.js";
import { findVault } from "../utils/vault.js";

interface SearchOpts extends OutputOptions {
  vault?: string;
  query?: string;
  path?: string;
  limit?: string;
  total?: boolean;
  snippetLines?: string;
  snippets?: boolean;
  score?: boolean;
}

interface DocRecord {
  id: number;
  file: string;
  basename: string;
  content: string;
  mtime: number;
}

function buildIndex(vaultPath: string, folder?: string) {
  const files = listFiles(vaultPath, { folder, ext: "md" });

  const docs: DocRecord[] = files.map((file, id) => {
    const fullPath = path.join(vaultPath, file);
    const content = fs.readFileSync(fullPath, "utf-8");
    const stat = fs.statSync(fullPath);
    const basename = path.basename(file, ".md");
    return { id, file, basename, content, mtime: stat.mtimeMs };
  });

  const index = new MiniSearch({
    fields: ["basename", "content"],
    storeFields: ["file"],
    searchOptions: {
      boost: { basename: 2 },
      fuzzy: 0.2,
      prefix: true,
    },
  });

  index.addAll(docs);
  return { index, docs };
}

/**
 * Build a map of file -> inbound link count for the vault.
 */
function buildBacklinkCounts(vaultPath: string): Map<string, number> {
  const files = listFiles(vaultPath, { ext: "md" });
  const counts = new Map<string, number>();

  for (const file of files) {
    const content = fs.readFileSync(path.join(vaultPath, file), "utf-8");
    const links = extractLinks(content);
    for (const target of links.wikilinks) {
      const resolved = resolveFile(vaultPath, target);
      if (resolved) {
        counts.set(resolved, (counts.get(resolved) || 0) + 1);
      }
    }
  }

  return counts;
}

/**
 * Extract snippets: lines matching query terms with surrounding context.
 */
function extractSnippets(
  content: string,
  query: string,
  contextLines: number,
): { line: number; text: string }[] {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);
  const lines = content.split("\n");
  const matchedLines = new Set<number>();

  for (let i = 0; i < lines.length; i++) {
    const lower = lines[i].toLowerCase();
    if (terms.some((t) => lower.includes(t))) {
      matchedLines.add(i);
    }
  }

  // Expand with context and merge overlapping ranges
  const ranges: [number, number][] = [];
  for (const lineIdx of [...matchedLines].sort((a, b) => a - b)) {
    const start = Math.max(0, lineIdx - contextLines);
    const end = Math.min(lines.length - 1, lineIdx + contextLines);
    if (ranges.length > 0 && start <= ranges[ranges.length - 1][1] + 1) {
      ranges[ranges.length - 1][1] = end;
    } else {
      ranges.push([start, end]);
    }
  }

  // Build snippets, filtering out:
  // - Empty/whitespace-only lines
  // - H1 headings that just repeat the filename (redundant with file path)
  const snippets: { line: number; text: string }[] = [];
  for (const [start, end] of ranges) {
    for (let i = start; i <= end; i++) {
      const line = lines[i];
      if (line.trim() === "") continue;
      snippets.push({ line: i + 1, text: line });
    }
  }

  return snippets;
}

/**
 * Format relative time from mtime.
 */
function relativeTime(mtimeMs: number): string {
  const diff = Date.now() - mtimeMs;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export async function search(opts: SearchOpts) {
  const v = findVault(opts.vault);
  if (!opts.query) {
    error("No query specified. Use --query <text>");
    process.exit(EXIT_USER_ERROR);
  }

  const { index, docs } = buildIndex(v.path, opts.path);
  const backlinkCounts = buildBacklinkCounts(v.path);
  const results = index.search(opts.query);
  const contextLines = opts.snippetLines
    ? Number.parseInt(opts.snippetLines, 10)
    : 0;
  const limit = opts.limit ? Number.parseInt(opts.limit, 10) : 30;

  // Compute composite scores: BM25 + backlinks + recency
  const maxMtime = Math.max(...docs.map((d) => d.mtime));
  const minMtime = Math.min(...docs.map((d) => d.mtime));
  const mtimeRange = maxMtime - minMtime || 1;

  const scored = results.map((r) => {
    const doc = docs[r.id];
    const bm25Score = r.score;
    const links = backlinkCounts.get(doc.file) || 0;
    const recency = (doc.mtime - minMtime) / mtimeRange; // 0-1

    // Composite: BM25 dominates, backlinks and recency are boosters
    const composite = bm25Score + links * 0.5 + recency * 1.0;

    return {
      file: doc.file,
      score: Math.round(composite * 10) / 10,
      links,
      modified: relativeTime(doc.mtime),
      snippets:
        opts.snippets === false
          ? []
          : extractSnippets(doc.content, opts.query as string, contextLines),
    };
  });

  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, limit);

  output(opts, {
    json: () => {
      if (opts.total) return { total: top.length };
      // Score hidden by default — can give agents unexpected assumptions
      // about result quality. Use --score to include it.
      const mapResult = (r: (typeof top)[0]) => {
        const { score: _score, snippets, ...rest } = r;
        const out: Record<string, unknown> = { ...rest };
        if (opts.score) out.score = r.score;
        if (opts.snippets !== false) out.snippets = snippets;
        return out;
      };
      return { results: top.map(mapResult) };
    },
    human: () => {
      if (opts.total) {
        console.log(top.length);
        return;
      }
      for (const r of top) {
        console.log(
          // Score hidden by default — can give agents unexpected assumptions
          // about result quality. Use --score to include it.
          `${bold(r.file)} ${dim(`(${opts.score ? `score: ${r.score}, ` : ""}links: ${r.links}, modified: ${r.modified})`)}`,
        );
        for (const s of r.snippets) {
          console.log(`  ${dim(`${s.line}:`)} ${s.text}`);
        }
      }
      console.log("");
      console.log(
        dim(
          "HINT: Use napkin read <file> to open a full file. Use napkin outline --file <file> to see its structure.",
        ),
      );
    },
  });
}
