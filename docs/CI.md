# Continuous integration (GitHub Actions)

There are two workflows:

| Workflow | Runs on | When | What it checks |
|---|---|---|---|
| `.github/workflows/ci.yml` | GitHub's standard Ubuntu runner (free minutes, no GPU) | Pushes to `main` and `lightcrossing-upgrade`, pull requests into `main` from branches of this repository (never from forks), or by hand | Typecheck, build, build under 2 MB, unit tests (including full story playthroughs and a year after the story), story pacing, and the browser smoke tests at **Low quality** on software WebGL (SwiftShader) with longer timeouts |
| `.github/workflows/gpu-e2e.yml` | **Your own Mac** (a self-hosted runner with the labels `self-hosted, macOS, ARM64, gpu`) | Pushes to `main` and `lightcrossing-upgrade`, or by hand. **Never on pull requests.** | The browser smoke tests at normal quality on the real GPU (Metal), then the performance benchmark for Low, Medium and High |

When something fails, the test report, screenshots and traces are uploaded as an artifact (see [Reading results](#6-reading-results)).

Both workflows only have read access to the code (`permissions: contents: read`). They don't keep the
checkout token around (`persist-credentials: false`), use no secrets, and pin every action to an exact commit.

---

## 1. Put the project on GitHub (only once)

The project has no GitHub remote yet. Run these from the project folder (`~/Light Crossing`).

1. **Check you are logged in to the GitHub CLI** with the `repo` and `workflow` scopes. Pushing files in
   `.github/workflows/` needs the `workflow` scope.

   ```bash
   gh auth status
   ```

   If `workflow` is missing from "Token scopes", add it:

   ```bash
   gh auth refresh -s workflow
   ```

2. **Create a private repository** from this folder. Keep the name `light-crossing`, matching the slug.
   This creates the repository and adds it as `origin`. It doesn't push anything yet.

   ```bash
   gh repo create light-crossing --private --source=. --remote=origin --description "Light Crossing, a cozy island life-sim for the browser"
   ```

3. **Lock down the repository settings before anything runs.** See [section 2](#2-security-check-these-settings-first).

4. **Set up the Mac runner** ([section 3](#3-install-and-register-the-self-hosted-runner-mac)), if you want GPU runs.
   You can skip this. Without a runner, the GPU job just waits as "Queued" and gives up after 24 hours.
   You can also cancel it in the Actions tab.

5. **Push both branches.**

   ```bash
   git push -u origin main
   ```

   ```bash
   git push -u origin lightcrossing-upgrade
   ```

   `main` doesn't contain the workflows yet, so pushing it runs nothing. Pushing `lightcrossing-upgrade`
   starts both workflows, because the branch contains them.

6. **Later, when you're happy with the upgrade**, open a pull request and merge it from the GitHub page:

   ```bash
   gh pr create --base main --head lightcrossing-upgrade --title "Upgrade and polish" --body "See docs/CI.md and README.md"
   ```

   The "Run workflow" button in the Actions tab only appears once a workflow file is on the default branch (`main`).

---

## 2. Security: check these settings first

> **Why this matters.** A self-hosted runner runs whatever a workflow tells it to, as the macOS user it is
> installed under. Anyone who can make a workflow run on it can run code on your Mac.
>
> For pull requests, GitHub uses the workflow files **from the pull request itself**. So a pull request can
> bring its own job with `runs-on: self-hosted`. It doesn't matter that `gpu-e2e.yml` never runs for pull requests.
>
> **Only use a self-hosted runner with a private repository**, and only give write access to people you'd
> trust at your keyboard.

Check each of these on GitHub, in the repository's **Settings**:

1. **Visibility is Private** (Settings → General → Danger Zone). To check from the terminal:

   ```bash
   gh repo view --json visibility -q .visibility
   ```

   This must print `PRIVATE`.
   - If you ever want to make the repository public, **remove the runner first** ([section 3, step 7](#remove-the-runner)).
   - `gpu-e2e.yml` also refuses to run if the repository is public (`if: github.event.repository.private`). Treat that as a seatbelt, not the lock: a pull request could bring a different workflow without it.

2. **Fork pull requests can't run workflows.** Go to Settings → Actions → General → "Fork pull request
   workflows in private repositories".
   - Leave **"Run workflows from fork pull requests"** unchecked. This is the default.
   - If you ever turn it on, also keep **"Require approval for fork pull request workflows"** on. Leave "Send write tokens…" and "Send secrets…" off.
   - `ci.yml` also skips pull requests that come from forks.

3. **Workflow token is read-only.** Go to Settings → Actions → General → "Workflow permissions".
   - Choose **"Read repository contents and packages permissions"**.
   - Leave **"Allow GitHub Actions to create and approve pull requests"** unchecked.

   To check from the terminal:

   ```bash
   gh api repos/{owner}/{repo}/actions/permissions/workflow
   ```

   This should show `"default_workflow_permissions":"read"` and `"can_approve_pull_request_reviews":false`.

4. **Only trusted collaborators** (Settings → Collaborators). Anyone with write access can push a branch whose
   workflow targets your runner. To list who has access:

   ```bash
   gh api repos/{owner}/{repo}/collaborators --jq '.[] | .login + " " + .role_name'
   ```

5. **No secrets.** These workflows don't need any. Don't add repository secrets that a job on your Mac could read.

6. **Never use `pull_request_target`** in a workflow that runs on the self-hosted runner.

> **If any of these is not true** (a public repository, fork pull requests allowed, or collaborators you
> don't know), then untrusted pull requests could run code on your machine. Stop the runner
> (`./svc.sh stop`) until it is fixed.

---

## 3. Install and register the self-hosted runner (Mac)

You need a Mac with Apple silicon (for Metal), `git` (`git --version`), and about 2 GB of free space for Node,
Chromium and the npm cache. Node and Chromium are downloaded by the workflow itself.

1. **Make a separate standard (non-admin) macOS user** for the runner, for example `ci-runner`
   (System Settings → Users & Groups → Add User → Standard).
   - Then jobs can't touch your own files or change the system. The runner also refuses to run with `sudo`.
   - Log in to that user once. With Fast User Switching it can stay logged in in the background.
   - The GPU is only available to a logged-in session, and the runner service starts when that user logs in.

2. **On GitHub**, open the repository → Settings → Actions → Runners → **New self-hosted runner**, and choose
   **macOS** and **ARM64**. The page shows the exact commands for the current runner version, with a checksum.
   Run the "Download" commands in Terminal **as `ci-runner`**. They look like this, but copy the real ones from the page:

   ```bash
   mkdir ~/actions-runner && cd ~/actions-runner
   ```

   ```bash
   curl -o actions-runner-osx-arm64-X.Y.Z.tar.gz -L https://github.com/actions/runner/releases/download/vX.Y.Z/actions-runner-osx-arm64-X.Y.Z.tar.gz
   ```

   ```bash
   echo "CHECKSUM-FROM-THE-PAGE  actions-runner-osx-arm64-X.Y.Z.tar.gz" | shasum -a 256 -c
   ```

   ```bash
   tar xzf ./actions-runner-osx-arm64-X.Y.Z.tar.gz
   ```

3. **Register it with the `gpu` label.** Use the URL and token from the same page. The token expires after one hour.

   ```bash
   ./config.sh --url https://github.com/YOUR-USER/light-crossing --token TOKEN-FROM-THE-PAGE --name lc-mac-gpu --labels gpu --work _work --unattended
   ```

   The runner gets `self-hosted`, `macOS` and `ARM64` automatically. `--labels gpu` adds the fourth label that `gpu-e2e.yml` asks for.

4. **Run it as a service**, so it starts by itself when `ci-runner` logs in:

   ```bash
   ./svc.sh install
   ```

   ```bash
   ./svc.sh start
   ```

   ```bash
   ./svc.sh status
   ```

   To try it without a service, run `./run.sh` in Terminal and press Ctrl-C to stop.

5. **Check it is online.** Settings → Actions → Runners should list `lc-mac-gpu` as **Idle**, with the labels
   `self-hosted`, `macOS`, `ARM64` and `gpu`. Push to `lightcrossing-upgrade`, or press "Run workflow" on
   "GPU e2e (self-hosted Mac)" once it is on `main`. The first run takes longer because it downloads Node and Chromium.

6. **Keep the Mac awake while you want CI.** A sleeping Mac leaves jobs queued.
   - Turn on System Settings → Battery (or Energy) → "Prevent automatic sleeping when the display is off".
   - On a laptop, this applies while it's on the power adapter.

7. <a id="remove-the-runner"></a>**To stop or remove the runner** (do this before ever making the repository public):

   ```bash
   cd ~/actions-runner && ./svc.sh stop && ./svc.sh uninstall
   ```

   Then press Settings → Actions → Runners → `lc-mac-gpu` → **Remove**, and run the command it shows:

   ```bash
   ./config.sh remove --token REMOVE-TOKEN-FROM-THE-PAGE
   ```

The runner keeps itself up to date.

---

## 4. Alternative: a GitHub-hosted GPU runner (no Mac needed)

If your GitHub plan includes larger runners (GitHub Team or Enterprise Cloud, in an organization), you can use
a **GPU-powered GitHub-hosted runner** instead of your Mac.

- Each job runs in a fresh virtual machine that is thrown away afterwards, so the "code on my machine" worry goes away.
- These runners are billed per minute, even for private repositories with free minutes left.

1. In the organization: Settings → Actions → Runners → **New runner → New GitHub-hosted runner**. Pick a
   GPU image (Linux with an NVIDIA GPU) and give it a name, for example `lc-gpu`. Allow this repository to use it.
2. In `gpu-e2e.yml`:
   - change `runs-on` to that name;
   - remove the `if: github.event.repository.private` line, which is only needed for your own machine;
   - optionally, add `pull_request:` to `on:` too.

   ```yaml
   jobs:
     gpu:
       runs-on: lc-gpu
   ```

3. On Linux, headless Chromium may still pick software rendering. The benchmark records which GPU was actually used:
   - check `"gpu"` in the `bench-results.json` artifact;
   - if it says `SwiftShader`, add `--use-angle=vulkan` to the non-macOS flags in `playwright.config.ts` and `scripts/bench.ts`.

   I haven't tested this setup, so check that first run.

GitHub's standard hosted **macOS** runners are virtual machines without GPU acceleration, so they gain nothing
over the free Ubuntu job here.

---

## 5. Run the same checks on your own computer

```bash
npm run typecheck && npm test && npm run build && npm run size && npm run pacing -- --check && npm run e2e
```

To rehearse the Ubuntu job (Low quality and software WebGL), on a Mac:

```bash
E2E_LOW=1 E2E_SOFTWARE=1 npm run e2e
```

The performance benchmark (Low, Medium and High; about 2 minutes; writes `bench-results.json`):

```bash
npm run bench
```

Options: `--size 1024x768`, `--dpr 1` (screen scale, default 2 like a Retina screen), `--vsync` (cap at the
display rate; by default the frame rate is uncapped to show how much headroom each tier has), and `--out file.json`.

On a real device (tablet or phone), open the game with `?bench=all` added to the address, or use Settings →
"Test performance". The results show on screen when it finishes.

---

## 6. Reading results

- **A failed run:** open the run in the Actions tab and download the `playwright-report` artifact (or `playwright-report-gpu`).
  - Unzip it, then run `npx playwright show-report playwright-report`.
  - `test-results/` contains a screenshot and a `trace.zip` for each failed test. Open a trace with `npx playwright show-trace path/to/trace.zip`.
- **Benchmark:** every GPU run uploads `bench-results.json` and adds a table to the run's summary page.
