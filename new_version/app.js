// -------------------------------
// Basic input/display helpers
// -------------------------------

function inputText(val) {
	var ele = document.getElementById('input');
	var ori = ele.textContent || '';
	ele.textContent = ori + val;
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

	// Operator keys.
	if (key === '+' || key === '-' || key === '*' || key === '/' || key === '.') {
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

// -------------------------------
// Validation helpers
// -------------------------------

function verify(ori) {
	if (!ori || !ori.trim()) {
		return false;
	}

	// Cannot start with . / * or multiple signs like -- at the beginning.
	if (startWithSymbol(ori)) {
		return false;
	}

	// Cannot end with an operator or dot.
	if (endWithSymbol(ori)) {
		return false;
	}

	// Block invalid repeated symbols like **, //, .., +++, ---.
	if (continuousSymbol(ori)) {
		return false;
	}

	// Each parsed number part must be a real number.
	var num_arr = getPureNumAry(ori);
	if (num_arr.length === 0 || !allNum(num_arr)) {
		return false;
	}

	return true;
}

function startWithSymbol(ori) {
	var re = new RegExp('^[\\.|\\/|\\*]|^([+|-]){2,}');
	return re.test(ori);
}

function endWithSymbol(ori) {
	var re = new RegExp('[\\.|\\/|\\*|+|-]$');
	return re.test(ori);
}

function continuousSymbol(ori) {
	var re = new RegExp('([\\*|\\/|.]{2,})|([+|-]){3,}');
	return re.test(ori);
}

function getPureNumAry(ori) {
	var tmp = '';
	var ary = [];

	for (var i = 0; i < ori.length; i++) {
		if (i === ori.length - 1) {
			tmp += ori[i];
			ary.push(tmp);
		} else if (isNaN(ori[i]) && ori[i] !== '.') {
			ary.push(tmp);
			tmp = '';
		} else {
			tmp += ori[i];
		}
	}

	return ary;
}

function allNum(num_arr) {
	for (var i = 0; i < num_arr.length; i++) {
		// Empty fragments can appear around unary signs (example: 2*-3),
		// so we only reject true non-number fragments.
		if (isNaN(num_arr[i])) {
			return false;
		}
	}
	return true;
}

// -------------------------------
// Expression parsing helpers
// -------------------------------

// Parse numbers and keep leading signs attached (for example: -3 in 2*-3).
function getNumAry(ori) {
	var tmp = '';
	var ary = [];
	var attach_sym = false;

	for (var i = 0; i < ori.length; i++) {
		if (i === 0 && isNaN(ori[i])) {
			attach_sym = true;
		} else if (ori.length > 2 && isNaN(ori[i - 1]) && isNaN(ori[i])) {
			attach_sym = true;
		} else {
			attach_sym = false;
		}

		if (attach_sym || ori[i] === '.') {
			tmp += ori[i];
			continue;
		}

		if (i === ori.length - 1) {
			tmp += ori[i];
			ary.push(tmp);
		} else if (isNaN(ori[i]) && !attach_sym) {
			ary.push(tmp);
			tmp = '';
		} else if (!isNaN(ori[i])) {
			tmp += ori[i];
		}
	}

	return ary;
}

// Parse operators only (+ - * /).
function getSymAry(ori) {
	var ary = [];

	for (var i = 0; i < ori.length; i++) {
		if (i === 0) {
			continue;
		} else if (ori.length > 2 && isNaN(ori[i - 1]) && isNaN(ori[i])) {
			continue;
		} else if (isNaN(ori[i]) && ori[i] !== '.') {
			ary.push(ori[i]);
		}
	}

	return ary;
}

// -------------------------------
// Core calculator engine
// -------------------------------

function evaluateExpression(expression) {
	if (!verify(expression)) {
		throw new Error('Invalid expression');
	}

	var numTexts = getNumAry(expression);
	var sym_arr = getSymAry(expression);

	var numbers = [];
	for (var i = 0; i < numTexts.length; i++) {
		numbers.push(parseFloat(numTexts[i]));
	}

	// If no operator exists, return the single number directly.
	if (sym_arr.length === 0) {
		return numbers[0];
	}

	// Step 1: resolve multiplication/division first.
	var workingNumbers = numbers.slice();
	var workingSymbols = sym_arr.slice();
	var idx = 0;

	while (idx < workingSymbols.length) {
		var op = workingSymbols[idx];

		if (op === '*' || op === '/') {
			var left = workingNumbers[idx];
			var right = workingNumbers[idx + 1];
			var value;

			if (op === '/') {
				if (right === 0) {
					throw new Error('Cannot divide by zero');
				}
				value = left / right;
			} else {
				value = left * right;
			}

			if (!isFinite(value)) {
				throw new Error('Math result is not finite');
			}

			workingNumbers.splice(idx, 2, value);
			workingSymbols.splice(idx, 1);
			continue;
		}

		idx++;
	}

	// Step 2: resolve remaining addition/subtraction from left to right.
	var ans = workingNumbers[0];
	for (var j = 0; j < workingSymbols.length; j++) {
		if (workingSymbols[j] === '+') {
			ans = ans + workingNumbers[j + 1];
		} else if (workingSymbols[j] === '-') {
			ans = ans - workingNumbers[j + 1];
		}

		if (!isFinite(ans)) {
			throw new Error('Math result is not finite');
		}
	}

	return ans;
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
