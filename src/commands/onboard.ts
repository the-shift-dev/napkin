import { type OutputOptions, output, success } from "../utils/output.js";

const INSTRUCTIONS = `# napkin

🧻 Obsidian-compatible CLI for agents. Operates directly on markdown files — no Obsidian app required.

## Quick Reference

\`\`\`bash
# Vault
napkin vault --json

# Files
napkin file list --json
napkin read <file> --json
napkin create --name "Note" --content "Hello"
napkin append --file "Note" --content "More text"
napkin search "meeting" --json
napkin search "TODO" --context --json

# Daily notes
napkin daily read --json
napkin daily append --content "- [ ] New task"

# Tasks
napkin task list --todo --json
napkin task list --daily --json
napkin task show --file "note" --line 3 --toggle

# Metadata
napkin tag list --counts --json
napkin property list --file "note" --json
napkin property set --file "note" --name status --value done
napkin link back --file "note" --json
napkin outline --file "note" --json

# Bases (database views)
napkin base query --file "projects" --json
napkin base query --file "projects" --view "Active" --format csv

# Canvas
napkin canvas list --json
napkin canvas read --file "Board" --json
napkin canvas add-node --file "Board" --type text --text "# Hello"

# All commands support --json, --quiet, --vault <path>, --copy
\`\`\`
`;

export async function onboard(opts: OutputOptions) {
  output(opts, {
    json: () => ({ instructions: INSTRUCTIONS }),
    human: () => {
      console.log(INSTRUCTIONS);
      success("Copy the above into your CLAUDE.md or AGENTS.md");
    },
  });
}
