import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface Config {
  organization: string;
  token: string;
  defaultProject?: string;
}

const CONFIG_DIR = path.join(os.homedir(), '.config', 'azdevops-cli');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

export function getConfig(): Config {
  // Environment variables take highest priority
  const organization = process.env.AZDEVOPS_ORG;
  const token = process.env.AZDEVOPS_TOKEN;
  const defaultProject = process.env.AZDEVOPS_PROJECT;

  if (organization && token) {
    return { organization, token, defaultProject };
  }

  // Fall back to file config
  let fileConfig: Partial<Config> = {};
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      fileConfig = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    } catch {
      // ignore parse errors, will fail below
    }
  }

  const resolvedOrg = organization ?? fileConfig.organization;
  const resolvedToken = token ?? fileConfig.token;
  const resolvedProject = defaultProject ?? fileConfig.defaultProject;

  if (!resolvedOrg || !resolvedToken) {
    const missing: string[] = [];
    if (!resolvedOrg) missing.push('organization (AZDEVOPS_ORG)');
    if (!resolvedToken) missing.push('token (AZDEVOPS_TOKEN)');
    throw new Error(
      `Missing configuration: ${missing.join(', ')}. Run 'azdevops setup' first or set AZDEVOPS_ORG and AZDEVOPS_TOKEN.`
    );
  }

  return { organization: resolvedOrg, token: resolvedToken, defaultProject: resolvedProject };
}

export function saveConfig(config: Config): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf-8');
}

export function getConfigFilePath(): string {
  return CONFIG_FILE;
}

export function resolveProject(opts: { project?: string }, config: Config): string {
  const project = opts.project ?? config.defaultProject;
  if (!project) {
    throw new Error(
      'No project specified. Use --project or set a default with azdevops setup --project.'
    );
  }
  return project;
}
