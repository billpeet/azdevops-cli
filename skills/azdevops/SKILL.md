---
name: azdevops
description: Manages Azure DevOps projects, repos, branches, pull requests, review comments, pipelines, and work items via the azdevops CLI. Use when searching or updating work items, managing PRs, reading or replying to review feedback such as CodeRabbit comments, triggering pipelines, or listing repos and branches. Triggers on phrases like "Azure DevOps", "work item", "pull request", "PR comments", "reply to review", "unresolved comments", "CodeRabbit", "pipeline", "create a bug", "list repos", or "trigger build".
---

# Azure DevOps

Interact with Azure DevOps Services using the `azdevops` CLI. All commands output JSON by default for reliable parsing.

## Setup

Install the latest azdevops CLI:

```bash
npm install -g @billpeet/azdevops-cli@latest
```

Configure once (credentials saved to `~/.config/azdevops-cli/config.json`):

```bash
azdevops setup --org myorg --token <personal-access-token> --project MyProject
```

Or use environment variables (these take priority over the config file):

```bash
export AZDEVOPS_ORG=myorg
export AZDEVOPS_TOKEN=<personal-access-token>
export AZDEVOPS_PROJECT=MyProject
```

The `--project` / `AZDEVOPS_PROJECT` is optional — it sets a default project so you don't need to pass `--project` on every command.

## Projects

```bash
azdevops project list --format json --pretty
```

## Repositories

```bash
azdevops repo list --project MyProject --format json --pretty
```

## Branches

```bash
azdevops branch list --repo my-repo --format json
azdevops branch list --repo my-repo --filter "feature/" --format json
```

## Pull Requests

### List PRs

```bash
azdevops pr list --repo my-repo --format json --pretty
azdevops pr list --repo my-repo --status active --top 10 --format json
```

Status options: `active`, `completed`, `abandoned`, `all` (default: `active`).

### Get a single PR

```bash
azdevops pr get --repo my-repo --id 42 --format json --pretty
```

### Create a PR

```bash
azdevops pr create --repo my-repo --source feature/login --target main --title "Add login page" --description "Details here" --format json
azdevops pr create --repo my-repo --source feature/login --target main --title "Add login page" --reviewers "id1,id2" --format json
```

### Update a PR

```bash
azdevops pr update --repo my-repo --id 42 --status completed --format json
azdevops pr update --repo my-repo --id 42 --title "Updated title" --format json
```

### List reviewers

```bash
azdevops pr reviewers --repo my-repo --id 42 --format json --pretty
```

Reviewer vote codes: 10=Approved, 5=Approved with suggestions, 0=No vote, -5=Waiting for author, -10=Rejected.

### List review comments

```bash
# All review discussion threads
azdevops pr comments --repo my-repo --id 42 --format json --pretty

# Only feedback that still needs attention
azdevops pr comments --repo my-repo --id 42 --unresolved --format json --pretty
```

Use `pr threads` as an alias for `pr comments`. Each result is a complete discussion thread with its status, nested comments and replies, and `threadContext` file/line information when the comment targets code.

By default, deleted comments and system-only activity are hidden. Add `--include-system` when audit-style activity is needed.

`--unresolved` keeps active, pending, and unknown threads. It excludes terminal statuses: `fixed`, `closed`, `wontFix`, and `byDesign`. Prefer this filter when an agent is reviewing actionable feedback from CodeRabbit or human reviewers.

### Write review comments

Add a general comment to the PR:

```bash
azdevops pr comment --repo my-repo --id 42 --content "This is ready for another review." --format json
```

Reply to an existing review comment using the IDs returned by `pr comments`:

```bash
azdevops pr comment --repo my-repo --id 42 --thread-id 148 --parent-comment-id 1 --content "Fixed in the latest commit." --format json
```

`--thread-id` and `--parent-comment-id` must be provided together. Omit both to create a new general PR comment thread. Writing comments requires a PAT with the `Code (read & write)` scope.

## Pipelines

### List pipelines

```bash
azdevops pipeline list --format json --pretty
```

