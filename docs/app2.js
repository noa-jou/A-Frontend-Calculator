// -----------------------------------------------------------------------------
// Beginner map for this file:
// 1) Grab page elements + mode settings.
// 2) Build reusable helpers for formatting, iframe access, and rendering.
// 3) Run category test functions (run...Tests).
// 4) Orchestrate the full run in runAllTests().
// -----------------------------------------------------------------------------

var frame = document.getElementById('calcFrame');
// Cache frequently used DOM nodes once, then reuse them across functions.
var runBtn = document.getElementById('runBtn');
var modeSelectEl = document.getElementById('modeSelect');
var statusEl = document.getElementById('status');
var summaryEl = document.getElementById('summary');
var categorySummaryEl = document.getElementById('categorySummary');
var reportsHistoryEl = document.getElementById('reportsHistory');
var modeGuideDetailsEl = document.getElementById('modeGuideDetails');
var modeGuideSummaryEl = document.getElementById('modeGuideSummary');
var modeGuideTitleEl = document.getElementById('modeGuideTitle');
var modeGuideCopyEl = document.getElementById('modeGuideCopy');
var modeGuideListEl = document.getElementById('modeGuideList');
var modeGuideTipEl = document.getElementById('modeGuideTip');

// Tolerance for floating-point comparisons
var FLOAT_TOLERANCE = 1e-10;
var TEST_STEP_DELAY_MS = 260;
var CATEGORY_STEP_DELAY_MS = 420;
var TEST_MODE = modeSelectEl ? modeSelectEl.value : 'math';

// Mode config drives labels, guide text, and which category keys are enabled.
var TEST_MODE_CONFIG = {
    math: {
        label: 'Core Math',
        simpleDescription: 'Runs only the core math section. This section owns test cases #1-46.',
        kidTip: 'Choose this if you want core calculations and validation checks only.',
        approxTests: 46,
        categoryKeys: ['availability', 'basic-math', 'decimal-precision', 'error-handling', 'input-validation']
    },
    practical: {
        label: 'Daily Use',
        simpleDescription: 'Runs only the daily-use section. This section owns test cases #47-69.',
        kidTip: 'Choose this for real-life stories, keyboard checks, and usability basics.',
        approxTests: 23,
        categoryKeys: ['real-life-stories', 'floating-point', 'keyboard-input', 'html-structure', 'accessibility']
    },
    full: {
        label: 'Advanced',
        simpleDescription: 'Runs only the advanced section. This section owns test cases #70-88.',
        kidTip: 'Choose this for deeper safety and engine-level checks.',
        approxTests: 19,
        categoryKeys: ['security-safety', 'engine-behavior', 'fuzz-invariants']
    }
};

// Human-friendly names shown in the mode guide checklist.
var CATEGORY_MODE_LABELS = {
    'availability': 'Calculator parts exist (buttons, display, main actions)',
    'html-structure': 'Page basics are set up right (title, language, phone view)',
    'accessibility': 'Keyboard use and helpful labels',
    'basic-math': 'Basic equations and order of operations',
    'real-life-stories': 'Story-style math examples from daily life',
    'decimal-precision': 'Decimal math and stable rounding',
    'floating-point': 'Tricky decimal edge cases',
    'error-handling': 'Clear behavior for impossible math (like divide by zero)',
    'security-safety': 'Safety checks for strange text input',
    'engine-behavior': 'Inside logic checks',
    'fuzz-invariants': 'Many random checks to catch hidden bugs',
    'input-validation': 'Blocking broken math input',
    'keyboard-input': 'Keyboard typing works like button clicks'
};

// Source of truth for category order, runner function, and test counts.
var TEST_CATEGORY_REGISTRY = [
    { key: 'availability', label: 'Availability checks', runner: runAvailabilityTests, testCount: 3 },
    { key: 'basic-math', label: 'Basic math checks', runner: runBasicMathTests, testCount: 20 },
    { key: 'decimal-precision', label: 'Decimal precision checks', runner: runDecimalTests, testCount: 6 },
    { key: 'error-handling', label: 'Error handling checks', runner: runErrorHandlingTests, testCount: 5 },
    { key: 'input-validation', label: 'Input validation checks', runner: runInputValidationTests, testCount: 12 },
    { key: 'real-life-stories', label: 'Real-life story checks', runner: runStoryProblemTests, testCount: 4 },
    { key: 'floating-point', label: 'Floating-point edge checks', runner: runFloatPrecisionTests, testCount: 4 },
    { key: 'keyboard-input', label: 'Keyboard checks', runner: runKeyboardTests, testCount: 8 },
    { key: 'html-structure', label: 'HTML structure checks', runner: runHTMLStructureTests, testCount: 4 },
    { key: 'accessibility', label: 'Accessibility checks', runner: runAccessibilityTests, testCount: 3 },
    { key: 'security-safety', label: 'Security and safety checks', runner: runSecuritySafetyTests, testCount: 6 },
    { key: 'engine-behavior', label: 'Engine behavior checks', runner: runEngineBehaviorTests, testCount: 7 },
    { key: 'fuzz-invariants', label: 'Fuzz and invariant checks', runner: runFuzzInvariantTests, testCount: 6 }
];

var RUN_COUNTER = 0;
// Precompute stable global numbering (#1..#88) across all categories.
var CATEGORY_GLOBAL_INDEX = buildCategoryGlobalIndex();

// Basic utility helpers used across many categories.
function floatEqual(a, b, tolerance) {
    tolerance = tolerance || FLOAT_TOLERANCE;
    return Math.abs(a - b) < tolerance;
}

function getModeConfig(mode) {
    return TEST_MODE_CONFIG[mode] || TEST_MODE_CONFIG.full;
}

function buildCategoryGlobalIndex() {
    var map = {};
    var nextNumber = 1;

    for (var i = 0; i < TEST_CATEGORY_REGISTRY.length; i++) {
        var item = TEST_CATEGORY_REGISTRY[i];
        var count = item.testCount || 0;
        var start = nextNumber;
        var end = start + count - 1;

        map[item.key] = {
            key: item.key,
            start: start,
            end: end,
            count: count,
            label: item.label
        };

        nextNumber = end + 1;
    }

    return map;
}

function getModeGlobalRange(mode) {
    // Returns the global test-number range for one mode (for example #1-46).
    var modeConfig = getModeConfig(mode);
    var keys = modeConfig.categoryKeys || [];
    var minStart = Infinity;
    var maxEnd = 0;
    var totalCount = 0;

    for (var i = 0; i < keys.length; i++) {
        var info = CATEGORY_GLOBAL_INDEX[keys[i]];
        if (!info) continue;

        if (info.start < minStart) {
            minStart = info.start;
        }
        if (info.end > maxEnd) {
            maxEnd = info.end;
        }
        totalCount += info.count;
    }

    if (minStart === Infinity || maxEnd === 0) {
        return null;
    }

    return {
        start: minStart,
        end: maxEnd,
        count: totalCount
    };
}

