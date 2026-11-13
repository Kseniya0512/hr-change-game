import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, rmSync } from 'node:fs';
// Only this generated asset directory is replaced. Existing docs remain intact.
rmSync('docs/pages-assets', { recursive: true, force: true });
execFileSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build', '--mode', 'pages', '--base', './', '--outDir', 'docs', '--emptyOutDir', 'false', '--assetsDir', 'pages-assets'], { stdio: 'inherit' });
mkdirSync('docs', { recursive: true });
writeFileSync('docs/.nojekyll', '');
