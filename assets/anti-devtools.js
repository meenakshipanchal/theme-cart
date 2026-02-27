/**
 * Anti-DevTools Protection Script
 * Blocks: Right-click, F12, Ctrl+Shift+I/J/C, Ctrl+U, Cmd+Option+I/J/C (Mac)
 * Disables: Text selection (except inputs), Drag & drop
 * Detects: DevTools open via debugger/timing — replaces page with Access Denied
 *
 * NOTE: This runs only in production (guarded by request.design_mode in Liquid).
 */
(function () {
  'use strict';

  // ========================
  // 1. BLOCK KEYBOARD SHORTCUTS
  // ========================
  document.addEventListener('keydown', function (e) {
    // F12
    if (e.key === 'F12' || e.keyCode === 123) {
      e.preventDefault();
      e.stopPropagation();
      return false;
    }

    // Ctrl+Shift+I (DevTools)
    // Ctrl+Shift+J (Console)
    // Ctrl+Shift+C (Element picker)
    if (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i' || e.keyCode === 73)) {
      e.preventDefault(); e.stopPropagation(); return false;
    }
    if (e.ctrlKey && e.shiftKey && (e.key === 'J' || e.key === 'j' || e.keyCode === 74)) {
      e.preventDefault(); e.stopPropagation(); return false;
    }
    if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c' || e.keyCode === 67)) {
      e.preventDefault(); e.stopPropagation(); return false;
    }

    // Ctrl+U (View Source)
    if (e.ctrlKey && !e.shiftKey && !e.altKey && (e.key === 'U' || e.key === 'u' || e.keyCode === 85)) {
      e.preventDefault(); e.stopPropagation(); return false;
    }

    // Mac: Cmd+Option+I / Cmd+Option+J / Cmd+Option+C
    if (e.metaKey && e.altKey && (e.key === 'I' || e.key === 'i' || e.keyCode === 73)) {
      e.preventDefault(); e.stopPropagation(); return false;
    }
    if (e.metaKey && e.altKey && (e.key === 'J' || e.key === 'j' || e.keyCode === 74)) {
      e.preventDefault(); e.stopPropagation(); return false;
    }
    if (e.metaKey && e.altKey && (e.key === 'C' || e.key === 'c' || e.keyCode === 67)) {
      e.preventDefault(); e.stopPropagation(); return false;
    }

    // Cmd+U (View Source on Mac)
    if (e.metaKey && !e.shiftKey && !e.altKey && (e.key === 'U' || e.key === 'u' || e.keyCode === 85)) {
      e.preventDefault(); e.stopPropagation(); return false;
    }
  }, true); // useCapture = true to intercept before anything else

  // ========================
  // 2. BLOCK RIGHT-CLICK (Context Menu)
  // ========================
  document.addEventListener('contextmenu', function (e) {
    e.preventDefault();
    return false;
  }, true);

  // ========================
  // 3. DISABLE TEXT SELECTION (except input/textarea fields)
  // ========================
  var selectionCSS = document.createElement('style');
  selectionCSS.textContent =
    '*:not(input):not(textarea):not([contenteditable="true"]) {' +
    '  -webkit-user-select: none !important;' +
    '  -moz-user-select: none !important;' +
    '  -ms-user-select: none !important;' +
    '  user-select: none !important;' +
    '}' +
    'input, textarea, [contenteditable="true"] {' +
    '  -webkit-user-select: text !important;' +
    '  -moz-user-select: text !important;' +
    '  -ms-user-select: text !important;' +
    '  user-select: text !important;' +
    '}';
  document.head.appendChild(selectionCSS);

  // ========================
  // 4. DISABLE DRAG & DROP
  // ========================
  document.addEventListener('dragstart', function (e) {
    e.preventDefault();
    return false;
  }, true);

  document.addEventListener('drop', function (e) {
    e.preventDefault();
    return false;
  }, true);

  // ========================
  // 5. DEVTOOLS OPEN DETECTION
  //    Uses debugger timing + outer/inner size diff
  //    If detected → kill session, show Access Denied
  // ========================
  var _accessDeniedShown = false;

  function showAccessDenied() {
    if (_accessDeniedShown) return;
    _accessDeniedShown = true;

    // Nuke the entire page
    document.documentElement.innerHTML = '';

    // Build the Access Denied screen
    var html = document.createElement('html');
    var head = document.createElement('head');
    var meta = document.createElement('meta');
    meta.setAttribute('name', 'viewport');
    meta.setAttribute('content', 'width=device-width, initial-scale=1');
    head.appendChild(meta);

    var style = document.createElement('style');
    style.textContent =
      '* { margin: 0; padding: 0; box-sizing: border-box; }' +
      'body {' +
      '  display: flex; align-items: center; justify-content: center;' +
      '  min-height: 100vh; background: #0a0a0a; color: #ff3b3b;' +
      '  font-family: "Courier New", monospace; text-align: center;' +
      '  padding: 20px;' +
      '}' +
      '.denied-container { max-width: 500px; }' +
      '.denied-icon { font-size: 80px; margin-bottom: 20px; }' +
      '.denied-title { font-size: 36px; font-weight: bold; margin-bottom: 16px; letter-spacing: 3px; }' +
      '.denied-msg { font-size: 16px; color: #ff6b6b; line-height: 1.6; margin-bottom: 30px; }' +
      '.denied-code { font-size: 12px; color: #555; }';
    head.appendChild(style);

    var body = document.createElement('body');
    body.innerHTML =
      '<div class="denied-container">' +
      '  <div class="denied-icon">&#9888;</div>' +
      '  <div class="denied-title">Inspect Not Allowed</div>' +
      '  <div class="denied-msg">' +
      '    Unauthorized developer tools access detected.<br>' +
      '    This session has been terminated.<br><br>' +
      '    If you believe this is an error, please close DevTools and refresh the page.' +
      '  </div>' +
      '  <div class="denied-code">ERR_DEVTOOLS_BLOCKED :: SESSION_KILLED</div>' +
      '</div>';

    html.appendChild(head);
    html.appendChild(body);
    document.replaceChild(html, document.documentElement);

    // Block all further keyboard input on the killed page
    document.addEventListener('keydown', function (ev) {
      ev.preventDefault(); ev.stopPropagation(); return false;
    }, true);
    document.addEventListener('contextmenu', function (ev) {
      ev.preventDefault(); return false;
    }, true);
  }

  // --- Detection Method 1: debugger statement timing ---
  // When DevTools is open, the `debugger` statement pauses execution,
  // causing a measurable delay.
  function checkDebuggerTiming() {
    var start = performance.now();
    (function () {
      // This debugger statement will pause if DevTools is open
      // eslint-disable-next-line no-debugger
      debugger;
    })();
    var end = performance.now();
    // If the debugger paused for more than 100ms, DevTools is likely open
    if (end - start > 100) {
      showAccessDenied();
    }
  }

  // --- Detection Method 2: window size discrepancy ---
  // When DevTools is docked, outer size stays the same but inner size shrinks.
  function checkSizeDiscrepancy() {
    var widthDiff = window.outerWidth - window.innerWidth;
    var heightDiff = window.outerHeight - window.innerHeight;
    // Threshold of 200px accounts for browser chrome/toolbars
    if (widthDiff > 200 || heightDiff > 200) {
      showAccessDenied();
    }
  }

  // --- Detection Method 3: console.log toString trick ---
  // When DevTools console is open, logged objects get their toString() called.
  var _devtoolsElement = new Image();
  Object.defineProperty(_devtoolsElement, 'id', {
    get: function () {
      showAccessDenied();
    }
  });

  // Run periodic checks
  setInterval(function () {
    checkDebuggerTiming();
    checkSizeDiscrepancy();
    // The console.log trick — only triggers when console is actually open and rendering
    console.log('%c', _devtoolsElement);
    // Clear console to avoid clutter
    console.clear();
  }, 1500);

  // Run initial check after page load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      checkSizeDiscrepancy();
    });
  } else {
    checkSizeDiscrepancy();
  }
})();
