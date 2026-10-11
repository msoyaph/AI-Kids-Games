# Continuous integration

Two GitHub Actions workflows live in `.github/workflows/`:

| Workflow | Runs on | When | What |
|---|---|---|---|
| `ci.yml` — **CI** | GitHub's Ubuntu machines | every push to `main` / `vanex-upgrade`, every pull request, or by hand | typecheck · unit tests + balance sims · single-file build · dist checks (size < 2 MB, file:// + http, zero requests) · all Playwright tests (desktop, phones, tablet) |
| `selfhosted-mac.yml` — **Self-hosted Mac (real GPU)** | your own Mac | only by hand (Actions → Run workflow) | the same steps on a real GPU (including the flash-safety frame audit, which needs ≥ 15 frames/s) + `npm run perf` benchmark; uploads `perf-results/` |

GitHub's machines render WebGL in software, so in CI the Playwright config allows longer timeouts, uses 2 workers
and 1 retry, and every page reports a 2-core device so Auto quality picks **Low** (`tests/e2e/fixtures.ts`). The
flash audit skips itself there with a note ("needs a GPU") and runs for real on the Mac.

---

## Putting the project on GitHub (it isn't there yet)

This folder is a git repository with no remote. `main` holds v1 (ages 7+); the upgrade is on `vanex-upgrade`.
The GitHub CLI on this Mac is signed in as **msoyaph**, so it takes three commands, run in this folder:

```bash
gh repo create msoyaph/vanex-defense --private --source=. --remote=origin --description "Vanex Defense: elemental tower defense (ages 10-14)"
```

```bash
git push -u origin main
```

```bash
git push -u origin vanex-upgrade
```

Keep it **private** (see the warning below). Without the CLI: on github.com choose **New repository**, name it
`vanex-defense`, pick **Private**, leave "Add a README / .gitignore / license" unticked, create it, then run
`git remote add origin https://github.com/msoyaph/vanex-defense.git` and the two `git push` commands above.

Then check that Actions are on: repository → **Settings → Actions → General → Actions permissions → Allow all
actions and reusable workflows**. The first push starts the **CI** workflow (Actions tab). Private repositories
spend your account's included Actions minutes (Linux minutes count 1×; a run takes roughly 10–15 minutes).

## The self-hosted Mac runner (optional)

> ⚠️ **Private repositories only.** GitHub advises using self-hosted runners only with private repositories: if
> the repository were public, anyone could fork it and open a pull request whose workflow runs their code on your
> Mac. The Mac job checks this and refuses to run when the repository is public, and it can only be started by
> hand by someone with write access — but keep the repository private anyway.

1. On github.com: repository → **Settings → Actions → Runners → New self-hosted runner**.
2. Choose **macOS** and **ARM64** (this Mac is Apple Silicon, macOS 15).
3. GitHub shows a short list of commands with the current runner version and a one-time token. Run them in a
   folder **outside** this project, for example:

   ```bash
   mkdir -p ~/actions-runner
   ```

   then, inside `~/actions-runner`, paste GitHub's *Download* commands (`curl …`, `tar xzf …`) and its *Configure*
   command, which looks like `./config.sh --url https://github.com/msoyaph/vanex-defense --token <TOKEN>`. Press
   Enter to accept the default runner group, name and labels (`self-hosted`, `macOS`, `ARM64` — the workflow needs
   `self-hosted` + `macOS`).
4. Start it — either in a Terminal window you leave open:

   ```bash
   ./run.sh
   ```

   or as a background service that starts at login:

   ```bash
   ./svc.sh install && ./svc.sh start
   ```

5. Run it: **Actions → Self-hosted Mac (real GPU) → Run workflow**, choose the branch. Results (benchmark JSON,
   Playwright report) are attached to the run as **mac-results**.

Notes:
- Node is installed by the workflow itself (version from `.nvmrc`) and Playwright downloads its own Chromium; the
  Mac needs nothing else. Allow about 3 GB of free disk space for the runner's work folder, `node_modules` and the
  browser.
- Benchmarks are most accurate when the Mac is otherwise idle (close heavy apps before starting the run).
- To remove the runner later: `./svc.sh stop && ./svc.sh uninstall` (if installed as a service), then
  `./config.sh remove --token <TOKEN>` with a removal token from the same Settings → Runners page.