### Trigger a pipeline run

```bash
azdevops pipeline run --pipeline-id 5 --format json
azdevops pipeline run --pipeline-id 5 --branch feature/login --format json
```

### List runs for a pipeline

```bash
azdevops pipeline runs --pipeline-id 5 --top 10 --format json --pretty
```

### Get a specific run

```bash
azdevops pipeline run-get --pipeline-id 5 --run-id 123 --format json --pretty
```

## Work Items

### Get a work item

```bash
azdevops work-item get --id 1234 --format json --pretty
azdevops work-item get --id 1234 --expand relations --format json
```

Expand options: `none`, `relations`, `fields`, `links`, `all`.

### Create a work item

```bash
azdevops work-item create --type Bug --title "Login fails on timeout" --description "Steps to reproduce..." --format json
azdevops work-item create --type Task --title "Update dependencies" --assigned-to "John Smith" --format json
```

Common types: `Bug`, `Task`, `User Story`, `Feature`, `Epic`.

### Update a work item

```bash
azdevops work-item update --id 1234 --state "In Progress" --format json
azdevops work-item update --id 1234 --title "New title" --assigned-to "Jane Doe" --format json
```

### Query work items (WIQL)

```bash
azdevops work-item query --wiql "SELECT [System.Id], [System.Title] FROM WorkItems WHERE [System.State] = 'Active' AND [System.AssignedTo] = @Me" --format json --pretty
azdevops work-item query --wiql "SELECT [System.Id] FROM WorkItems WHERE [System.WorkItemType] = 'Bug' AND [System.State] <> 'Closed'" --top 20 --format json
```

## Newlines in arguments

The CLI accepts **real newlines** in argument values. Do NOT use literal `\n` escape sequences — they will be passed through as the two characters `\` and `n`, not as actual line breaks.

To include newlines in `--description`, `--title`, or any other argument, use a shell heredoc or ANSI-C quoting:

**Correct — ANSI-C quoting (bash `$'...'`):**
```bash
azdevops pr create --repo my-repo --source feature/x --target main --title 'Feature X' --description $'First line.\n\nSecond paragraph.\n\nThird paragraph.' --format json
```

**Correct — heredoc via command substitution:**
```bash
azdevops pr create --repo my-repo --source feature/x --target main --title 'Feature X' --description "$(cat <<'EOF'
First line.

Second paragraph.

Third paragraph.
EOF
)" --format json
```

**Wrong — literal backslash-n (will NOT produce newlines):**
```bash
# BAD: \n is passed as literal text, not a newline
azdevops pr create --repo my-repo --source feature/x --target main --title 'Feature X' --description 'First line.\n\nSecond paragraph.' --format json
```

**Wrong — double-escaped (will NOT produce newlines):**
```bash
# BAD: \\n is passed as literal text
azdevops pr create --repo my-repo --source feature/x --target main --title 'Feature X' --description 'First line.\\n\\nSecond paragraph.' --format json
```

## Output format

All commands support `--format json` (compact) or `--format text` (human-readable tables). Add `--pretty` for indented JSON.

Exit codes: `0` = success, `1` = error. Errors are written to stderr as JSON.

## Common workflows

**Triage a bug:**
```bash
azdevops work-item query --wiql "SELECT [System.Id] FROM WorkItems WHERE [System.WorkItemType] = 'Bug' AND [System.State] = 'New'" --top 5 --format json
azdevops work-item update --id 1234 --state "Active" --assigned-to "Jane Doe"
```

**Create a PR and trigger a build:**
```bash
azdevops pr create --repo my-repo --source feature/x --target main --title "Feature X" --format json
azdevops pipeline run --pipeline-id 5 --branch feature/x --format json
```

**Review unresolved PR feedback:**
```bash
azdevops pr comments --repo my-repo --id 42 --unresolved --format json --pretty
```

**Reply to review feedback after addressing it:**
```bash
azdevops pr comment --repo my-repo --id 42 --thread-id 148 --parent-comment-id 1 --content "Addressed in commit abc123." --format json
```