function formatClockTime(dateObj) {
    return dateObj.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function createRunReport(modeConfig, modeRange, runStartDate) {
    // Keep each run as a separate report so learners can compare attempts.
    var reportDetails = document.createElement('details');
    reportDetails.className = 'run-report';
    reportDetails.open = true;

    var summary = document.createElement('summary');
    summary.textContent = 'Run #' + RUN_COUNTER + ' • ' + modeConfig.label + ' • test #' + modeRange.start + '-' + modeRange.end + ' • starting...';

    var meta = document.createElement('p');
    meta.className = 'run-report-meta';
    meta.textContent = 'Start: ' + formatClockTime(runStartDate) + ' • Section range: #' + modeRange.start + '-' + modeRange.end;

    var list = document.createElement('ol');
    list.className = 'result-list';

    reportDetails.appendChild(summary);
    reportDetails.appendChild(meta);
    reportDetails.appendChild(list);

    if (reportsHistoryEl) {
        reportsHistoryEl.prepend(reportDetails);
    }

    return {
        detailsEl: reportDetails,
        summaryEl: summary,
        metaEl: meta,
        listEl: list
    };
}

function renderModeGuide(mode) {
    var modeConfig = getModeConfig(mode);
    var modeRange = getModeGlobalRange(mode);

    if (!modeGuideSummaryEl || !modeGuideTitleEl || !modeGuideCopyEl || !modeGuideListEl) {
        return;
    }

    modeGuideSummaryEl.textContent = 'Mode guide: selected mode details are shown below (click to hide or show)';
    if (modeRange) {
        modeGuideTitleEl.textContent = 'Selected now: ' + modeConfig.label + ' (test #' + modeRange.start + '-' + modeRange.end + ', ' + modeRange.count + ' tests)';
    } else {
        modeGuideTitleEl.textContent = 'Selected now: ' + modeConfig.label;
    }
    modeGuideCopyEl.textContent = modeConfig.simpleDescription;
    if (modeGuideTipEl) {
        modeGuideTipEl.textContent = 'Tip: ' + modeConfig.kidTip;
    }

    modeGuideListEl.innerHTML = '';
    for (var i = 0; i < modeConfig.categoryKeys.length; i++) {
        var key = modeConfig.categoryKeys[i];
        var item = document.createElement('li');
        item.textContent = CATEGORY_MODE_LABELS[key] || key;
        modeGuideListEl.appendChild(item);
    }
}

// Build the exact category run order for the currently selected mode.
function getCategoryPlanForMode(mode) {
    var modeConfig = getModeConfig(mode);
    var enabledKeys = modeConfig.categoryKeys;
    var plan = [];

    for (var i = 0; i < TEST_CATEGORY_REGISTRY.length; i++) {
        var item = TEST_CATEGORY_REGISTRY[i];
        if (enabledKeys.indexOf(item.key) !== -1) {
            plan.push({ key: item.key, label: item.label, runner: item.runner });
        }
    }

    return plan;
}

function formatDisplayValue(value) {
    var text = String(value == null ? '' : value);
    return text === '' ? '(empty)' : text;
}

function formatComputationDetails(expression, actualText, expectedText, pass, alerts) {
    var exprLabel = expression || '(empty)';
    var actualLabel = formatDisplayValue(actualText);

    if (alerts && alerts.length > 0) {
        return exprLabel + ' -> alert: ' + alerts[0];
    }

    if (pass) {
        return exprLabel + ' = ' + actualLabel;
    }

    return exprLabel + ' = ' + actualLabel + ' (expected ' + expectedText + ')';
}

function formatKeySequence(keys) {
    return '[' + keys.join(' ') + ']';
}

// Iframe interaction helpers: these functions talk to calculator.html safely.
function waitForFrameReady() {
    // The calculator lives in an iframe, so wait until its DOM is ready.
    return new Promise(function (resolve, reject) {
        var done = false;
        var timeoutId = null;
        var pollId = null;

        function cleanup() {
            if (pollId) clearInterval(pollId);
            if (timeoutId) clearTimeout(timeoutId);
            frame.removeEventListener('load', onLoad);
        }

        function tryReady() {
            if (done) return;
            var win = frame.contentWindow;
            var doc = frame.contentDocument;
            if (win && doc && doc.readyState === 'complete' && doc.getElementById('input')) {
                done = true;
                cleanup();
                resolve();
            }
        }

        function onLoad() {
            tryReady();
        }

        frame.addEventListener('load', onLoad);
        pollId = setInterval(tryReady, 100);
        timeoutId = setTimeout(function () {
            if (done) return;
            done = true;
            cleanup();
            reject(new Error('Timed out while loading calculator iframe.'));
        }, 8000);

        tryReady();
    });
}

function getCalcContext() {
    var win = frame.contentWindow;
    var doc = frame.contentDocument;
    if (!win || !doc) throw new Error('Cannot access iframe window/document.');
    return { win: win, doc: doc };
}

function normalizeButtonLabel(label) {
    if (label === '*' || label === 'x' || label === 'X' || label === '×') {
        return '*';
    }
    return String(label || '').trim();
}

function findButton(doc, label) {
    var wanted = normalizeButtonLabel(label);
    var buttons = doc.querySelectorAll('button');
    for (var i = 0; i < buttons.length; i++) {
        var actual = normalizeButtonLabel((buttons[i].textContent || '').trim());
        if (actual === wanted) return buttons[i];
    }
    return null;
}

function clickButton(doc, label) {
    var button = findButton(doc, label);
    if (!button) throw new Error('Button not found: ' + label);
    button.click();
}

function clearDisplay(ctx) {
    clickButton(ctx.doc, 'C');
}

function typeExpressionByButtons(ctx, expression) {
    var expr = String(expression || '').replace(/\s+/g, '');
    for (var i = 0; i < expr.length; i++) {
        clickButton(ctx.doc, expr[i]);
    }
}

function getDisplayText(doc) {
    var el = doc.getElementById('input');
    return ((el && el.textContent) || '').trim();
}

function installAlertSpy(ctx) {
    // Record alert messages instead of showing popups during automated tests.
    if (!ctx.win.__calcAlertSpy) {
        var alerts = [];
        var originalAlert = ctx.win.alert;
        ctx.win.alert = function (message) {
            alerts.push(String(message));
        };
        ctx.win.__calcAlertSpy = { alerts: alerts, originalAlert: originalAlert };
    }
    return ctx.win.__calcAlertSpy;
}

function resetCapturedAlerts(ctx) {
    var spy = installAlertSpy(ctx);
    spy.alerts.length = 0;
    return spy;
}

function takeCapturedAlerts(ctx) {
    var spy = installAlertSpy(ctx);
    var copy = spy.alerts.slice();
    spy.alerts.length = 0;
    return copy;
}

function pause(ms) {
    return new Promise(function (resolve) {
        setTimeout(resolve, ms);
    });
}

// UI rendering helpers for result cards and summary text.
function getFriendlyExplanation(result) {
    // Short learner-focused explanation used in each result card.
    var category = result.category || '';

    if (category === 'Availability') {
        return {
            what: 'We make sure the calculator has the parts it needs, like buttons and a display.',
            why: 'Missing parts can make answers wrong or impossible.'
        };
    }

    if (category === 'HTML Structure') {
        return {
            what: 'We check page basics like title, language, and screen setup.',
            why: 'Good page setup helps the calculator work on phones, tablets, and computers.'
        };
    }

    if (category === 'Accessibility') {
        return {
            what: 'We check whether people can use the calculator with keyboard and clear labels.',
            why: 'This helps more learners use the tool, even without a mouse.'
        };
    }

    if (category === 'Basic Math') {
        return {
            what: 'We solve common equations and compare with the expected answer.',
            why: 'This shows the calculator handles everyday math correctly.'
        };
    }

    if (category === 'Real-Life Stories') {
        return {
            what: 'We test math from simple real-life stories, like shopping or sharing.',
            why: 'People use calculators for real tasks, not only textbook equations.'
        };
    }

    if (category === 'Decimal Precision') {
        return {
            what: 'We check decimal numbers carefully, including tiny decimal values.',
            why: 'Money and measurement often use decimals, so this must stay stable.'
        };
    }

    if (category === 'Floating-Point Edge Cases') {
        return {
            what: 'We try tricky decimal equations that can confuse computers.',
            why: 'These checks catch hidden rounding mistakes before users see them.'
        };
    }

    if (category === 'Error Handling') {
        return {
            what: 'We try impossible math, like dividing by zero.',
            why: 'A clear error is safer than a strange answer.'
        };
    }

    if (category === 'Security and Safety') {
        return {
            what: 'We try strange input to make sure the calculator stays safe.',
            why: 'Safe behavior prevents broken screens and unsafe actions.'
        };
    }

    if (category === 'Engine Behavior') {
        return {
            what: 'We check inside calculator rules, not only button clicks.',
            why: 'Strong inside rules keep answers reliable in many situations.'
        };
    }

    if (category === 'Fuzz and Invariants') {
        return {
            what: 'We run lots of random math examples to search for hidden bugs.',
            why: 'Random checks can find problems that fixed examples miss.'
        };
    }

    if (category === 'Input Validation') {
        return {
            what: 'We type broken math and check that it gets blocked.',
            why: 'Blocking broken input prevents confusing results.'
        };
    }

    if (category === 'Keyboard Input') {
        return {
            what: 'We type with keys and check that key actions match button actions.',
            why: 'Many learners prefer typing, so keyboard behavior must be correct.'
        };
    }

    return {
        what: 'We run this check to confirm one calculator behavior.',
        why: 'Each test helps us trust the calculator more.'
    };
}

function renderResult(result, index, targetListEl) {
    var explanation = getFriendlyExplanation(result);

    var item = document.createElement('li');
    item.className = 'result-item';

    var top = document.createElement('div');
    top.className = 'result-top';

    var titleWrap = document.createElement('div');

    var title = document.createElement('p');
    title.className = 'result-title';
    title.textContent = 'Test #' + index + ': ' + result.name;

    var category = document.createElement('p');
    category.className = 'result-category';
    category.textContent = 'Category: ' + (result.category || 'General');

    titleWrap.appendChild(title);
    titleWrap.appendChild(category);

    var badge = document.createElement('span');
    badge.className = 'result-badge ' + (result.pass ? 'result-badge-pass' : 'result-badge-fail');
    badge.textContent = result.pass ? 'PASS' : 'FAIL';

    top.appendChild(titleWrap);
    top.appendChild(badge);

    var detailsText = document.createElement('p');
    detailsText.className = 'result-details';
    detailsText.textContent = result.details;

    var explain = document.createElement('details');
    explain.className = 'result-explain';
    if (!result.pass) {
        explain.open = true;
    }

    var explainTitle = document.createElement('summary');
    explainTitle.textContent = 'Open this note: what we tested and why';

    var what = document.createElement('p');
    what.textContent = 'What we did: ' + explanation.what;

    var why = document.createElement('p');
    why.textContent = 'Why this helps: ' + explanation.why;

    explain.appendChild(explainTitle);
    explain.appendChild(what);
    explain.appendChild(why);

    item.appendChild(top);
    item.appendChild(detailsText);
    item.appendChild(explain);

    if (targetListEl) {
        targetListEl.appendChild(item);
    }
}

function getCategorySummary(results, elapsedMs) {
    var byCategory = {};

    for (var i = 0; i < results.length; i++) {
        var catName = results[i].category || 'Unknown';
        if (!byCategory[catName]) {
            byCategory[catName] = { pass: 0, total: 0 };
        }
        byCategory[catName].total++;
        if (results[i].pass) {
            byCategory[catName].pass++;
        }
    }

    var categoryLines = [];
    for (var name in byCategory) {
        var cat = byCategory[name];
        categoryLines.push(name + ': ' + cat.pass + '/' + cat.total);
    }

    if (typeof elapsedMs === 'number') {
        categoryLines.push('Completed in ' + elapsedMs + 'ms');
    }

    return categoryLines.join('  •  ');
}

// -----------------------------------------------------------------------------
// Test category runners
// Each run...Tests function returns an array of result objects:
// { category, name, pass, details, ...optional explanatory fields }
// -----------------------------------------------------------------------------

// Category runner: checks whether required calculator pieces exist before deeper tests.
function runAvailabilityTests() {
    var results = [];
    try {
        var ctx = getCalcContext();
        var requiredFunctions = ['inputText', 'clearText', 'calculate', 'evaluateExpression', 'formatResult'];
        var missingFunctions = [];
        for (var i = 0; i < requiredFunctions.length; i++) {
            if (typeof ctx.win[requiredFunctions[i]] !== 'function') {
                missingFunctions.push(requiredFunctions[i]);
            }
        }

        var requiredButtons = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '-', '*', '/', '(', ')', '.', 'C', '='];
        var missingButtons = [];
        for (var j = 0; j < requiredButtons.length; j++) {
            if (!findButton(ctx.doc, requiredButtons[j])) {
                missingButtons.push(requiredButtons[j]);
            }
        }

        var displayExists = !!ctx.doc.getElementById('input');
        var pass = displayExists && missingFunctions.length === 0 && missingButtons.length === 0;

        results.push({
            category: 'Availability',
            name: 'All required functions exist',
            pass: missingFunctions.length === 0,
            details: missingFunctions.length === 0 ? 'Found all functions' : 'Missing: ' + missingFunctions.join(', ')
        });

        results.push({
            category: 'Availability',
            name: 'All required buttons present',
            pass: missingButtons.length === 0,
            details: missingButtons.length === 0 ? 'Found all buttons' : 'Missing: ' + missingButtons.join(', ')
        });

        results.push({
            category: 'Availability',
            name: 'Display element exists',
            pass: displayExists,
            details: displayExists ? 'Element #input found' : 'Element #input missing'
        });
    } catch (error) {
        results.push({
            category: 'Availability',
            name: 'Setup error',
            pass: false,
            details: error.message
        });
    }
    return results;
}

