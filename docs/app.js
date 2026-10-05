// -------------------------------
// Basic input/display helpers
// -------------------------------

function inputText(val) {
	var ele = document.getElementById('input');
	var ori = ele.textContent || '';
	var displayVal = val === '*' ? 'x' : val;
	ele.textContent = ori + displayVal;
}

function clearText() {
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

// Map keyboard keys to the same behavior as clicking calculator buttons.
function handleCalculatorKeydown(event) {
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
	if (typeof document === 'undefined' || !document.addEventListener) {
		return;
	}

	document.addEventListener('keydown', handleCalculatorKeydown);
}

initKeyboardControls();

// Keep calculator layout responsive to manual-test panel collapsed/open state.
function syncManualTestsPanelLayout() {
	var page = document.querySelector('.calculator-page');
	var panel = document.querySelector('.manual-tests');

	if (!page || !panel) {
		return;
	}

	if (panel.open) {
		page.classList.remove('manual-tests-collapsed');
	} else {
		page.classList.add('manual-tests-collapsed');
	}
}

function initManualTestsPanelLayout() {
	if (typeof document === 'undefined' || !document.querySelector) {
		return;
	}

	var panel = document.querySelector('.manual-tests');
	if (!panel || !panel.addEventListener) {
		return;
	}

	syncManualTestsPanelLayout();
	panel.addEventListener('toggle', syncManualTestsPanelLayout);
}

initManualTestsPanelLayout();

// -------------------------------
// Validation helpers
// -------------------------------

function normalizeExpressionSymbols(expression) {
	return String(expression || '').replace(/[xX×]/g, '*');
}

function verify(ori) {
	if (!ori || !ori.trim()) {
		return false;
	}

	var compact = normalizeExpressionSymbols(ori).replace(/\s+/g, '');
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

function getPureNumAry(ori) {
	var compact = normalizeExpressionSymbols(ori).replace(/\s+/g, '');
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

function allNum(num_arr) {
	for (var i = 0; i < num_arr.length; i++) {
		if (num_arr[i] === '' || isNaN(num_arr[i])) {
			return false;
		}
	}
	return true;
}

// -------------------------------
// Expression parsing helpers
// -------------------------------

function isDigitChar(ch) {
	return ch >= '0' && ch <= '9';
}

// Tokenize into numbers and symbols: + - * / ( )
function tokenizeExpression(expression) {
	var tokens = [];
	var i = 0;

	while (i < expression.length) {
		var ch = expression[i];

		if (isDigitChar(ch) || ch === '.') {
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
	var compact = normalizeExpressionSymbols(ori).replace(/\s+/g, '');
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

// Extract binary operators only (+ - * /) for compatibility.
function getSymAry(ori) {
	var compact = normalizeExpressionSymbols(ori).replace(/\s+/g, '');
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
// Core calculator engine
// -------------------------------

function evaluateExpression(expression) {
	if (!verify(expression)) {
		throw new Error('Invalid expression');
	}

	var compact = normalizeExpressionSymbols(expression).replace(/\s+/g, '');
	var tokens = tokenizeExpression(compact);
	validateTokens(tokens);

	return evaluateTokens(tokens);
}

function getOperatorPrecedence(operator) {
	if (operator === 'u+' || operator === 'u-') {
		return 3;
	}

	if (operator === '*' || operator === '/') {
		return 2;
	}

	return 1;
}

function isRightAssociativeOperator(operator) {
	return operator === 'u+' || operator === 'u-';
}

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
	var values = [];
	var operators = [];
	var expectValue = true;

	for (var i = 0; i < tokens.length; i++) {
		var token = tokens[i];

		if (token.type === 'number') {
			if (!expectValue) {
				throw new Error('Invalid expression');
			}

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
// Main action for "=" button
// -------------------------------

function calculate() {
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
