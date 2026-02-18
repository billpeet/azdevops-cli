import { Command } from 'commander';
import { registerSetup } from './commands/setup';
import { registerProject } from './commands/project';
import { registerRepo } from './commands/repo';
import { registerBranch } from './commands/branch';
import { registerPr } from './commands/pr';
import { registerPipeline } from './commands/pipeline';
import { registerWorkItem } from './commands/work-item';

const program = new Command();

program
  .name('azdevops')
  .description('Azure DevOps CLI — AI-friendly interface for Azure DevOps Services')
  .version('0.1.0');

registerSetup(program);
registerProject(program);
registerRepo(program);
registerBranch(program);
registerPr(program);
registerPipeline(program);
registerWorkItem(program);

program.parseAsync(process.argv).catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(JSON.stringify({ error: message }) + '\n');
  process.exit(1);
});
