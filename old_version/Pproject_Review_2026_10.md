# Frontend Calculator Review and Improvement Plan

Project owner  Noa Jou  |  Review date  October 2026

The goal is to develop this small calculator into clear evidence of foundational frontend skills: semantic HTML, responsive CSS, JavaScript logic, DOM interaction, accessibility, and testing. The priority is a dependable, understandable implementation that an employer can inspect and try.

Repository: [noa-jou/Fontend-Calculator](https://github.com/noa-jou/Fontend-Calculator)

Review baseline: commit 30a4aac. The review covered `README.md` and `HtmlPage1.html`. Calculation functions were executed with a simulated display; browser layout, screen-reader behaviour, and cross-browser compatibility have not yet been verified.

## 1 Existing strengths

### A working connection between HTML and JavaScript

The page uses native button elements to enter numbers and operators, clear the display, and calculate a result. JavaScript locates and updates the display through the DOM. This demonstrates a starting foundation in interactive web pages and event handling.

### Custom arithmetic logic without eval

The implementation separates numbers and operators and performs multiplication and division before addition and subtraction. It calculates expressions without `eval()` or dynamically executing the input as JavaScript. Preserve this design principle during the refactor.

| Verified expression | Current result | Demonstrated behaviour |
| --- | --- | --- |
| `2+3*4` | `14` | Operator precedence |
| `2*-3` | `-6` | Negative operand |
| `1--2` | `3` | Subtraction of a negative number |
| `0.1+0.2` | `0.3` | This decimal example works |

### Validation and functional decomposition

Separate functions handle validation, number extraction, operator extraction, and arithmetic. The expression 1..2+3 is rejected. These are useful foundations for extracting a calculation engine that can be tested independently of the page.

### A small scope that supports explanation

The reviewed page uses plain HTML, CSS, and JavaScript without external runtime dependencies. Keeping that scope makes it easier to explain individual implementation choices and demonstrate knowledge of browser fundamentals.

## 2 Confirmed issues and gaps

### Calculation correctness

| Expression | Observed result | Required behaviour |
| --- | --- | --- |
| `1/0` | `Infinity` | A clear division-by-zero error |
| `0/0` | `NaN` | A clear division-by-zero error |
| `1/0+2` | `Infinity+2` | Stop evaluation and show an error |
| `1/3*3` | `0.9999999999` | Avoid rounding intermediate results |
| `0.0000001*0.1+1` | `2` | Approximately 1.00000001 |

Scientific notation bug. The multiplication result 0.00000001 becomes the text 1e-8 when the code rebuilds the expression. The existing parsing functions do not understand that notation. Re-parsing the resulting text leads to the incorrect result 2. Keep intermediate values as numbers and reduce the number/operator arrays directly.

Premature rounding. Each arithmetic helper applies `toFixed(10)`. Rounding during calculation loses information before the remaining operations run. Keep available numeric precision internally and format only the displayed answer. JavaScript Number still has floating-point limits; this change does not provide exact decimal arithmetic.

### HTML structure and accessibility

The document has an empty title, no declared page language, and no viewport metadata. A table is used for keypad layout, while a label element serves as the display. A meaningful title, semantic page structure, a suitable output element, and a CSS layout would demonstrate stronger HTML knowledge.

Native buttons provide a useful accessibility starting point, but the code does not implement calculator keyboard shortcuts, descriptive names for symbolic controls, or a deliberate result/error announcement strategy. These require implementation and browser testing.

### Input and presentation

There is no delete button. Invalid input produces an alert telling users to clear and re-enter the expression. The keypad uses fixed cell dimensions and minimal styling, with no responsive rules. Mobile layout, long results, focus visibility, and contrast need deliberate design and verification.

### Maintainability and documentation

Markup, CSS, and JavaScript share one file, with inline `onclick` handlers. The display is also used as calculation state through `innerHTML`. Separate application state from rendered text and use `textContent` for plain-text output. This is a safer rendering practice, not evidence of a demonstrated exploitable vulnerability in the current button-only UI.

The reviewed repository contains no automated test suite. The repository name uses Fontend and the README heading uses Fontecd. The README describes rounding to the nearest tenth, while the helpers round to ten decimal places. It also lacks a screenshot, demo link, and explanation of design decisions.

## 3 Improvement plan

The core scope is a polished vanilla HTML, CSS, and JavaScript calculator. The work below is planned, not completed. The optional teaching feature can follow once the core behaviour is reliable.

### First milestone  Reliable calculation

Extract an `evaluateExpression` function independent of the DOM. Keep intermediate results numeric, preserve operator precedence and signed operands, and handle division by zero and non-finite results explicitly. Store the full result separately from its formatted display so the next calculation does not reuse rounded text.

Add regression tests for all expressions in this review, plus empty input, repeated decimal points, trailing operators, and chained multiplication/division. Compare floating-point results using an appropriate tolerance and test display formatting separately.

### Second milestone  Frontend fundamentals

HTML: add a meaningful title, lang attribute, viewport metadata, a main element, and a visible heading. Use native buttons with explicit types and clear accessible names. Give the expression and result separate, labelled displays; use an output element where appropriate.

CSS: replace the layout table with CSS Grid. Define consistent spacing, type sizes, colours, and visible focus states. Support narrow screens and long expressions without breaking the page. Check colour contrast and usability at increased browser zoom.

JavaScript: separate calculation logic from input handling and rendering. Replace inline handlers with `addEventListener`. Add number/operator shortcuts, Enter, Backspace, and Escape. Provide an on-screen delete button and inline errors that preserve the expression for correction.

Accessibility: keep logical keyboard navigation and announce completed results and errors without announcing every keystroke. Verify the interface using keyboard-only operation and a screen reader.

### Third milestone  Reviewable portfolio evidence

Organize the project into `index.html`, `styles.css`, `calculator.js`, `app.js`, and `calculator.test.js`. Correct the project spelling to Frontend Calculator and update links if the repository is renamed. Add a working demo, desktop/mobile screenshots, run/test instructions, supported syntax, and known precision limits.

Document the scientific-notation bug with a failing example, its cause, the fix, and a passing regression test. Explain why intermediate values remain numeric and why display formatting is separate. This gives employers concrete evidence of debugging and engineering judgment.

### Optional extension  Show calculation steps

Display the reduction of an expression, for example 2 + 3 × 4, then 2 + 12, then 14. Derive the steps from the same evaluation logic. This is an optional educational feature, not a requirement for demonstrating frontend foundations.

### Completion criteria

The regression suite passes; invalid input produces understandable errors; mouse, touch, and keyboard input work; narrow-screen and zoom checks pass; focus and announcements are verified; and the README links to a working demo. Record the browsers and devices actually tested. The finished project should support a focused claim of frontend fundamentals, without implying mastery of every frontend discipline.
