// Frontend Calculator Roadmap
// 1) UI layer: reads/writes the display text in #input.
// 2) Event layer: keyboard + panel events call UI and calculate().
// 3) Validation/parsing layer: converts raw text into checked math pieces.
// 4) Engine layer: evaluates math pieces using value/operator stacks.
// 5) Presentation layer: formats floating-point output for display.
//
// Dependency direction (top-level idea):
// UI/Event -> Validation/Parsing -> Engine -> Result Formatting
//
// How this file cooperates with style.css:
// - This file writes text into #input (style.css controls how #input looks/wraps).
// - This file toggles class "manual-tests-collapsed" on .calculator-page.
// - style.css reacts to that class to change panel width and make the title vertical.
// - On small screens, style.css media queries turn that title back to horizontal.

// -------------------------------
// 1) UI display helpers
// -------------------------------

function inputText(val) {
	// The user may type "*", but we display "x" to look like a calculator key.
	// style.css #input rule controls right alignment, font size, and line wrapping.
	var ele = document.getElementById('input');
	var ori = ele.textContent || '';
	var displayVal = val === '*' ? 'x' : val;
	ele.textContent = ori + displayVal;
}

function clearText() {
	// Reset current expression shown on screen.
	// Visual effect is immediate because #input is a live DOM element on calculator.html.
	var ele = document.getElementById('input');
	ele.textContent = '';
}

// Remove one character, like a calculator backspace key.
function deleteLastChar() {
	var ele = document.getElementById('input');
	var current = ele.textContent || '';
	ele.textContent = current.slice(0, -1);
}

// Ignore keyboard shortcuts when user is typing in an input field.
function shouldIgnoreKeyboardEvent(event) {
	var target = event.target;
	if (!target) {
		return false;
	}

	var tag = target.tagName ? target.tagName.toLowerCase() : '';
	if (tag === 'input' || tag === 'textarea' || tag === 'select') {
		return true;
	}

	if (target.isContentEditable) {
		return true;
	}

	return false;
}

// -------------------------------
// 2) Event wiring helpers
// -------------------------------

// Map keyboard keys to the same behavior as clicking calculator buttons.
function handleCalculatorKeydown(event) {
	// Respect browser/system shortcuts like Ctrl+C, Cmd+V, Alt+...
	if (event.ctrlKey || event.metaKey || event.altKey) {
		return;
	}

	if (shouldIgnoreKeyboardEvent(event)) {
		return;
	}

	var key = event.key;

	// Number keys 0-9.
	if (/^[0-9]$/.test(key)) {
		inputText(key);
		event.preventDefault();
		return;
	}

	// Multiplication key: accept * or x, always display x.
	if (key === '*' || key === 'x' || key === 'X') {
		inputText('x');
		event.preventDefault();
		return;
	}

	// Other operator keys.
	if (key === '+' || key === '-' || key === '/' || key === '.' || key === '(' || key === ')') {
		inputText(key);
		event.preventDefault();
		return;
	}

	// Enter or = should calculate.
	if (key === 'Enter' || key === '=') {
		calculate();
		event.preventDefault();
		return;
	}

	// Backspace deletes one character.
	if (key === 'Backspace') {
		deleteLastChar();
		event.preventDefault();
		return;
	}

	// c/C/Escape clears expression.
	if (key === 'c' || key === 'C' || key === 'Escape') {
		clearText();
		event.preventDefault();
	}
}

function initKeyboardControls() {
	// Defensive checks keep this safe in non-browser environments.
	if (typeof document === 'undefined' || !document.addEventListener) {
		return;
	}

	// Keyboard events call UI helpers above, then CSS paints the updated text style.
	document.addEventListener('keydown', handleCalculatorKeydown);
}

// Keep calculator layout responsive to manual-test panel collapsed/open state.
// This is the key JS <-> CSS bridge for collapsed layout behavior.
function syncManualTestsPanelLayout() {
	var page = document.querySelector('.calculator-page');
	var panel = document.querySelector('.manual-tests');

	if (!page || !panel) {
		return;
	}

	if (panel.open) {
		// "open" means details panel expanded, so use normal two-column CSS layout.
		page.classList.remove('manual-tests-collapsed');
	} else {
		// Closed details -> add collapsed class that style.css uses for vertical summary mode.
		page.classList.add('manual-tests-collapsed');
	}
}

