var BlocklyGames = {};

/**
 * Is the site being served as raw HTML files, as opposed to on App Engine.
 * @type boolean
 */
BlocklyGames.IS_HTML = /\.html$/.test(window.location.pathname);

/**
 * 'document.getElementById' can't be compressed by the compiler,
 * so centralize all such calls here.  Saves 1-2 KB per game.
 */
BlocklyGames.getElementById = document.getElementById.bind(document);

/**
 * Extracts a parameter from the URL.
 * If the parameter is absent default_value is returned.
 * @param {string} name The name of the parameter.
 * @param {string} defaultValue Value to return if parameter not found.
 * @returns {string} The parameter value or the default value if not found.
 */
BlocklyGames.getStringParamFromUrl = function(name, defaultValue) {
  const val =
      window.location.search.match(new RegExp('[?&]' + name + '=([^&]+)'));
  return val ? decodeURIComponent(val[1].replace(/\+/g, '%20')) : defaultValue;
};

/**
 * Extracts an integer parameter from the URL.
 * If the parameter is absent or less than min_value, min_value is
 * returned.  If it is greater than max_value, max_value is returned.
 * @param {string} name The name of the parameter.
 * @param {number} minValue The minimum legal value.
 * @param {number} maxValue The maximum legal value.
 * @returns {number} A number in the range [min_value, max_value].
 */
BlocklyGames.getIntegerParamFromUrl = function(name, minValue, maxValue) {
  const val = Math.floor(Number(BlocklyGames.getStringParamFromUrl(name, 'NaN')));
  return isNaN(val) ? minValue : Math.max(minValue, Math.min(val, maxValue));
};

/**
 * Name of app ('maze', ...) for use in local storage.
 * @type string
 */
BlocklyGames.storageName;

BlocklyGames.LEVEL = 1;
BlocklyGames.MAX_LEVEL = 3;

/**
 * Common startup tasks for all apps.
 * @param {string} title Text for the page title.
 */
BlocklyGames.init = function(title) {
  document.title = "Code Tutor Maze" +
      (title && ' : ') + title;

  // Fixes viewport for small screens.
  const viewport = document.querySelector('meta[name="viewport"]');
  if (viewport && screen.availWidth < 725) {
    viewport.setAttribute('content',
        'width=725, initial-scale=.35, user-scalable=no');
  }
};

/**
 * Once the page is fully loaded, move the messages to their expected locations,
 * then call the game's init function.
 * @param {!Function} init Initialization function to call.
 */
BlocklyGames.callWhenLoaded = function(init) {
  function go() {
    // if (!window['BlocklyGamesMsg']) {
    //   // Messages haven't arrived yet.  Try again later.
    //   setTimeout(go, 99);
    //   return;
    // }
    // if (window['BlocklyMsg']) {
    //   Blockly.Msg = window['BlocklyMsg'];
    // }
    init();
  }

  window.addEventListener('load', go);
};

/**
 * Attempt to fetch the saved blocks for a level.
 * May be used to simply determine if a level is complete.
 * @param {string} name Name of app (maze, bird, ...).
 * @param {number} level Level (1-10).
 * @returns {string|undefined} Serialized XML, or undefined.
 */
BlocklyGames.loadFromLocalStorage = function(name, level) {
  let xml;
  try {
    xml = window.localStorage[name + level];
  } catch (e) {
    // Firefox sometimes throws a SecurityError when accessing localStorage.
    // Restarting Firefox fixes this, so it looks like a bug.
  }
  return xml;
};

/**
 * Bind a function to a button's click event.
 * On touch-enabled browsers, ontouchend is treated as equivalent to onclick.
 * @param {Element|string} el Button element or ID thereof.
 * @param {!Function} func Event handler to bind.
 */
BlocklyGames.bindClick = function(el, func) {
  if (!el) {
    throw TypeError('Element not found: ' + el);
  }
  if (typeof el === 'string') {
    el = BlocklyGames.getElementById(el);
  }
  el.addEventListener('click', func, true);
  function touchFunc(e) {
    // Prevent code from being executed twice on touchscreens.
    e.preventDefault();
    func(e);
  }
  el.addEventListener('touchend', touchFunc, true);
};

/**
 * Normalizes an angle to be in range [0-360]. Angles outside this range will
 * be normalized to be the equivalent angle with that range.
 * @param {number} angle Angle in degrees.
 * @returns {number} Standardized angle.
 */
BlocklyGames.normalizeAngle = function(angle) {
  angle %= 360;
  if (angle < 0) {
    angle += 360;
  }
  return angle;
};

/**
 * Escape HTML to make the text safe.
 * @param {string} text Unsafe text, possibly with HTML tags.
 * @returns {string} Safe text, with <>&'" escaped.
 */
BlocklyGames.esc = function(text) {
  return text.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
};

export default BlocklyGames;
