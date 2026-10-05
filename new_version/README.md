# Frontend Calculator (new_version)

This folder contains a beginner-friendly vanilla JavaScript calculator and a visual test suite.

## What is inside

- `calculator.html`  
  The calculator app UI and interaction page.
- `app.js`  
  Calculator input handling, expression parsing, validation, and evaluation logic.
- `style.css`  
  Calculator styling.
- `availability_and_math_correct_test.html`  
  Interactive test dashboard that checks calculator behavior step by step.

## Quick start

### Option 1: Open files directly

1. Open `calculator.html` in your browser to use the calculator.
2. Open `availability_and_math_correct_test.html` in your browser to run and review tests.

### Option 2: Serve locally (recommended)

Using a local server avoids browser restrictions and matches real deployment behavior.

If you have Python:

```bash
cd new_version
python3 -m http.server 8080
```

Then open:

- Calculator: `http://localhost:8080/calculator.html`
- Test suite: `http://localhost:8080/availability_and_math_correct_test.html`

## For GitHub / GitHub Pages

If this folder is published through GitHub Pages, readers can open:

- `calculator.html` to try the calculator
- `availability_and_math_correct_test.html` to view and run the tests

Tip: include both links in your repository description or main project README so visitors can quickly find them.

## Calculator features

- Number input (`0-9`) and decimal point
- Operators: `+`, `-`, `*`, `/`
- Parentheses support: `(` and `)`
- Keyboard support: numbers/operators, `Enter`, `Backspace`, `Escape`, `C`
- Validation and error handling for invalid expressions and divide-by-zero

## Test suite highlights

- Numbered, beginner-friendly test display
- Category summaries (availability, math, decimal precision, input validation, keyboard, and more)
- Expandable “why this test exists” explanations
- Slow step-by-step run mode to make learning easier

## Notes

- This project intentionally avoids `eval()` and uses a custom parser/evaluator in `app.js`.
- Floating-point math in JavaScript can have tiny precision limits; display formatting reduces common noise.