// Category runner: verifies arithmetic correctness and operator precedence.
function runBasicMathTests() {
    var results = [];
    var testCases = [
        { expr: '2+2', expected: 4, name: '2 + 2' },
        { expr: '5-3', expected: 2, name: '5 - 3' },
        { expr: '3*4', expected: 12, name: '3 × 4' },
        { expr: '8/2', expected: 4, name: '8 ÷ 2' },
        { expr: '2+3*4', expected: 14, name: 'Precedence: 2 + 3 × 4' },
        { expr: '10-2*3', expected: 4, name: 'Precedence: 10 - 2 × 3' },
        { expr: '6/2*3', expected: 9, name: 'Left-to-right: 6 ÷ 2 × 3' },
        { expr: '2*-3', expected: -6, name: 'Negative operand: 2 × -3' },
        { expr: '2--3', expected: 5, name: 'Double minus: 2 - -3' },
        { expr: '-5+3', expected: -2, name: 'Leading negative: -5 + 3' },
        { expr: '(2+3)*4', expected: 20, name: 'Parentheses: (2 + 3) × 4' },
        { expr: '2*(3+4)', expected: 14, name: 'Parentheses: 2 × (3 + 4)' },
        { expr: '(2+3)*(4-1)', expected: 15, name: 'Parentheses: (2 + 3) × (4 - 1)' },
        { expr: '2*(-3+5)', expected: 4, name: 'Parentheses with negative: 2 × (-3 + 5)' },
        { expr: '-(2+3)', expected: -5, name: 'Unary before parentheses: -(2 + 3)' },
        { expr: '(-2)*(-8)', expected: 16, name: 'Both negative groups: (-2) × (-8)' },
        { expr: '((2+3)*4)-5', expected: 15, name: 'Nested parentheses: ((2 + 3) × 4) - 5' },
        { expr: '2*(3+(4*(5-2)))', expected: 30, name: 'Deep nesting: 2 × (3 + (4 × (5 - 2)))' },
        { expr: '(0.5+0.25)/(0.5-0.25)', expected: 3, name: 'Fraction relation: (0.5 + 0.25) ÷ (0.5 - 0.25)' },
        { expr: '((12.5-2.5)/2)*(3+1)', expected: 20, name: 'Mixed decimal nesting: ((12.5 - 2.5) ÷ 2) × (3 + 1)' }
    ];

    for (var i = 0; i < testCases.length; i++) {
        var tc = testCases[i];
        try {
            var ctx = getCalcContext();
            resetCapturedAlerts(ctx);
            clearDisplay(ctx);
            typeExpressionByButtons(ctx, tc.expr);
            clickButton(ctx.doc, '=');
            var alerts = takeCapturedAlerts(ctx);
            var actualText = getDisplayText(ctx.doc);
            var actualNumber = parseFloat(actualText);
            var tolerance = tc.tolerance || FLOAT_TOLERANCE;
            var pass = alerts.length === 0 && !isNaN(actualNumber) && floatEqual(actualNumber, tc.expected, tolerance);

            var details = formatComputationDetails(tc.expr, actualText, tc.expected, pass, alerts);

            results.push({
                category: 'Basic Math',
                name: tc.name,
                pass: pass,
                details: details
            });
        } catch (error) {
            results.push({
                category: 'Basic Math',
                name: tc.name,
                pass: false,
                details: error.message
            });
        }
    }
    return results;
}

