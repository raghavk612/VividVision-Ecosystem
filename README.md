# VividVision-Ecosystem: VividVision + VisionCare

This repository contains the complete source for two separate apps for the Congressional App Challenge submission. Each app has its own directory and entry point; cloning this repository includes both apps without submodule setup.

| App | Source | Live URL |
| --- | --- | --- |
| VividVision communication board | [apps/vividvision](apps/vividvision) | https://raghavk612.github.io/VividVision-Ecosystem/vividvision/ |
| VisionCare caregiver portal | [apps/visioncare](apps/visioncare) | https://raghavk612.github.io/VividVision-Ecosystem/visioncare/ |

The `/VividVision-Ecosystem/` URL forwards to VividVision. GitHub Pages URLs using the previous repository name must be updated. VisionCare opens directly to caregiver sign-in; existing `visioncare/care.html` links forward to that entry point.

## Local development

Use Node.js 22+. Run `npm ci --prefix apps/vividvision`, then `npm run dev` for VividVision. See its [app README](apps/vividvision/README.md) for features and backend configuration.

For VisionCare, run `python3 -m http.server 8080 --directory apps` and open `http://localhost:8080/visioncare/`. Run `npm test` for the existing VividVision checks.

## Deployment

GitHub Pages allows one deployment per repository. The workflow `.github/workflows/pages.yml` tests, builds, and publishes both apps on every push to `main`. GitHub Pages uses **GitHub Actions** as its source. Run `npm run build` to generate the combined `dist/` locally. Only public web assets enter the Pages artifact. The `gh-pages` branch retains a snapshot from the initial combined deployment; Actions publishes directly from `main` going forward.

Both apps retain their existing public Supabase configuration. Password-based sign-in continues to use that project. If configuring email confirmations, password resets, or OAuth, allow the new app URLs in Supabase Authentication redirect settings.

Pages cannot host the optional Node API. The root `render.yaml` and `Dockerfile.api` continue to deploy that API from its new source directory. Set `VITE_API_BASE_URL` when building (or the matching repository variable when using Actions) to the existing API URL to enable hosted AI replies; otherwise VividVision uses local suggestions. Store server secrets only on the backend host.

## Source provenance

VividVision retains this repository's Git history; its files were moved into `apps/vividvision`. VisionCare was imported from [GrantXSu/VisionCare](https://github.com/GrantXSu/VisionCare), commit `c30c135ac5024069b9d5a2dea0035e244613f831`, authored by sugrantx. The original repository is unchanged. These are independent app directories within one repository, not Git submodules. Future upstream changes must be imported deliberately.