function initManualTestsPanelLayout() {
	// The test panel exists on calculator.html and emits native "toggle" when
	// users open/close <details>. We listen and then update CSS-driving class names.
	if (typeof document === 'undefined' || !document.querySelector) {
		return;
	}

	var panel = document.querySelector('.manual-tests');
	if (!panel || !panel.addEventListener) {
		return;
	}

	// Initialize once so first paint already matches open/closed panel state.
	syncManualTestsPanelLayout();
	// Re-sync every time summary is clicked.
	panel.addEventListener('toggle', syncManualTestsPanelLayout);
}

// -------------------------------
// 3) Validation and normalization helpers
// -------------------------------

function normalizeExpressionSymbols(expression) {
	// Accept user-facing multiply symbols and convert them to engine-friendly "*".
	return String(expression || '').replace(/[xX×]/g, '*');
}

function compactExpression(expression) {
	// Remove spaces so parser/evaluator logic can reason about one compact stream.
	return normalizeExpressionSymbols(expression).replace(/\s+/g, '');
}

function verify(ori) {
	var rawExpression = String(ori || '');
	if (!rawExpression.trim()) {
		return false;
	}

	var compact = compactExpression(rawExpression);
	if (!compact) {
		return false;
	}

	// Keep legacy guardrails for malformed symbol runs.
	if (startWithSymbol(compact)) {
		return false;
	}

	// Cannot end with an operator, opening parenthesis, or dot.
	if (endWithSymbol(compact)) {
		return false;
	}

	// Block invalid repeated symbols like **, //, .., +++, ---.
	if (continuousSymbol(compact)) {
		return false;
	}

	try {
		var tokens = tokenizeExpression(compact);
		validateTokens(tokens);
	} catch (error) {
		return false;
	}

	return true;
}