// Category runner: validates practical story-style equations learners relate to.
function runStoryProblemTests() {
    var results = [];
    var testCases = [
        {
            expr: '(3*2)+1',
            expected: 7,
            name: 'Snack shop story: 3 snacks at 2 each, then +1 drink',
            what: 'We turn a short shopping story into a math expression and verify the total.',
            why: 'People often use calculators for prices and totals in real life.'
        },
        {
            expr: '(24+18)/6',
            expected: 7,
            name: 'Sharing story: split 24 and 18 candies among 6 kids',
            what: 'We test grouping and division in a sharing scenario.',
            why: 'Fair sharing problems are common and must be calculated correctly.'
        },
        {
            expr: '(50-12.5)+7.5',
            expected: 45,
            name: 'Allowance story: start 50, spend 12.5, receive 7.5',
            what: 'We combine subtraction and addition with decimals like money.',
            why: 'Many users trust calculators for budgeting and savings updates.'
        },
        {
            expr: '(8+2)*3',
            expected: 30,
            name: 'Measurement story: (8 + 2) groups repeated 3 times',
            what: 'We check that parentheses are solved before multiplication in a repeated-group story.',
            why: 'Order of operations is essential for word-problem style calculations.'
        }
    ];

    for (var i = 0; i < testCases.length; i++) {
        var tc = testCases[i];
        try {
            var ctx = getCalcContext();
            resetCapturedAlerts(ctx);
            clearDisplay(ctx);
            typeExpressionByButtons(ctx, tc.expr);
            clickButton(ctx.doc, '=');
            var alerts = takeCapturedAlerts(ctx);

            var actual = parseFloat(getDisplayText(ctx.doc));
            var pass = alerts.length === 0 && floatEqual(actual, tc.expected, 1e-10);

            var details = formatComputationDetails(tc.expr, actual, tc.expected, pass, alerts);

            results.push({
                category: 'Real-Life Stories',
                name: tc.name,
                pass: pass,
                details: details,
                what: tc.what,
                why: tc.why
            });
        } catch (error) {
            results.push({
                category: 'Real-Life Stories',
                name: tc.name,
                pass: false,
                details: error.message,
                what: tc.what,
                why: tc.why
            });
        }
    }

    return results;
}

// Category runner: checks decimal calculations and rounding stability.
function runDecimalTests() {
    var results = [];
    var testCases = [
        { expr: '0.1+0.2', expected: 0.3, name: '0.1 + 0.2 (classic float bug)', tolerance: 1e-10 },
        { expr: '1.5*2', expected: 3, name: '1.5 × 2' },
        { expr: '5.5/2', expected: 2.75, name: '5.5 ÷ 2', tolerance: 1e-10 },
        { expr: '0.3*3', expected: 0.9, name: '0.3 × 3', tolerance: 1e-10 },
        { expr: '0.1+0.2+0.3', expected: 0.6, name: 'Decimal chain: 0.1 + 0.2 + 0.3', tolerance: 1e-10 },
        { expr: '(0.1+0.2)*10', expected: 3, name: 'Scaled decimal with parentheses: (0.1 + 0.2) × 10', tolerance: 1e-10 }
    ];

    for (var i = 0; i < testCases.length; i++) {
        var tc = testCases[i];
        try {
            var ctx = getCalcContext();
            resetCapturedAlerts(ctx);
            clearDisplay(ctx);
            typeExpressionByButtons(ctx, tc.expr);
            clickButton(ctx.doc, '=');
            var alerts = takeCapturedAlerts(ctx);
            var actual = parseFloat(getDisplayText(ctx.doc));
            var tol = tc.tolerance || FLOAT_TOLERANCE;
            var pass = alerts.length === 0 && floatEqual(actual, tc.expected, tol);

            var details = formatComputationDetails(tc.expr, actual, '≈ ' + tc.expected, pass, alerts);

            results.push({
                category: 'Decimal Precision',
                name: tc.name,
                pass: pass,
                details: details
            });
        } catch (error) {
            results.push({
                category: 'Decimal Precision',
                name: tc.name,
                pass: false,
                details: error.message
            });
        }
    }
    return results;
}

// Category runner: stress-tests known floating-point edge cases.
function runFloatPrecisionTests() {
    var results = [];
    // Tests from Project Review section 2 - Calculation correctness
    var testCases = [
        // 1/3*3 should be approximately 1, not 0.9999999999
        { expr: '1/3*3', expected: 1, name: '1 ÷ 3 × 3 (should be 1, not 0.999...)', tolerance: 1e-9 },
        // Very small number test: 0.0000001 * 0.1 + 1 should be ≈ 1.00000001, not 2
        { expr: '0.0000001*0.1+1', expected: 1.00000001, name: '0.0000001 × 0.1 + 1', tolerance: 1e-10 },
        { expr: '0.7-0.6', expected: 0.1, name: 'Tiny difference: 0.7 - 0.6', tolerance: 1e-10 },
        { expr: '(1/9)*9', expected: 1, name: 'Repeat fraction check: (1 ÷ 9) × 9', tolerance: 1e-9 }
    ];

    for (var i = 0; i < testCases.length; i++) {
        var tc = testCases[i];
        try {
            var ctx = getCalcContext();
            resetCapturedAlerts(ctx);
            clearDisplay(ctx);
            typeExpressionByButtons(ctx, tc.expr);
            clickButton(ctx.doc, '=');
            var alerts = takeCapturedAlerts(ctx);
            var actual = parseFloat(getDisplayText(ctx.doc));
            var tol = tc.tolerance || FLOAT_TOLERANCE;
            var pass = alerts.length === 0 && floatEqual(actual, tc.expected, tol);

            var details = formatComputationDetails(tc.expr, actual, '≈ ' + tc.expected, pass, alerts);

            results.push({
                category: 'Floating-Point Edge Cases',
                name: tc.name,
                pass: pass,
                details: details
            });
        } catch (error) {
            results.push({
                category: 'Floating-Point Edge Cases',
                name: tc.name,
                pass: false,
                details: error.message
            });
        }
    }
    return results;
}

// Category runner: ensures impossible operations fail in a clear way.
function runErrorHandlingTests() {
    var results = [];
    var testCases = [
        { expr: '1/0', name: 'Division by zero: 1 ÷ 0' },
        { expr: '0/0', name: 'Zero division by zero: 0 ÷ 0' },
        { expr: '1/0+2', name: 'Invalid chain: 1 ÷ 0 + 2' },
        { expr: '1/(2-2)', name: 'Hidden divide by zero: 1 ÷ (2 - 2)' },
        { expr: '(3+5)/(7-7)', name: 'Parentheses divide by zero: (3 + 5) ÷ (7 - 7)' }
    ];

    for (var i = 0; i < testCases.length; i++) {
        var tc = testCases[i];
        try {
            var ctx = getCalcContext();
            resetCapturedAlerts(ctx);

            clearDisplay(ctx);
            typeExpressionByButtons(ctx, tc.expr);
            clickButton(ctx.doc, '=');

            var alerts = takeCapturedAlerts(ctx);
            var alertShown = alerts.length > 0;
            var alertMsg = alertShown ? alerts[0] : '(no alert)';
            var hasErrorKeyword = alertMsg.indexOf('divide') !== -1 || alertMsg.indexOf('error') !== -1 || alertMsg.indexOf('invalid') !== -1;
            var pass = alertShown && hasErrorKeyword;

            var details = pass
                ? tc.expr + ' -> alert: ' + alertMsg
                : tc.expr + ' -> expected error alert, got: ' + alertMsg;

            results.push({
                category: 'Error Handling',
                name: tc.name,
                pass: pass,
                details: details
            });
        } catch (error) {
            results.push({
                category: 'Error Handling',
                name: tc.name,
                pass: false,
                details: error.message
            });
        }
    }
    return results;
}

