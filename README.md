# napkin

🧻 Obsidian-compatible CLI for agents.

Every great idea started on a napkin. This one reads your Obsidian vault.

## Install

```bash
npm install -g napkin-ai
```

## Usage

Run from inside an Obsidian vault (any directory containing `.obsidian/`):

```bash
cd ~/my-vault
napkin vault
```

Or specify the vault path:

```bash
napkin --vault ~/my-vault vault
```

### Global flags

| Flag | Description |
|---|---|
| `--json` | Output as JSON |
| `-q, --quiet` | Suppress output |
| `--vault <path>` | Vault path (default: auto-detect from cwd) |
| `--copy` | Copy output to clipboard |

## Commands

### Core

```bash
napkin vault                          # Vault info
napkin read <file>                    # Read file contents
napkin create --name "Note" --content "Hello"
napkin append --file "Note" --content "More text"
napkin prepend --file "Note" --content "Top line"
napkin move --file "Note" --to Archive
napkin rename --file "Note" --name "Renamed"
napkin delete --file "Note"           # Move to .trash
napkin search "meeting"               # Full-text search
napkin search "TODO" --context        # Grep-style output
```

### Files & folders — `napkin file`

```bash
napkin file info <name>               # File info (path, size, dates)
napkin file list                      # List all files
napkin file list --ext md             # Filter by extension
napkin file list --folder Projects    # Filter by folder
napkin file folder <path>             # Folder info
napkin file folders                   # List all folders
```

### Daily notes — `napkin daily`

```bash
napkin daily today                    # Create today's daily note
napkin daily path                     # Print daily note path
napkin daily read                     # Print daily note contents
napkin daily append --content "- [ ] Buy groceries"
napkin daily prepend --content "## Morning"
```

### Tags — `napkin tag`

```bash
napkin tag list                       # List all tags
napkin tag list --counts              # With occurrence counts
napkin tag list --sort count          # Sort by frequency
napkin tag info --name "project"      # Tag info
napkin tag aliases                    # List all aliases
```

### Properties — `napkin property`

```bash
napkin property list                  # List all properties
napkin property list --file "note"    # Properties for a file
napkin property read --file "note" --name title
napkin property set --file "note" --name status --value done
napkin property remove --file "note" --name status
```

### Tasks — `napkin task`

```bash
napkin task list                      # List all tasks
napkin task list --todo               # Incomplete only
napkin task list --done               # Completed only
napkin task list --daily              # Today's daily note tasks
napkin task show --file "note" --line 3 --toggle
```

### Links — `napkin link`

```bash
napkin link out --file "note"         # Outgoing links
napkin link back --file "note"        # Backlinks
napkin link unresolved                # Broken links
napkin link orphans                   # No incoming links
napkin link deadends                  # No outgoing links
```

### Bases — `napkin base`

Query vault files using Obsidian Bases `.base` files.

```bash
napkin base list                      # List .base files
napkin base views --file "projects"   # List views
napkin base query --file "projects"   # Query default view
napkin base query --file "projects" --view "Active" --format csv
napkin base create --file "projects" --name "New Item"
```

### Canvas — `napkin canvas`

Read and write JSON Canvas files (`.canvas`).

```bash
napkin canvas list                    # List .canvas files
napkin canvas read --file "Board"     # Dump canvas
napkin canvas nodes --file "Board"    # List nodes
napkin canvas create --file "Board"   # Create empty canvas
napkin canvas add-node --file "Board" --type text --text "# Hello"
napkin canvas add-edge --file "Board" --from abc1 --to def2
napkin canvas remove-node --file "Board" --id abc1
```

### Templates — `napkin template`

```bash
napkin template list                  # List templates
napkin template read --name "Daily Note"
napkin template insert --file "note" --name "Template"
```

### Bookmarks — `napkin bookmark`

```bash
napkin bookmark list                  # List bookmarks
napkin bookmark add --file "note"     # Bookmark a file
```

### Other

```bash
napkin outline --file "note"          # Heading tree
napkin wordcount --file "note"        # Word + character count
napkin onboard                        # Agent instructions for CLAUDE.md
```

## File resolution

Files can be referenced two ways:
- **By name** (wikilink-style): `--file "Active Projects"` — searches all `.md` files by basename
- **By path**: `--file "Projects/Active Projects.md"` — exact path from vault root

## For AI agents

Every command supports `--json` for structured output. Run `napkin onboard` to get copy-paste instructions for your agent config.

## Development

```bash
bun install
bun run dev -- vault --json
bun test
bun run check
```

## License

MIT