function startWithSymbol(ori) {
	var re = /^([./*]|[+\-]{2,})/;
	return re.test(ori);
}

function endWithSymbol(ori) {
	var re = /[./*+\-(]$/;
	return re.test(ori);
}

function continuousSymbol(ori) {
	var re = /(\*\*|\/\/|\.\.|[+\-]{3,})/;
	return re.test(ori);
}

// Shared extractor used by compatibility helpers below.
function extractRawNumberTokens(ori) {
	var compact = compactExpression(ori);
	if (!compact) {
		return [];
	}

	try {
		var tokens = tokenizeExpression(compact);
		var ary = [];

		for (var i = 0; i < tokens.length; i++) {
			if (tokens[i].type === 'number') {
				ary.push(tokens[i].raw);
			}
		}

		return ary;
	} catch (error) {
		return [];
	}
}

function getPureNumAry(ori) {
	return extractRawNumberTokens(ori);
}

function allNum(num_arr) {
	// A basic helper kept for backward compatibility with older test code.
	for (var i = 0; i < num_arr.length; i++) {
		if (num_arr[i] === '' || isNaN(num_arr[i])) {
			return false;
		}
	}
	return true;
}

// -------------------------------
// 4) Split expression into math pieces + grammar validation
// -------------------------------

function isDigitChar(ch) {
	return ch >= '0' && ch <= '9';
}

// Splitter: scan left-to-right and build a list of math pieces (numbers/symbols).
// Example "12.5*(3-1)" -> [12.5, *, (, 3, -, 1, )]
function tokenizeExpression(expression) {
	var tokens = [];
	var i = 0;

	while (i < expression.length) {
		var ch = expression[i];

		if (isDigitChar(ch) || ch === '.') {
			// Parse one full number piece (can include one decimal dot).
			var numberText = '';
			var hasDigit = false;
			var hasDot = false;

			while (i < expression.length) {
				ch = expression[i];

				if (isDigitChar(ch)) {
					numberText += ch;
					hasDigit = true;
					i++;
					continue;
				}

				if (ch === '.') {
					if (hasDot) {
						throw new Error('Invalid expression');
					}

					hasDot = true;
					numberText += ch;
					i++;
					continue;
				}

				break;
			}

			if (!hasDigit) {
				throw new Error('Invalid expression');
			}

			var parsedNumber = parseFloat(numberText);
			if (isNaN(parsedNumber)) {
				throw new Error('Invalid expression');
			}

			tokens.push({
				type: 'number',
				value: parsedNumber,
				raw: numberText
			});

			continue;
		}

		// Parse one symbol piece.
		if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '(' || ch === ')') {
			tokens.push({
				type: 'symbol',
				value: ch
			});
			i++;
			continue;
		}

		throw new Error('Invalid expression');
	}

	return tokens;
}

function isUnarySymbol(symbol) {
	return symbol === '+' || symbol === '-';
}

function validateTokens(tokens) {
	// In this function, the list variables represent math pieces.
	// Grammar state machine:
	// expectValue = true means next legal pieces are: number, "(", unary + or unary -.
	// expectValue = false means next legal pieces are: binary operator or ")".
	if (!tokens || tokens.length === 0) {
		throw new Error('Invalid expression');
	}

	var balance = 0;
	var expectValue = true;

	for (var i = 0; i < tokens.length; i++) {
		var token = tokens[i];

		if (token.type === 'number') {
			if (!expectValue) {
				throw new Error('Invalid expression');
			}

			expectValue = false;
			continue;
		}

		if (token.value === '(') {
			if (!expectValue) {
				throw new Error('Invalid expression');
			}

			balance++;
			expectValue = true;
			continue;
		}

		if (token.value === ')') {
			if (expectValue) {
				throw new Error('Invalid expression');
			}

			balance--;
			if (balance < 0) {
				throw new Error('Invalid expression');
			}

			expectValue = false;
			continue;
		}

		if (expectValue) {
			if (!isUnarySymbol(token.value)) {
				throw new Error('Invalid expression');
			}
		} else {
			expectValue = true;
		}
	}

	if (balance !== 0 || expectValue) {
		throw new Error('Invalid expression');
	}
}

// Extract numbers for compatibility with existing helper API.
function getNumAry(ori) {
	return extractRawNumberTokens(ori);
}

// Extract binary operators only (+ - * /) for compatibility.
function getSymAry(ori) {
	var compact = compactExpression(ori);
	if (!compact) {
		return [];
	}

	try {
		var tokens = tokenizeExpression(compact);
		var ary = [];

		for (var i = 0; i < tokens.length; i++) {
			if (tokens[i].type === 'symbol' && tokens[i].value !== '(' && tokens[i].value !== ')') {
				ary.push(tokens[i].value);
			}
		}

		return ary;
	} catch (error) {
		return [];
	}
}

// -------------------------------
// 5) Core calculator engine
// -------------------------------

function evaluateExpression(expression) {
	// Full pipeline: quick verify -> split into pieces -> validate grammar -> evaluate math.
	if (!verify(expression)) {
		throw new Error('Invalid expression');
	}

	var compact = compactExpression(expression);
	var tokens = tokenizeExpression(compact);
	validateTokens(tokens);

	return evaluateTokens(tokens);
}

function getOperatorPrecedence(operator) {
	// Unary signs should execute before * and /.
	if (operator === 'u+' || operator === 'u-') {
		return 3;
	}

	if (operator === '*' || operator === '/') {
		return 2;
	}

	return 1;
}

function isRightAssociativeOperator(operator) {
	// Unary operators associate right-to-left. Example: --5 means -( -5 ).
	return operator === 'u+' || operator === 'u-';
}

// Apply one operator from the operator stack to values in the value stack.
function applyTopOperator(values, operators) {
	if (operators.length === 0) {
		throw new Error('Invalid expression');
	}

	var op = operators.pop();

	if (op === 'u+' || op === 'u-') {
		if (values.length < 1) {
			throw new Error('Invalid expression');
		}

		var unaryValue = values.pop();
		var unaryAnswer = op === 'u-' ? -unaryValue : unaryValue;

		if (!isFinite(unaryAnswer)) {
			throw new Error('Math result is not finite');
		}

		values.push(unaryAnswer);
		return;
	}

	if (values.length < 2) {
		throw new Error('Invalid expression');
	}

	var right = values.pop();
	var left = values.pop();
	var answer;

	if (op === '+') {
		answer = left + right;
	} else if (op === '-') {
		answer = left - right;
	} else if (op === '*') {
		answer = left * right;
	} else if (op === '/') {
		if (right === 0) {
			throw new Error('Cannot divide by zero');
		}

		answer = left / right;
	} else {
		throw new Error('Invalid expression');
	}

	if (!isFinite(answer)) {
		throw new Error('Math result is not finite');
	}

	values.push(answer);
}

function evaluateTokens(tokens) {
	// This uses two stacks (a common expression-evaluation pattern):
	// - values: numbers
	// - operators: +, -, *, /, unary signs, and parentheses
	var values = [];
	var operators = [];
	var expectValue = true;

	for (var i = 0; i < tokens.length; i++) {
		var token = tokens[i];

		if (token.type === 'number') {
			if (!expectValue) {
				throw new Error('Invalid expression');
			}

			// Numbers go directly to the values stack.
			values.push(token.value);
			expectValue = false;
			continue;
		}

		var symbol = token.value;

		if (symbol === '(') {
			if (!expectValue) {
				throw new Error('Invalid expression');
			}

			operators.push(symbol);
			expectValue = true;
			continue;
		}

		if (symbol === ')') {
			if (expectValue) {
				throw new Error('Invalid expression');
			}

			while (operators.length > 0 && operators[operators.length - 1] !== '(') {
				applyTopOperator(values, operators);
			}

			if (operators.length === 0) {
				throw new Error('Invalid expression');
			}

			operators.pop();
			expectValue = false;
			continue;
		}

		var operator = symbol;
		if (expectValue) {
			if (!isUnarySymbol(operator)) {
				throw new Error('Invalid expression');
			}

			operator = 'u' + operator;
		}

		// Before pushing current operator, resolve stronger/equal-priority operators first.
		while (operators.length > 0 && operators[operators.length - 1] !== '(') {
			var topOperator = operators[operators.length - 1];
			var topPrecedence = getOperatorPrecedence(topOperator);
			var currentPrecedence = getOperatorPrecedence(operator);

			if (topPrecedence > currentPrecedence || (topPrecedence === currentPrecedence && !isRightAssociativeOperator(operator))) {
				applyTopOperator(values, operators);
				continue;
			}

			break;
		}

		operators.push(operator);
		expectValue = true;
	}

	if (expectValue) {
		throw new Error('Invalid expression');
	}

	while (operators.length > 0) {
		if (operators[operators.length - 1] === '(') {
			throw new Error('Invalid expression');
		}

		applyTopOperator(values, operators);
	}

	if (values.length !== 1) {
		throw new Error('Invalid expression');
	}

	return values[0];
}

// -------------------------------
// 6) Result formatting helpers
// -------------------------------

// Fix tiny floating-point noise for display only.
function normalizeFloatingError(value) {
	var nearestInt = Math.round(value);
	if (Math.abs(value - nearestInt) < 1e-12) {
		return nearestInt;
	}
	return value;
}

// Keep full precision internally, then format only when showing result.
function formatResult(value) {
	var normalized = normalizeFloatingError(value);
	return Number(normalized.toPrecision(15)).toString();
}

// -------------------------------
// 7) Main action used by "=" button and Enter key
// -------------------------------

function calculate() {
	// UI -> Engine -> Formatter, then write back to UI.
	// style.css #input styles make the resulting number readable on the screen.
	var ele = document.getElementById('input');
	var expression = ele.textContent || '';

	try {
		var numericAnswer = evaluateExpression(expression);
		ele.textContent = formatResult(numericAnswer);
	} catch (error) {
		if (error.message === 'Cannot divide by zero') {
			alert('Cannot divide by zero. Please clear and try a different expression.');
		} else {
			alert('Invalid expression. Please press C, then enter again.');
		}
	}
}

// -------------------------------
// 8) App bootstrap (runs once at file load)
// -------------------------------

function bootstrapCalculator() {
	// Startup order:
	// 1) keyboard wiring for calculator interaction
	// 2) panel-layout wiring so CSS classes reflect <details> state
	initKeyboardControls();
	initManualTestsPanelLayout();
}

bootstrapCalculator();