// Category runner: confirms malformed expressions are blocked safely.
function runInputValidationTests() {
    var results = [];
    var testCases = [
        { expr: '', name: 'Empty input', shouldError: true },
        { expr: '1..2', name: 'Double decimal point', shouldError: true },
        { expr: '2+', name: 'Trailing operator', shouldError: true },
        { expr: '+5', name: 'Leading plus operator' },
        { expr: '1+++2', name: 'Triple plus operator', shouldError: true },
        { expr: '2**3', name: 'Double multiplication', shouldError: true },
        { expr: '(2+3', name: 'Unclosed parenthesis', shouldError: true },
        { expr: '2+)', name: 'Closing parenthesis without opening', shouldError: true },
        { expr: '2+()', name: 'Empty parenthesis pair', shouldError: true },
        { expr: '2(3+4)', name: 'Missing operator before parenthesis', shouldError: true },
        { expr: '((2+3)', name: 'Double open parentheses not closed', shouldError: true },
        { expr: '2*/3', name: 'Mixed operator pair 2*/3', shouldError: true }
    ];

    for (var i = 0; i < testCases.length; i++) {
        var tc = testCases[i];
        try {
            var ctx = getCalcContext();
            resetCapturedAlerts(ctx);

            clearDisplay(ctx);
            if (tc.expr) {
                typeExpressionByButtons(ctx, tc.expr);
            }
            clickButton(ctx.doc, '=');

            var alerts = takeCapturedAlerts(ctx);
            var alertShown = alerts.length > 0;
            var result = getDisplayText(ctx.doc);
            var isInfinityOrNaN = result === 'Infinity' || result === 'NaN';

            var pass = tc.shouldError ? (alertShown || isInfinityOrNaN) : !alertShown && !isInfinityOrNaN;
            var exprLabel = tc.expr || '(empty)';
            var resultLabel = formatDisplayValue(result);
            var details;

            if (pass && tc.shouldError) {
                details = exprLabel + ' -> blocked (alert: ' + (alertShown ? 'yes' : 'no') + ', display: ' + resultLabel + ')';
            } else if (pass) {
                details = exprLabel + ' = ' + resultLabel;
            } else {
                details = exprLabel + ' -> unexpected (alert: ' + (alertShown ? 'yes' : 'no') + ', display: ' + resultLabel + ')';
            }

            results.push({
                category: 'Input Validation',
                name: tc.name,
                pass: pass,
                details: details
            });
        } catch (error) {
            results.push({
                category: 'Input Validation',
                name: tc.name,
                pass: false,
                details: error.message
            });
        }
    }
    return results;
}

// Category runner: ensures keyboard behavior matches button-click behavior.
function runKeyboardTests() {
    var results = [];
    var testCases = [
        { keys: ['1', '+', '2', 'Enter'], expected: '3', name: 'Enter key calculates: 1 + 2' },
        { keys: ['5', 'Backspace'], expected: '', name: 'Backspace deletes character' },
        { keys: ['1', '+', '2', 'Escape'], expected: '', name: 'Escape clears display' },
        { keys: ['3', '+', '4', 'c'], expected: '', name: 'c key clears display' },
        { keys: ['(', '1', '+', '2', ')', '*', '3', 'Enter'], expected: '9', name: 'Keyboard parentheses: (1 + 2) × 3' },
        { keys: ['(', '2', '+', '3', ')', 'Backspace', ')', 'Enter'], expected: '5', name: 'Keyboard edit with parentheses and Backspace' },
        { keys: ['-', '(', '2', '+', '3', ')', 'Enter'], expected: '-5', name: 'Keyboard unary sign before parentheses: -(2 + 3)' },
        { keys: ['1', '+', '+', 'Backspace', '2', 'Enter'], expected: '3', name: 'Keyboard correction flow: remove mistaken operator with Backspace' }
    ];

    for (var i = 0; i < testCases.length; i++) {
        var tc = testCases[i];
        try {
            var ctx = getCalcContext();
            resetCapturedAlerts(ctx);
            clearDisplay(ctx);

            for (var j = 0; j < tc.keys.length; j++) {
                var event = new ctx.win.KeyboardEvent('keydown', {
                    key: tc.keys[j],
                    bubbles: true,
                    cancelable: true
                });
                ctx.doc.dispatchEvent(event);
            }

            var alerts = takeCapturedAlerts(ctx);
            var actual = getDisplayText(ctx.doc);
            var pass = alerts.length === 0 && actual === tc.expected;
            var keySequence = formatKeySequence(tc.keys);

            var details;
            if (pass) {
                details = 'keys ' + keySequence + ' -> ' + formatDisplayValue(actual);
            } else if (alerts.length > 0) {
                details = 'keys ' + keySequence + ' -> alert: ' + alerts[0];
            } else {
                details = 'keys ' + keySequence + ' -> ' + formatDisplayValue(actual) + ' (expected ' + tc.expected + ')';
            }

            results.push({
                category: 'Keyboard Input',
                name: tc.name,
                pass: pass,
                details: details
            });
        } catch (error) {
            results.push({
                category: 'Keyboard Input',
                name: tc.name,
                pass: false,
                details: error.message
            });
        }
    }
    return results;
}

