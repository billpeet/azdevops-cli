import { Command } from 'commander';
import chalk from 'chalk';
import { Config, saveConfig, getConfigFilePath } from '../config/store';
import { createClient } from '../api/client';

export function registerSetup(program: Command): void {
  program
    .command('setup')
    .description('Configure Azure DevOps connection (organization, PAT token, default project)')
    .requiredOption('--org <org>', 'Azure DevOps organization name')
    .requiredOption('--token <token>', 'Personal Access Token (PAT)')
    .option('--project <project>', 'Default project name')
    .option('--format <format>', 'Output format: text or json', 'json')
    .action(async (opts) => {
      const config: Config = {
        organization: opts.org,
        token: opts.token,
        defaultProject: opts.project,
      };

      // Validate by calling listProjects
      const client = createClient(config);
      let projects;
      try {
        projects = await client.listProjects(1);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        process.stderr.write(
          JSON.stringify({ error: 'Connection failed', details: message }) + '\n'
        );
        process.exit(1);
      }

      saveConfig(config);

      if (opts.format === 'text') {
        console.log(chalk.green('✓ Configuration saved to ' + getConfigFilePath()));
        console.log(chalk.green(`✓ Connected to organization "${config.organization}" (${projects.length > 0 ? 'projects accessible' : 'no projects found'})`));
        if (config.defaultProject) {
          console.log(chalk.green(`✓ Default project: ${config.defaultProject}`));
        }
      } else {
        console.log(JSON.stringify({
          ok: true,
          configFile: getConfigFilePath(),
          organization: config.organization,
          defaultProject: config.defaultProject ?? null,
        }, null, 2));
      }
    });
}
