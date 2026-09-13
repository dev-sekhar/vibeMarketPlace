# Share your app on OpenVibes: start here

OpenVibes helps people discover, try, learn from and improve useful apps shared as open source. A small experiment is welcome if you explain what works and what does not. Uploading blank templates does not make an app ready to share.

## Words you will see

- Repository (repo): your project's folder and saved history on GitHub.
- Root: the top level of that folder, not inside src or docs.
- Source code: the editable instructions that make your app work. A demo link or screenshot is not source code.
- Open-source license: the terms that let other people use, change and share your code. A public repository alone does not grant those permissions.
- Commit: a saved version of your files. Its SHA is the 40-character identifier used to connect your test report to the version you tested.
- Terminal: an app where you type commands. PowerShell on Windows and Terminal on macOS are examples.
- JSON: a structured text format. Keep double quotes, commas and brackets intact; comments and trailing commas are not allowed.
- Pull request (PR): a proposed change for someone to review before it is added to a repository.

## 1. Describe why someone would use or build on it

Choose ONE README template: general app, command-line tool or API. Replace every instruction in square brackets with your own facts. Explain who it helps, one real task it completes, and what someone could reuse. Describe AI assistance honestly; inspect generated code and verify generated claims yourself.

The templates are editable English starting points, not complete apps. You do not need every optional file, a particular programming language or a complex folder layout. Ask your coding assistant or a developer to explain unfamiliar commands before running them.

## 2. Prepare the required files

In your existing public GitHub repository, place these in the root:

| File | Why it matters |
| --- | --- |
| README.md | Explains purpose, setup, usage and limitations so another person can try it. |
| LICENSE (or LICENSE.md / LICENSE.txt) | The full recognised open-source terms you have the right to apply. Choose one license, not all three. |
| .gitignore | Tells Git which local/private files to leave out. Choose the version matching your app. |
| TEST_REPORT.json | Records a real functional test of a specific saved version, including failures and limits. |
| Your application source | Lets people inspect, run and improve the work. |

README needs at least 300 characters and meaningful Markdown headings for Purpose, Setup, Usage and Limitations (at least 20 characters under each). A heading starts with ##. Write useful explanations instead of adding filler to meet a count.

For licenses, keep the full terms. MIT includes a copyright-name placeholder. Apache and GPL contain application instructions at the end; follow them without rewriting the license terms. Check permission for any code, data, images or models you did not create. If you are unsure which license you can apply, ask a knowledgeable maintainer before publishing.

Optional helpers: .env.example lists configuration names with dummy values; CONTRIBUTING.md explains how people can help; STRUCTURE.md maps folders. A live demo and screenshots are useful but optional. SECURITY.md and automated checks are encouraged, not required.

## 3. Add files without using a terminal

Open YOUR GitHub repository, choose Add file > Create new file, enter the exact filename, and paste the customised content. Use Preview for Markdown, then Commit changes to save it. You can also use Add file > Upload files for downloads. Check that your editor did not add .txt to the filename. Merge any changes into your repository's default branch before testing.

When a file already exists, edit it and preserve useful project-specific information. Do not overwrite an existing license or ignore rules blindly. Never upload your whole machine folder without checking its contents. A .gitignore does not remove secrets already committed: remove exposed material and revoke/rotate those credentials with their provider.

## 4. Test a real task, then fill in the report

First commit all code, README, license and other changes. Test that saved version using disposable sample data. You can test manually: open the app, carry out its main task and observe the outcome. Try an invalid input as well. Record exact steps, expected result and actual result; a screenshot or 'it works' alone is not enough.

Illustrative example only: in a task app, add a task named "Buy milk", save it and reload the page. Expected: the task remains visible. Actual: record whether it remained visible or disappeared. Mark passed only if the observed result matches the expectation. Test your own app and replace this example with what you actually did.

Find the tested commit in GitHub's commit history and copy its FULL SHA, or run git rev-parse HEAD from your project folder. Record your actual test date/time with a timezone, your operating system/browser/runtime versions, and any services used.

A timestamp looks like 2026-09-13T14:30:00+05:30 (date, time and timezone offset). Use the time you actually tested, not this example. The operating system is Windows/macOS/Linux; a runtime is software that runs your code, such as Node or Python. Ask your coding assistant how to find the relevant version numbers.

Edit TEST_REPORT.json using the report template. It deliberately starts with a skipped result and an invalid date/hash so nobody mistakes it for evidence. Replace these with real observations. Include failed and skipped cases, and at least one honestly passing functional scenario. Use passed, failed or skipped as the status. Do not invent a passing result to submit.

Save ONLY TEST_REPORT.json in the next commit on the default branch. The latest commit must be the tested version or its immediate child that changes only that report. If anything else changes afterward, test the new version again, then make a fresh report-only commit. If using a branch/PR, check the final default-branch history; merges can change the commit relationship.

## 5. Submit and invite useful feedback

Visit https://openvibes.vercel.app/ and choose Submit an app. Sign in, read the requirements, and supply the root repo URL in the form https://github.com/owner/repository. Use a specific name, a short summary, an honest full description and a category. Choose experimental, usable or maintained based on what works and the support you can offer. Confirm that you have permission to share.

Explain what feedback you want: a task someone can try, a confusing step they could improve or a feature they could contribute. Do not submit the same repository again from a different account. Tell reviewers what a fork adds beyond the original project.

Documentation checks lead to pending human review, not automatic publication or a safety badge. OpenVibes does not execute your tests or certify your app. Templates help explain real work; they are not a way around review. For rejection feedback or changes to an existing listing, contact a maintainer; there is no self-service resubmission screen yet.

## Ask an AI assistant for help without inventing evidence

"Explain these files in plain language. Inspect my project and help me replace the template prompts with accurate details. Do not invent commands, features, test results or permission to use other people's work. Ask me what I observed while testing, and keep secrets out of all files we publish."

Policy and exact report limits: https://github.com/dev-sekhar/vibeMarketPlace/blob/dev/docs/SUBMISSION_REQUIREMENTS.md
