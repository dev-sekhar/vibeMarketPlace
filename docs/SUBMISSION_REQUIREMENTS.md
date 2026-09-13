# Share useful projects as open source

OpenVibes welcomes small tools, weekend experiments and unfinished projects that others can understand, run and build on. It is not a dumping ground for unexplained repositories or promotional links. Contributors retain ownership of their work and must have the right to share it under the stated license.

## Required before submitting

1. **Public source repository.** Use the root HTTPS GitHub URL (`https://github.com/owner/repository`). A demo alone is insufficient. GitHub is the currently supported automatic validation provider. Root-level scripts and non-JavaScript projects are welcome; a `src/` directory and `package.json` are not mandatory.
2. **Recognised open-source license.** Include the full license text in root `LICENSE`, `LICENSE.md` or `LICENSE.txt` (case-insensitive; `LICENCE` spelling is also accepted). An empty file, a license name alone, “all rights reserved” or an unidentified/custom license does not pass. Supported SPDX IDs are listed in `config/validation-config.json`. GitHub must recognise the license text at the inspected revision. Other licenses need a maintainer to extend/review the policy; there is no automatic bypass. This does not audit dependency licenses or certify legal compliance.
3. **Useful README.md.** At least 300 characters with substantive Markdown sections for purpose/audience, installation/setup, usage/examples and limitations/status. Each section needs at least 20 characters of content. Accepted heading alternatives include Overview/About/What it does, Getting started/Quick start, How to use/Running and Known issues/Project status. These are structural checks, not a semantic usefulness score. State prerequisites, configuration names (not secrets), how to run it, a concrete example, and what does not work yet.
4. **Reproducible test evidence.** Root `TEST_REPORT.json` must use the format below. Both automated tests and documented manual functional checks are accepted. A directory named `tests` or a claim that everything passed is insufficient. Include at least one passing functional scenario with expected and actual results. Disclose failed/skipped checks and limitations; reviewers decide whether the remaining functionality is useful and the description is honest.
5. **Basic repository hygiene.** Include a nonempty `.gitignore` and actual application source. Sensitive filenames are checked throughout the tree, not just at the root. Committed `.env` variants, private-key filenames and credential bundles are blocked; `.env.example`, `.env.sample` and `.env.template` are allowed. Remove sensitive material and rotate exposed credentials. Symlinks/submodules need manual review because their contents are outside the supported inspection model.
6. **Honest listing and permission to share.** Supply a specific name (3–60 characters), short description (20–120), full description (80–10,000), category and project status: experimental, usable or maintained. Confirm your rights to share and the accuracy of your description/test evidence. Optional demo/community links must be HTTP(S). A screenshot is encouraged, not mandatory for CLI tools; a reproducible scenario in the report is the minimum working evidence.

Repositories above 100 MB as reported by GitHub, truncated trees, more than 10,000 tree entries or documentation above 256 KiB are not accepted automatically. This keeps validation bounded; it is not a statement about project quality.

## Test report format

Test your committed code first. Record its full SHA with `git rev-parse HEAD`, then commit **only** `TEST_REPORT.json`. The default-branch tip must be the tested revision or exactly one descendant commit that changes only `TEST_REPORT.json`. If code, README, license or other files change afterward, retest and create a new report-only commit. This avoids a self-referential commit hash and prevents a stale report being reused after code changes.

```json
{
  "testedCommit": "REPLACE_WITH_FULL_40_CHARACTER_COMMIT_SHA",
  "testedAt": "2026-09-13T09:00:00Z",
  "environment": "Node 22, Windows 11, Chrome; describe your actual environment",
  "command": "npm test, or exact numbered steps for a manual test",
  "results": [
    {
      "name": "Create a focus session",
      "expected": "A saved session appears in today's schedule.",
      "actual": "The session appeared with the requested start time and duration.",
      "status": "passed"
    }
  ],
  "limitations": "Describe unsupported scenarios and known issues; do not leave this as a placeholder."
}
```

Replace the example with real observations and the actual test timestamp. `results` accepts 1–100 entries with `passed`, `failed` or `skipped` status. Each entry needs a name (at least 5 characters), expected result and actual result (at least 10 characters each). Environment needs at least 10 characters, command/steps at least 3 and limitations at least 20. Future timestamps are rejected. If no limitations are known, say what you tested and that none were found in that scope.

Existing Markdown/PDF reports can remain as supporting evidence, but the structured JSON report is now required for consistent automatic checks. A report is the author's declaration: OpenVibes does **not** run submitted tests or execute submitted code.

## What happens after submission

The authenticated server checks the repository and pins its inspected commit. An identical repository cannot be submitted again under different casing, a `.git` suffix, or another account; GitHub repository IDs also identify renamed repositories. The database enforces uniqueness for new validated listings. Forks with distinct GitHub IDs are not automatically classified as duplicates; reviewers check whether they contribute something useful.

Passing checks puts a project into **pending review**, not directly into the public directory. Reviewers assess usefulness, working evidence, licensing, disclosed limitations, duplication, misleading claims, unrelated promotion and obvious harmful content. Thin clones or broken core functionality should not be published merely because all required files exist. The review has no promised turnaround time.

Public source links for newly validated listings point to the inspected revision. A live demo is externally controlled and can change; it is not certified by the documentation checks. To replace a listing's source revision, it must be validated and reviewed again. There is currently no self-service resubmission/update screen; contact a maintainer for changes or rejection feedback.

## What a passing result means

Use **“Required documentation checks passed”** or **“Reviewed for listing.”** Do not label an automatically passing project “safe,” “secure,” “verified quality” or “tests independently verified.” Filename screening and scanning the inspected documentation are not a full secret, malware, dependency or code audit. There is no automatic semantic spam detector. Human review remains the publishing gate.

CONTRIBUTING.md, SECURITY.md and CI are recommendations. Do not make enterprise tooling a prerequisite for a useful small project.
