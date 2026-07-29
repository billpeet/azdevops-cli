# @billpeet/azdevops-cli

Azure DevOps CLI for AI agents and developers. Provides a structured command-line interface to Azure DevOps Services with JSON (default) and text output formats.

## Installation

```bash
npm i -g @billpeet/azdevops-cli
```

## Setup

```bash
azdevops setup --org myorg --token YOUR_PAT --project MyProject
```

Configuration is saved to `~/.config/azdevops-cli/config.json`.

## Environment Variables

Environment variables override file configuration:

| Variable | Description |
|----------|-------------|
| `AZDEVOPS_ORG` | Azure DevOps organization name |
| `AZDEVOPS_TOKEN` | Personal Access Token (PAT) |
| `AZDEVOPS_PROJECT` | Default project name |

## Commands

### Setup

```bash
azdevops setup --org <org> --token <token> [--project <project>]
```

### Projects

```bash
azdevops project list [--top <n>] [--skip <n>]
```

### Repositories

```bash
azdevops repo list --project <project>
```

### Branches

```bash
azdevops branch list --repo <repo> [--project <project>] [--filter <prefix>]
```

### Pull Requests

```bash
# List PRs
azdevops pr list --repo <repo> [--project <project>] [--status active|completed|abandoned|all] [--top <n>]

# Get PR details
azdevops pr get --repo <repo> --id <id> [--project <project>]

# Create PR
azdevops pr create --repo <repo> --source <branch> --target <branch> --title <title> [--description <text>] [--reviewers <ids>] [--project <project>]

# Update PR
azdevops pr update --repo <repo> --id <id> [--status completed|abandoned] [--title <title>] [--description <text>] [--project <project>]

# List reviewers
azdevops pr reviewers --repo <repo> --id <id> [--project <project>]

# List review comment threads (system activity is hidden by default)
azdevops pr comments --repo <repo> --id <id> [--unresolved] [--include-system] [--project <project>]
```

`pr comments` returns complete discussion threads with replies and file/line context. `--unresolved`
keeps active, pending, and unknown threads while excluding fixed, closed, won't-fix, and by-design
threads. Use the `threads` alias if you prefer Azure DevOps terminology.

### Pipelines

```bash
# List pipelines
azdevops pipeline list [--project <project>] [--top <n>]

# Trigger a pipeline run
azdevops pipeline run --pipeline-id <id> [--branch <branch>] [--project <project>]

# List runs for a pipeline
azdevops pipeline runs --pipeline-id <id> [--project <project>] [--top <n>]

# Get run details
azdevops pipeline run-get --pipeline-id <id> --run-id <id> [--project <project>]
```

### Work Items

```bash
# Get a work item
azdevops work-item get --id <id> [--project <project>] [--expand none|relations|fields|links|all]

# Create a work item
azdevops work-item create --type <type> --title <title> [--description <text>] [--assigned-to <name>] [--project <project>]

# Update a work item
azdevops work-item update --id <id> [--title <title>] [--state <state>] [--assigned-to <name>] [--description <text>] [--project <project>]

# Query work items (WIQL)
azdevops work-item query --wiql "<query>" [--top <n>] [--project <project>]
```

## Output Formats

All commands support `--format text|json` (default: `json`) and `--pretty` for indented JSON.

- **JSON** (default): Machine-readable, ideal for AI agents and piping
- **Text** (`--format text`): Human-readable tables and detail views

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | Error (details in stderr as JSON) |

## AI Agent Usage

```bash
# List repos and parse with jq
azdevops repo list --project MyProject | jq '.[].name'

# Get work item details
azdevops work-item get --id 12345 --project MyProject | jq '.fields["System.Title"]'

# Query active bugs
azdevops work-item query --wiql "SELECT [System.Id] FROM WorkItems WHERE [System.WorkItemType] = 'Bug' AND [System.State] = 'Active'" --project MyProject

# Get only actionable PR feedback, including file and line context
azdevops pr comments --repo my-repo --id 42 --unresolved --pretty
```

## Development

```bash
git clone https://github.com/billpeet/azdevops-cli.git
cd azdevops-cli
npm install
npm run build
node bin/azdevops.js --help
```
