# Overview — Keyword Extraction

The `napkin overview` command generates a vault-wide index by extracting distinctive keywords per folder using TF-IDF with source weighting and bigram support.

## Pipeline

```
Files → Group by folder → Collect weighted text → Build TF → Compute IDF across folders → Score TF-IDF → Deduplicate bigrams → Top N keywords
```

### 1. Text Collection & Weighting

Not all text is equal. Sources are weighted by signal strength:

| Source | Weight | Rationale |
|--------|--------|-----------|
| Headings | 3x | Curated by the author, high intent |
| Filenames | 2x | Chosen names are strong signals |
| Frontmatter title | 2x | Explicit metadata |
| Body text | 1x | Bulk content, noisier |

### 2. Noise Stripping

Before tokenization, we strip:
- URLs (`https://...`)
- Emails
- Code blocks (fenced and inline)
- Hex hashes (commit SHAs, etc.)

### 3. Tokenization

- Lowercase, alpha-only, 3+ characters
- Filtered against a stop word list (~120 common English words)

### 4. Bigram Extraction

Two-word phrases are extracted alongside unigrams. Bigrams are kept only if:
- They appear **2+ times** in the folder (otherwise likely noise)
- The two words are **not identical** (filters "tbd tbd" type garbage)

### 5. TF-IDF Scoring

Each folder is treated as a "document":

- **TF** = weighted term frequency within the folder
- **IDF** = `log(1 + totalFolders / foldersContainingTerm)`

The `1 +` dampening prevents over-penalizing terms that appear in a few folders. A word in 3 out of 9 folders still gets reasonable weight, while a word in all 9 gets suppressed.

### 6. Bigram Deduplication

When a bigram is selected (e.g., "knowledge base"), its constituent unigrams ("knowledge", "base") are suppressed from the results. This prevents redundant keyword slots.

## Configuration

| Flag | Default | Description |
|------|---------|-------------|
| `--keywords <n>` | 8 | Max keywords per folder |
| `--depth <n>` | 3 | Max folder depth to index |

## Example

```
Resources/Runbooks/
  keywords: remote, vercel, context, runbook, auth, handoff, rule, pipeline
  notes: 6
```

"runbook" appears here because it's distinctive to this folder (high IDF), while "notes" — which appears in every folder — is suppressed.
