/**
 * Anti-Gravity TypeScript Hook
 * Runs after every file edit — catches type errors immediately
 * and feeds them back to Claude for auto-fix.
 */

const chunks = [];
process.stdin.on('data', chunk => chunks.push(chunk));
process.stdin.on('end', () => {
  let input;
  try {
    input = JSON.parse(Buffer.concat(chunks).toString());
  } catch {
    process.exit(0); // Bad JSON, let it pass
  }

  // Get the file path from whichever field Claude sends it in
  const filePath = input?.tool_input?.file_path
    || input?.tool_input?.path
    || input?.input?.file_path
    || '';

  // Only check TypeScript/TSX files in src/
  if (!filePath.includes('/src/') || (!filePath.endsWith('.ts') && !filePath.endsWith('.tsx'))) {
    process.exit(0);
  }

  const { execSync } = require('child_process');
  const path = require('path');
  const projectRoot = path.resolve(__dirname, '../../..');

  try {
    execSync('npx tsc', {
      cwd: projectRoot,
      stdio: 'pipe'
    });
    // No errors — all clear
    process.exit(0);
  } catch (e) {
    const errors = e.stdout?.toString() || e.stderr?.toString() || 'Unknown TypeScript error';
    console.error(`TypeScript errors detected — fix these before continuing:\n\n${errors}`);
    process.exit(2);
  }
});
