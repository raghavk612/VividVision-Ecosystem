import { execFileSync } from 'node:child_process'
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
const root = fileURLToPath(new URL('../', import.meta.url))
process.chdir(root)
const base = process.env.PAGES_BASE_PATH || '/FrontierHackathon/'
if (!base.startsWith('/') || !base.endsWith('/')) throw new Error('PAGES_BASE_PATH must begin and end with /')
execFileSync('npm', ['run', 'build', '--', `--base=${base}vividvision/`], {
  cwd: 'apps/vividvision', stdio: 'inherit', env: { ...process.env, VITE_STATIC_HOST: 'true' },
})
rmSync('dist', { recursive: true, force: true })
mkdirSync('dist', { recursive: true })
cpSync('apps/vividvision/dist', 'dist/vividvision', { recursive: true })
mkdirSync('dist/visioncare')
for (const file of ['index.html', 'care.html', 'privacy.html', 'app.js', 'config.js', 'site.css', 'nav.css', 'auth.css', 'care.css', 'logo.jpg']) {
  cpSync(`apps/visioncare/${file}`, `dist/visioncare/${file}`)
}
writeFileSync('dist/.nojekyll', '')
writeFileSync('dist/index.html', `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>VividVision</title></head>
<body><p><a href="./vividvision/">Open VividVision</a></p><p><a href="./visioncare/">Open VisionCare</a></p>
<script>location.replace('./vividvision/' + location.search + location.hash)</script></body></html>`)
