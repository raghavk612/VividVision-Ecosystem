# FrontierHackathon: VividVision + VisionCare

This repository contains the complete source for two separate apps for the Congressional App Challenge submission. Each app has its own directory and entry point; cloning this repository includes both apps without submodule setup.

| App | Source | Live URL |
| --- | --- | --- |
| VividVision communication board | [apps/vividvision](apps/vividvision) | https://raghavk612.github.io/FrontierHackathon/vividvision/ |
| VisionCare caregiver portal | [apps/visioncare](apps/visioncare) | https://raghavk612.github.io/FrontierHackathon/visioncare/ |

The existing `/FrontierHackathon/` URL forwards to VividVision. The caregiver dashboard is at `visioncare/care.html`.

## Local development

Use Node.js 22+. Run `npm ci --prefix apps/vividvision`, then `npm run dev` for VividVision. See its [app README](apps/vividvision/README.md) for features and backend configuration.

For VisionCare, run `python3 -m http.server 8080 --directory apps` and open `http://localhost:8080/visioncare/`. Run `npm test` for the existing VividVision checks.

## Deployment

GitHub Pages allows one deployment per repository. The current Pages source is the `gh-pages` branch. Run `npm run build` to generate the combined `dist/`, then publish its contents to that branch. Both apps must be published together. Only public web assets enter the Pages artifact. Source changes on `main` require rebuilding and publishing to update the live apps.

For automatic deployment, move `scripts/pages-workflow.yml` to `.github/workflows/pages.yml` using a GitHub login with workflow permission, then set **Settings → Pages → Source** to **GitHub Actions**. That workflow tests, builds, and publishes both apps on pushes to `main`.

Both apps retain their existing public Supabase configuration. Password-based sign-in continues to use that project. If configuring email confirmations, password resets, or OAuth, allow the new app URLs in Supabase Authentication redirect settings.

Pages cannot host the optional Node API. The root `render.yaml` and `Dockerfile.api` continue to deploy that API from its new source directory. Set `VITE_API_BASE_URL` when building (or the matching repository variable when using Actions) to the existing API URL to enable hosted AI replies; otherwise VividVision uses local suggestions. Store server secrets only on the backend host.

## Source provenance

VividVision retains this repository's Git history; its files were moved into `apps/vividvision`. VisionCare was imported from [GrantXSu/VisionCare](https://github.com/GrantXSu/VisionCare), commit `c30c135ac5024069b9d5a2dea0035e244613f831`, authored by sugrantx. The original repository is unchanged. These are independent app directories within one repository, not Git submodules. Future upstream changes must be imported deliberately.
