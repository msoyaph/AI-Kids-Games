> **In the Ai Kids Games monorepo** this game's CI is the root `.github/workflows/ci.yml` (GitHub's
> standard runners, Chromium only: Playwright runs the projects whose browsers are installed). The
> two workflows below belong to TheaBonk's own private repository and are not included here, and a
> self-hosted runner must never be attached to the public monorepo.

# CI for TheaBonk

Two GitHub Actions workflows:

| Workflow | Runs on | When | What |
| --- | --- | --- | --- |
| `.github/workflows/ci.yml` | GitHub's Ubuntu runners | every push and pull request | typecheck, single-file build, size check, unit tests, a short balance simulation, Playwright on Chromium / Firefox / WebKit (tablet + phone), at Low quality with longer timeouts |
| `.github/workflows/gpu.yml` | **your Mac** (self-hosted runner) | only when you start it by hand, or push to `main` / `theabonk-upgrade` — **never on pull requests** | the full-quality Playwright suite on the real GPU, the audio report and the in-browser benchmark matrix |

GitHub's runners have no GPU, so WebGL runs on SwiftShader (a software renderer): fine for
"does it load and run without errors", far too slow for performance or full-quality checks.
The game's Auto quality recognises the software renderer and picks Low, and
`playwright.config.ts` gives tests more time when `CI` is set (GitHub sets it). Full quality and
performance are what the Mac runner is for.

## 1. Create the private repository and push (you do this)

Nothing has been pushed anywhere. To put the project on GitHub:

1. On github.com: **New repository** → name it (e.g. `theabonk`) → **Private** → don't add a
   README, .gitignore or licence (the project has its own) → **Create repository**.
2. In this folder:

   ```bash
   git remote add origin git@github.com:<your-account>/theabonk.git
   git push -u origin main
   git push -u origin theabonk-upgrade
   ```

   (Use the HTTPS URL GitHub shows instead if you don't use SSH keys.)
3. On GitHub, **Actions** shows the `CI` workflow running for each push. The `GPU` workflow
   waits until a self-hosted runner is registered (below).

## 2. Lock the repository down before adding a self-hosted runner

A self-hosted runner executes whatever a workflow tells it to — on your computer. Before
registering one:

- **Keep the repository private.** Never attach a self-hosted runner to a public
  repository: anyone could open a pull request whose workflow runs on your machine.
- **Settings → Actions → General:**
  - *Fork pull request workflows from outside collaborators* → **Require approval for all
    outside collaborators**.
  - *Workflow permissions* → **Read repository contents** (the workflows ask for nothing more).
  - Turn off *Allow GitHub Actions to create and approve pull requests*.
- `gpu.yml` has **no `pull_request` trigger** on purpose — keep it that way. Only manual runs
  (`workflow_dispatch`) and pushes to your own branches reach the Mac.
- Store **no secrets** for this project, and keep secrets you don't want exposed (SSH keys,
  cloud credentials, password managers) off the account the runner uses.

## 3. Install the runner on your Mac as a non-admin user

Run the runner under its own **standard (non-administrator) macOS user**, so a bad workflow
can't install software system-wide or read your own files:

1. **System Settings → Users & Groups → Add User** → *Standard* → e.g. `ci-runner`.
2. Log in as that user (or `su - ci-runner` in Terminal) and install the build tools there:
   Node.js 24 (from nodejs.org or Homebrew) and the Xcode Command Line Tools
   (`xcode-select --install`).
3. On GitHub: **Settings → Actions → Runners → New self-hosted runner → macOS** (ARM64 for
   Apple silicon). Follow the commands it shows (download, `./config.sh --url … --token …`),
   and when asked for labels add **`gpu`** (the workflow targets `[self-hosted, macOS, gpu]`).
4. Start it with `./run.sh` while you want it available, or install it as a service for that
   user with `./svc.sh install && ./svc.sh start`.
5. The first run downloads Playwright's browsers into that user's cache
   (`~/Library/Caches/ms-playwright`).

The runner needs a logged-in GUI session for the GPU (headless Chromium uses Metal through
ANGLE). If the Mac sleeps or the user logs out, jobs wait until it's back.

## 4. Running the GPU workflow

- **Actions → GPU (self-hosted Mac) → Run workflow**, or push to `main` / `theabonk-upgrade`.
- Results: the job log shows the audio report and the benchmark table; Playwright reports
  and screenshots are attached as the `gpu-reports` artifact.

## 5. Removing the runner

**Settings → Actions → Runners → (runner) → Remove**, then in the runner folder
`./svc.sh uninstall` (if installed as a service) and `./config.sh remove --token …`. Delete
the `ci-runner` user if you no longer need it.
