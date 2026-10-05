# Frontend Calculator (new_version)

This folder contains:

- `calculator.html`: the calculator app
- `availability_and_math_correct_test.html`: the visual test dashboard
- `app.js`: calculator logic (input, parsing, validation, evaluation)
- `style.css`: UI styles

---

## Local run

### Open directly

1. Open `calculator.html` in a browser.
2. Open `availability_and_math_correct_test.html` in a browser.

### Local server (recommended)

```bash
cd new_version
python3 -m http.server 8080
```

Then open:

- `http://localhost:8080/calculator.html`
- `http://localhost:8080/availability_and_math_correct_test.html`

---

## GitHub Pages guide (aligned with official docs)

This section follows the GitHub Pages flow from:
https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site

### 1. Repository requirements

1. Push this project to GitHub.
2. If your account is on GitHub Free, the repository should be public for Pages.
3. If this is a user/organization site, the repo name must be `<user>.github.io`.

### 2. Pick your publishing source

In **Settings -> Pages**, choose one:

1. **Deploy from a branch** (simple for static files)
2. **GitHub Actions** (if you want a custom workflow)

### 3. Entry file rule (important)

GitHub Pages looks for an entry file at the **top level of the publishing source**:

- `index.html`, or
- `index.md`, or
- `README.md`

If your source is a branch/folder, that entry file must be in that exact source folder.

### 4. URL for this project structure

If your publishing source includes this folder as `new_version`, your public links will be:

- Calculator: `https://<user>.github.io/<repository>/new_version/calculator.html`
- Test dashboard: `https://<user>.github.io/<repository>/new_version/availability_and_math_correct_test.html`

After you save Pages settings, first deploy can take several minutes (often up to about 10 minutes).

---

## Suggested publish setup for this repo

If you want to keep current structure and publish quickly:

1. Keep files in `new_version/`
2. In **Settings -> Pages**, choose branch source that contains this folder
3. Share the two direct URLs above

If you want cleaner URLs later (without `/new_version/`), move these files into the top level of the publishing source.

---

## Feature summary

- Supports numbers, decimals, `+ - * /`, and parentheses
- Keyboard support (`Enter`, `Backspace`, `Escape`, `C`)
- Division-by-zero and invalid-expression handling
- Slow, beginner-friendly visual test runner with explanations

## Notes

- The calculator uses a custom parser/evaluator (no `eval()`).
- JavaScript floating-point limits still exist; display formatting reduces common noise.