// Category runner: checks safety behavior (injection, invalid input, robust handlers).
function runSecuritySafetyTests() {
    var results = [];

    function pushResult(name, pass, details, what, why) {
        results.push({
            category: 'Security and Safety',
            name: name,
            pass: pass,
            details: details,
            what: what,
            why: why
        });
    }

    try {
        var ctx = getCalcContext();
        var doc = ctx.doc;
        var output = doc.getElementById('input');

        // 1) Ensure display uses textContent, not HTML execution.
        clearDisplay(ctx);
        resetCapturedAlerts(ctx);
        var htmlPayload = '<img src=x onerror=alert(1)>';
        ctx.win.inputText(htmlPayload);
        var hasInjectedImage = !!output.querySelector('img');
        var passHtmlEscaping = !hasInjectedImage && output.textContent === htmlPayload;
        pushResult(
            'Display treats HTML as text',
            passHtmlEscaping,
            passHtmlEscaping
                ? 'Payload remained plain text; no DOM injection occurred.'
                : 'HTML-like payload affected the DOM unexpectedly.',
            'Inserted an HTML-looking string through the same input helper used by the app.',
            'Using text-only output prevents script/HTML injection via expression text.'
        );

        // 2) Verify keydown handling does not interfere with active input fields.
        clearDisplay(ctx);
        var tempInput = doc.createElement('input');
        doc.body.appendChild(tempInput);
        tempInput.value = '';
        tempInput.dispatchEvent(new ctx.win.KeyboardEvent('keydown', {
            key: '7',
            bubbles: true,
            cancelable: true
        }));
        var passInputFieldIgnore = getDisplayText(doc) === '';
        tempInput.remove();
        pushResult(
            'Keyboard handler ignores typed input fields',
            passInputFieldIgnore,
            passInputFieldIgnore
                ? 'Pressing 7 on an input field did not modify calculator display.'
                : 'Calculator display changed while typing inside an input field.',
            'Dispatched keyboard input from a temporary <input> element.',
            'Users editing form fields should not accidentally trigger calculator shortcuts.'
        );

        // 3) Verify contentEditable also bypasses calculator keyboard shortcuts.
        clearDisplay(ctx);
        var editable = doc.createElement('div');
        editable.contentEditable = 'true';
        doc.body.appendChild(editable);
        editable.dispatchEvent(new ctx.win.KeyboardEvent('keydown', {
            key: '8',
            bubbles: true,
            cancelable: true
        }));
        var passEditableIgnore = getDisplayText(doc) === '';
        editable.remove();
        pushResult(
            'Keyboard handler ignores contenteditable areas',
            passEditableIgnore,
            passEditableIgnore
                ? 'Pressing 8 in contenteditable area did not affect calculator display.'
                : 'Calculator display changed while typing in contenteditable area.',
            'Dispatched keyboard input from a temporary contenteditable region.',
            'Content editing areas should keep normal typing behavior without calculator interference.'
        );

        // 4) Confirm invalid character expressions fail safely.
        resetCapturedAlerts(ctx);
        output.textContent = '2+alert(1)';
        ctx.win.calculate();
        var invalidAlerts = takeCapturedAlerts(ctx);
        var passInvalidChars = invalidAlerts.length > 0 && output.textContent === '2+alert(1)';
        pushResult(
            'Invalid character expression is rejected safely',
            passInvalidChars,
            passInvalidChars
                ? 'Expression was rejected with alert and original text stayed visible.'
                : 'Invalid character expression was not handled safely.',
            'Ran calculate() on expression containing unsupported letters and function-like text.',
            'Invalid input must fail predictably instead of partially evaluating or mutating state unpredictably.'
        );

        // 5) Confirm divide-by-zero preserves user expression text after alert.
        resetCapturedAlerts(ctx);
        output.textContent = '1/0';
        ctx.win.calculate();
        var zeroAlerts = takeCapturedAlerts(ctx);
        var passKeepExpression = zeroAlerts.length > 0 && output.textContent === '1/0';
        pushResult(
            'Error does not erase user expression',
            passKeepExpression,
            passKeepExpression
                ? 'After divide-by-zero, expression remained for user correction.'
                : 'Expression changed unexpectedly after divide-by-zero error.',
            'Triggered divide-by-zero and checked display content after alert handling.',
            'Keeping the original text helps users quickly correct mistakes.'
        );

        // 6) Lightweight static check that core functions do not use eval/new Function.
        var sourceText = [
            ctx.win.evaluateExpression,
            ctx.win.calculate,
            ctx.win.tokenizeExpression
        ].map(function (fn) {
            return typeof fn === 'function' ? fn.toString() : '';
        }).join('\n');
        var passNoEval = !/\beval\s*\(/.test(sourceText) && !/\bFunction\s*\(/.test(sourceText);
        pushResult(
            'Core engine avoids eval/new Function',
            passNoEval,
            passNoEval
                ? 'No eval/new Function detected in key calculation functions.'
                : 'Found eval/new Function usage in key calculation functions.',
            'Inspected function source text for dynamic code execution patterns.',
            'Avoiding dynamic execution is safer and easier to reason about.'
        );
    } catch (error) {
        results.push({
            category: 'Security and Safety',
            name: 'Security test runner setup',
            pass: false,
            details: error.message
        });
    }

    return results;
}

// Category runner: validates internal calculator behavior beyond basic click paths.
function runEngineBehaviorTests() {
    var results = [];

    function pushResult(name, pass, details, what, why) {
        results.push({
            category: 'Engine Behavior',
            name: name,
            pass: pass,
            details: details,
            what: what,
            why: why
        });
    }

    try {
        var ctx = getCalcContext();
        var doc = ctx.doc;

        var valueX = ctx.win.evaluateExpression('2x3');
        pushResult(
            'x multiplication symbol evaluates correctly',
            valueX === 6,
            valueX === 6 ? '2x3 = 6' : 'Expected 6, got ' + valueX,
            'Called evaluateExpression with x as multiplication.',
            'The UI now displays x, so the engine must support it directly.'
        );

        var valueTimesChar = ctx.win.evaluateExpression('2×3');
        pushResult(
            'Unicode multiplication sign evaluates correctly',
            valueTimesChar === 6,
            valueTimesChar === 6 ? '2×3 = 6' : 'Expected 6, got ' + valueTimesChar,
            'Called evaluateExpression with the unicode times character.',
            'Users may paste expressions from other apps using × instead of *.'
        );

        var spacedValue = ctx.win.evaluateExpression(' ( 2 + 3 ) x 4 ');
        pushResult(
            'Whitespace and x symbol normalize correctly',
            spacedValue === 20,
            spacedValue === 20 ? '( 2 + 3 ) x 4 = 20' : 'Expected 20, got ' + spacedValue,
            'Evaluated expression with extra spaces and x symbol.',
            'Robust parsers should handle common spacing differences.'
        );

        var formatted = ctx.win.formatResult(0.30000000000000004);
        pushResult(
            'formatResult reduces common float display noise',
            formatted === '0.3',
            formatted === '0.3' ? '0.30000000000000004 formatted as 0.3' : 'Expected 0.3, got ' + formatted,
            'Formatted a classic floating-point artifact value.',
            'Readable output is important for user trust.'
        );

        clearDisplay(ctx);
        ctx.win.deleteLastChar();
        var safeBackspace = getDisplayText(doc) === '';
        pushResult(
            'deleteLastChar is safe on empty display',
            safeBackspace,
            safeBackspace ? 'Empty display remained stable.' : 'Display changed unexpectedly on empty backspace.',
            'Called deleteLastChar with no expression content.',
            'Defensive behavior avoids edge-case crashes.'
        );

        var verifyImplicitMultiply = ctx.win.verify('2(3+4)') === false;
        pushResult(
            'verify blocks implicit multiplication form',
            verifyImplicitMultiply,
            verifyImplicitMultiply ? '2(3+4) correctly rejected.' : '2(3+4) was unexpectedly accepted.',
            'Checked validation for missing operator before parentheses.',
            'The current grammar requires explicit operators for predictable parsing.'
        );

        var terms = 150;
        var longExpr = Array(terms).fill('1').join('+');
        var longValue = ctx.win.evaluateExpression(longExpr);
        pushResult(
            'Long addition chain evaluates correctly',
            longValue === terms,
            longValue === terms ? 'Long chain result = ' + longValue : 'Expected ' + terms + ', got ' + longValue,
            'Evaluated a long but valid expression to stress parser/evaluator flow.',
            'Long-input stability helps prevent hidden edge-case failures.'
        );
    } catch (error) {
        results.push({
            category: 'Engine Behavior',
            name: 'Engine behavior test runner setup',
            pass: false,
            details: error.message
        });
    }

    return results;
}

// Category runner: uses seeded random expressions to catch hidden regressions.
function runFuzzInvariantTests() {
    var results = [];

    function pushResult(name, pass, details, what, why) {
        results.push({
            category: 'Fuzz and Invariants',
            name: name,
            pass: pass,
            details: details,
            what: what,
            why: why
        });
    }

    function createSeededRandom(seed) {
        var state = seed >>> 0;
        return function () {
            state = (1664525 * state + 1013904223) >>> 0;
            return state / 4294967296;
        };
    }

    function randomInt(rand, min, max) {
        return Math.floor(rand() * (max - min + 1)) + min;
    }

    function randomNumberToken(rand, allowSigned) {
        var whole = randomInt(rand, 1, 9);
        var text = String(whole);

        if (rand() < 0.35) {
            text = text + '.' + randomInt(rand, 1, 9);
        }

        if (allowSigned && rand() < 0.3) {
            text = '-' + text;
        }

        return text;
    }

    function generateExpression(rand, operatorCount) {
        var operators = ['+', '-', '*', '/'];
        var expression = randomNumberToken(rand, true);

        for (var i = 0; i < operatorCount; i++) {
            var op = operators[randomInt(rand, 0, operators.length - 1)];
            var right = randomNumberToken(rand, false);
            expression = expression + op + right;

            if (rand() < 0.22) {
                expression = '(' + expression + ')';
            }
        }

        return expression;
    }

    function referenceEvaluate(ctx, expression) {
        var compact = ctx.win.normalizeExpressionSymbols(expression).replace(/\s+/g, '');

        if (!/^[0-9+\-*/().]+$/.test(compact)) {
            throw new Error('Unsafe reference expression: ' + expression);
        }

        var value = Function('"use strict"; return (' + compact + ');')();
        if (typeof value !== 'number' || !isFinite(value)) {
            throw new Error('Reference value not finite');
        }

        return value;
    }

    function decorateWithAltSymbols(expression, rand) {
        var withMultiplySymbols = expression.replace(/\*/g, function () {
            return rand() < 0.5 ? 'x' : '×';
        });

        var decorated = '';
        for (var i = 0; i < withMultiplySymbols.length; i++) {
            var ch = withMultiplySymbols[i];
            if ('+-/()x×'.indexOf(ch) !== -1 && rand() < 0.4) {
                decorated += ' ' + ch + ' ';
            } else {
                decorated += ch;
            }
        }

        return '  ' + decorated + '  ';
    }

    try {
        var ctx = getCalcContext();
        var sampleRand = createSeededRandom(20261005);
        var sampleCount = 18;
        var samples = [];

        for (var i = 0; i < sampleCount; i++) {
            samples.push(generateExpression(sampleRand, randomInt(sampleRand, 2, 6)));
        }

        var mismatchCount = 0;
        var firstMismatch = null;
        for (var j = 0; j < samples.length; j++) {
            var sampleExpr = samples[j];
            var engineValue = ctx.win.evaluateExpression(sampleExpr);
            var referenceValue = referenceEvaluate(ctx, sampleExpr);

            if (!floatEqual(engineValue, referenceValue, 1e-9)) {
                mismatchCount++;
                if (!firstMismatch) {
                    firstMismatch = {
                        expr: sampleExpr,
                        engineValue: engineValue,
                        referenceValue: referenceValue
                    };
                }
            }
        }

        var passReferenceMatch = mismatchCount === 0;
        pushResult(
            'Deterministic fuzz samples match reference evaluator',
            passReferenceMatch,
            passReferenceMatch
                ? sampleCount + ' random expressions matched a sanitized JS reference evaluator.'
                : ('Mismatch on "' + firstMismatch.expr + '": engine=' + firstMismatch.engineValue + ', reference=' + firstMismatch.referenceValue),
            'Generated fixed-seed expressions and compared the calculator result with an independently evaluated reference value.',
            'Cross-checking many expressions quickly catches parser or precedence regressions.'
        );

        var altRand = createSeededRandom(20261006);
        var altMismatchCount = 0;
        var firstAltMismatch = null;
        for (var k = 0; k < samples.length; k++) {
            var originalExpr = samples[k];
            var mixedExpr = decorateWithAltSymbols(originalExpr, altRand);
            var baseValue = ctx.win.evaluateExpression(originalExpr);
            var mixedValue = ctx.win.evaluateExpression(mixedExpr);

            if (!floatEqual(baseValue, mixedValue, 1e-9)) {
                altMismatchCount++;
                if (!firstAltMismatch) {
                    firstAltMismatch = {
                        originalExpr: originalExpr,
                        mixedExpr: mixedExpr,
                        baseValue: baseValue,
                        mixedValue: mixedValue
                    };
                }
            }
        }

        var passAltSymbols = altMismatchCount === 0;
        pushResult(
            'x/*/× and whitespace normalization stay equivalent',
            passAltSymbols,
            passAltSymbols
                ? sampleCount + ' mixed-symbol variants produced the same values as their base expressions.'
                : ('Normalization mismatch: "' + firstAltMismatch.originalExpr + '" vs "' + firstAltMismatch.mixedExpr + '"'),
            'Converted random expressions to mixed multiplication symbols (x and ×) and random spacing, then re-evaluated.',
            'People paste expressions from many sources, so equivalent symbols should behave the same.'
        );

        var identityMismatchCount = 0;
        var firstIdentityMismatch = null;
        for (var m = 0; m < samples.length; m++) {
            var identityExpr = samples[m];
            var base = ctx.win.evaluateExpression(identityExpr);
            var wrapped = ctx.win.evaluateExpression('(' + identityExpr + ')');
            var plusZero = ctx.win.evaluateExpression('(' + identityExpr + ')+0');
            var timesOne = ctx.win.evaluateExpression('(' + identityExpr + ')*1');

            var same = floatEqual(base, wrapped, 1e-9)
                && floatEqual(base, plusZero, 1e-9)
                && floatEqual(base, timesOne, 1e-9);

            if (!same) {
                identityMismatchCount++;
                if (!firstIdentityMismatch) {
                    firstIdentityMismatch = {
                        expr: identityExpr,
                        base: base,
                        wrapped: wrapped,
                        plusZero: plusZero,
                        timesOne: timesOne
                    };
                }
            }
        }

        var passIdentity = identityMismatchCount === 0;
        pushResult(
            'Core math invariants hold on random samples',
            passIdentity,
            passIdentity
                ? 'Parentheses wrapping, +0, and *1 invariants held across all random samples.'
                : ('Invariant mismatch on "' + firstIdentityMismatch.expr + '"'),
            'Checked that E, (E), (E)+0, and (E)*1 all evaluate to the same value.',
            'Invariant checks detect subtle state/precedence bugs even when ordinary examples still pass.'
        );

        var commRand = createSeededRandom(20261007);
        var pairCount = 12;
        var commFailCount = 0;
        var firstCommMismatch = null;

        for (var n = 0; n < pairCount; n++) {
            var a = randomNumberToken(commRand, true);
            var b = randomNumberToken(commRand, true);
            var addAB = ctx.win.evaluateExpression(a + '+' + b);
            var addBA = ctx.win.evaluateExpression(b + '+' + a);
            var mulAB = ctx.win.evaluateExpression(a + '*' + b);
            var mulBA = ctx.win.evaluateExpression(b + '*' + a);

            var passPair = floatEqual(addAB, addBA, 1e-9) && floatEqual(mulAB, mulBA, 1e-9);
            if (!passPair) {
                commFailCount++;
                if (!firstCommMismatch) {
                    firstCommMismatch = {
                        a: a,
                        b: b,
                        addAB: addAB,
                        addBA: addBA,
                        mulAB: mulAB,
                        mulBA: mulBA
                    };
                }
            }
        }

        var passCommutativity = commFailCount === 0;
        pushResult(
            'Addition and multiplication commutativity spot-check',
            passCommutativity,
            passCommutativity
                ? pairCount + ' random pairs satisfied a+b=b+a and a*b=b*a.'
                : ('Commutativity mismatch for a=' + firstCommMismatch.a + ', b=' + firstCommMismatch.b),
            'Evaluated both operand orders for random numeric pairs.',
            'Order-independent operations should remain stable regardless of input sequence.'
        );

        var repeatFailCount = 0;
        var firstRepeatMismatch = null;
        for (var p = 0; p < Math.min(10, samples.length); p++) {
            var repeatExpr = samples[p];
            var r1 = ctx.win.evaluateExpression(repeatExpr);
            var r2 = ctx.win.evaluateExpression(repeatExpr);
            var r3 = ctx.win.evaluateExpression(repeatExpr);
            var repeatOk = floatEqual(r1, r2, 1e-12) && floatEqual(r2, r3, 1e-12);

            if (!repeatOk) {
                repeatFailCount++;
                if (!firstRepeatMismatch) {
                    firstRepeatMismatch = {
                        expr: repeatExpr,
                        r1: r1,
                        r2: r2,
                        r3: r3
                    };
                }
            }
        }

        var passRepeatability = repeatFailCount === 0;
        pushResult(
            'Repeat evaluation is deterministic',
            passRepeatability,
            passRepeatability
                ? 'Repeated runs produced consistent values for sampled expressions.'
                : ('Repeat mismatch on "' + firstRepeatMismatch.expr + '": ' + firstRepeatMismatch.r1 + ', ' + firstRepeatMismatch.r2 + ', ' + firstRepeatMismatch.r3),
            'Re-evaluated the same expression multiple times in a row.',
            'Deterministic output is important for trust and debuggability.'
        );

        var copyPasteCases = [
            '2\u00F73',
            '4\u22122',
            '1\uFF0B2',
            '3,14+2',
            '9\u20444'
        ];
        var badPasteAccepted = [];

        for (var q = 0; q < copyPasteCases.length; q++) {
            var pastedExpr = copyPasteCases[q];
            var verifyResult = ctx.win.verify(pastedExpr);

            resetCapturedAlerts(ctx);
            ctx.doc.getElementById('input').textContent = pastedExpr;
            ctx.win.calculate();
            var alertCount = takeCapturedAlerts(ctx).length;

            if (verifyResult !== false || alertCount === 0) {
                badPasteAccepted.push(pastedExpr);
            }
        }

        var passCopyPasteGuard = badPasteAccepted.length === 0;
        pushResult(
            'Unsafe copy/paste symbols are rejected safely',
            passCopyPasteGuard,
            passCopyPasteGuard
                ? 'Unicode look-alike operators and comma decimals were rejected with validation alerts.'
                : 'Unexpectedly accepted: ' + badPasteAccepted.join(', '),
            'Tried expressions with unicode operator look-alikes and locale-specific punctuation.',
            'Copy/paste input from chats or documents should fail safely when unsupported.'
        );
    } catch (error) {
        results.push({
            category: 'Fuzz and Invariants',
            name: 'Fuzz test runner setup',
            pass: false,
            details: error.message
        });
    }

    return results;
}

// Category runner: checks document-level HTML setup assumptions.
function runHTMLStructureTests() {
    var results = [];
    var ctx = getCalcContext();
    var doc = ctx.doc;
    var html = doc.documentElement;

    // Test 1: Document title
    var titleExists = (doc.title || '').trim().length > 0;
    results.push({
        category: 'HTML Structure',
        name: 'Document has meaningful title',
        pass: titleExists,
        details: titleExists ? 'Title: "' + doc.title + '"' : 'Title is empty'
    });

    // Test 2: Language attribute
    var langAttr = html.getAttribute('lang');
    var hasLang = !!langAttr;
    results.push({
        category: 'HTML Structure',
        name: 'HTML element has lang attribute',
        pass: hasLang,
        details: hasLang ? 'lang="' + langAttr + '"' : 'lang attribute missing'
    });

    // Test 3: Viewport metadata
    var viewportMeta = doc.querySelector('meta[name="viewport"]');
    var hasViewport = !!viewportMeta;
    results.push({
        category: 'HTML Structure',
        name: 'Viewport meta tag present',
        pass: hasViewport,
        details: hasViewport ? 'Viewport meta tag found' : 'Viewport meta tag missing'
    });

    // Test 4: Check for output element or semantic display
    var outputEl = doc.querySelector('output') || doc.querySelector('[role="status"]');
    var hasSemanticOutput = !!outputEl;
    var inputLabel = doc.getElementById('input');
    var pass4 = hasSemanticOutput || (inputLabel && (inputLabel.tagName === 'OUTPUT' || inputLabel.getAttribute('role') === 'status'));
    results.push({
        category: 'HTML Structure',
        name: 'Semantic output element (output or role="status")',
        pass: pass4,
        details: pass4 ? 'Found semantic output element' : 'Using generic element for display'
    });

    return results;
}

// Category runner: checks baseline accessibility features.
function runAccessibilityTests() {
    var results = [];
    var ctx = getCalcContext();
    var doc = ctx.doc;

    // Test 1: Button labels (not just symbols)
    var buttons = doc.querySelectorAll('button');
    var allButtonsHaveText = true;
    var unlabelledButtons = [];
    for (var i = 0; i < buttons.length; i++) {
        var text = (buttons[i].textContent || '').trim();
        if (!text) {
            allButtonsHaveText = false;
            unlabelledButtons.push('button ' + i);
        }
    }

    results.push({
        category: 'Accessibility',
        name: 'All buttons have visible text labels',
        pass: allButtonsHaveText,
        details: allButtonsHaveText ? 'All buttons labeled' : 'Unlabelled buttons: ' + unlabelledButtons.join(', ')
    });

    // Test 2: Check for keyboard event listener
    var hasKeyboardSupport = typeof ctx.win.handleCalculatorKeydown === 'function';
    results.push({
        category: 'Accessibility',
        name: 'Keyboard event handler implemented',
        pass: hasKeyboardSupport,
        details: hasKeyboardSupport ? 'handleCalculatorKeydown function found' : 'No keyboard handler'
    });

    // Test 3: Check for ARIA labels or descriptions
    var elementsWithAria = doc.querySelectorAll('[aria-label], [aria-describedby]');
    var hasAriaSupport = elementsWithAria.length > 0;
    results.push({
        category: 'Accessibility',
        name: 'ARIA labels implemented (optional)',
        pass: hasAriaSupport,
        details: hasAriaSupport ? 'Found ' + elementsWithAria.length + ' elements with ARIA' : 'No ARIA labels found'
    });

    return results;
}

// -----------------------------------------------------------------------------
// Main orchestration: run selected mode, stream progress, and save run report.
// -----------------------------------------------------------------------------
async function runAllTests() {
    // Main workflow: lock controls, run selected categories, then unlock controls.
    runBtn.disabled = true;
    runBtn.textContent = 'Running...';
    if (modeSelectEl) {
        modeSelectEl.disabled = true;
        TEST_MODE = modeSelectEl.value || TEST_MODE;
    }
    var categoryPlan = getCategoryPlanForMode(TEST_MODE);
    var modeConfig = getModeConfig(TEST_MODE);
    var modeRange = getModeGlobalRange(TEST_MODE);

    if (categoryPlan.length === 0) {
        categoryPlan = getCategoryPlanForMode('full');
        modeConfig = getModeConfig('full');
        modeRange = getModeGlobalRange('full');
    }

    if (!modeRange) {
        modeRange = { start: 1, end: 0, count: 0 };
    }

    RUN_COUNTER++;
    var runStartDate = new Date();
    var runReport = createRunReport(modeConfig, modeRange, runStartDate);

    summaryEl.textContent = 'Running ' + modeConfig.label + ' now...';
    statusEl.textContent = 'Getting ready. We will run ' + modeConfig.label + ' one step at a time.';

    var start = performance.now();
    var allResults = [];
    var passCount = 0;

    try {
        await waitForFrameReady();
        resetCapturedAlerts(getCalcContext());

        // Run one category at a time so progress text stays clear.
        for (var c = 0; c < categoryPlan.length; c++) {
            var categoryStep = categoryPlan[c];
            var categoryInfo = CATEGORY_GLOBAL_INDEX[categoryStep.key];
            var categoryStart = categoryInfo ? categoryInfo.start : (modeRange.start + allResults.length);
            statusEl.textContent = 'Step ' + (c + 1) + ' of ' + categoryPlan.length + ': ' + categoryStep.label;

            var categoryResults = categoryStep.runner();
            // Render each test immediately for step-by-step feedback.
            for (var r = 0; r < categoryResults.length; r++) {
                var currentResult = categoryResults[r];
                var globalTestNumber = categoryStart + r;
                allResults.push(currentResult);

                if (currentResult.pass) {
                    passCount++;
                }

                renderResult(currentResult, globalTestNumber, runReport.listEl);

                summaryEl.textContent = passCount + '/' + allResults.length + ' passed so far';
                categorySummaryEl.textContent = getCategorySummary(allResults);
                statusEl.textContent = 'Running Test #' + globalTestNumber + ': ' + currentResult.name;

                await pause(TEST_STEP_DELAY_MS);
            }

            await pause(CATEGORY_STEP_DELAY_MS);
        }
    } catch (error) {
        var setupResult = {
            category: 'Setup',
            name: 'Test runner error',
            pass: false,
            details: error.message
        };

        allResults.push(setupResult);
        renderResult(setupResult, modeRange.start + allResults.length, runReport.listEl);
    }

    var elapsedMs = Math.round(performance.now() - start);
    var runEndDate = new Date();
    var total = allResults.length;
    var failCount = total - passCount;

    summaryEl.textContent = passCount + '/' + total + ' passed';

    categorySummaryEl.textContent = getCategorySummary(allResults, elapsedMs);
    statusEl.textContent = failCount === 0
        ? '✓ All tests passed. Great job exploring them one by one!'
        : '✗ ' + failCount + ' test(s) failed. Open each item to learn what needs fixing.';

    runReport.summaryEl.textContent = 'Run #' + RUN_COUNTER + ' • ' + modeConfig.label + ' • test #' + modeRange.start + '-' + modeRange.end + ' • ' + passCount + '/' + total + ' passed';
    runReport.metaEl.textContent = 'Start: ' + formatClockTime(runStartDate)
        + ' • End: ' + formatClockTime(runEndDate)
        + ' • Duration: ' + elapsedMs + 'ms';

    runBtn.disabled = false;
    runBtn.textContent = 'Run Tests Again';
    if (modeSelectEl) {
        modeSelectEl.disabled = false;
    }

    renderModeGuide(TEST_MODE);
}

// Startup helpers and event wiring.
function setIdleState() {
    // Initial page state before any test run starts.
    if (modeGuideDetailsEl) {
        modeGuideDetailsEl.open = true;
    }

    statusEl.textContent = 'Waiting to start.';
    summaryEl.textContent = 'Ready to run';
    if (reportsHistoryEl && reportsHistoryEl.children.length > 0) {
        categorySummaryEl.textContent = 'Previous run reports are listed below.';
    } else {
        categorySummaryEl.textContent = 'No tests run yet.';
    }
}

if (modeSelectEl) {
    // Keep guide text synced whenever the learner changes modes.
    modeSelectEl.addEventListener('change', function () {
        TEST_MODE = modeSelectEl.value || 'math';
        renderModeGuide(TEST_MODE);
    });
}

// First paint: sync mode guide text and status with default mode.
renderModeGuide(TEST_MODE);
setIdleState();

runBtn.addEventListener('click', runAllTests);
