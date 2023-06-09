import Blockly from "blockly";
import BlocklyGames from "./lib-games";

var BlocklyDialogs = {};

/**
 * Is the dialog currently onscreen?
 * @private
 */
BlocklyDialogs.isDialogVisible_ = false;

/**
 * A closing dialog should animate towards this element.
 * @type Element
 * @private
 */
BlocklyDialogs.dialogOrigin_ = null;

/**
 * A function to call when a dialog closes.
 * @type Function
 * @private
 */
BlocklyDialogs.dialogDispose_ = null;

/**
 * Binding data that can be passed to unbind.
 * @type Blockly.browserEvents.Data
 * @private
 */
BlocklyDialogs.dialogMouseDownWrapper_ = null;

/**
 * Binding data that can be passed to unbind.
 * @type Blockly.browserEvents.Data
 * @private
 */
BlocklyDialogs.dialogMouseUpWrapper_ = null;

/**
 * Binding data that can be passed to unbind.
 * @type Blockly.browserEvents.Data
 * @private
 */
BlocklyDialogs.dialogMouseMoveWrapper_ = null;

/**
 * Show the dialog pop-up.
 * @param {Element} content DOM element to display in the dialog.
 * @param {Element} origin Animate the dialog opening/closing from/to this
 *     DOM element.  If null, don't show any animations for opening or closing.
 * @param {boolean} animate Animate the dialog opening (if origin not null).
 * @param {boolean} modal If true, grey out background and prevent interaction.
 * @param {!Object} style A dictionary of style rules for the dialog.
 * @param {Function} disposeFunc An optional function to call when the dialog
 *     closes.  Normally used for unhooking events.
 */
BlocklyDialogs.showDialog = function(content, origin, animate, modal, style,
                                     disposeFunc) {
  if (!content) {
    throw TypeError('Content not found: ' + content);
  }
  const buttons = content.getElementsByClassName('addHideHandler');
  var button;
  while ((button = buttons[0])) {
    button.addEventListener('click', BlocklyDialogs.hideDialog, true);
    button.addEventListener('touchend', BlocklyDialogs.hideDialog, true);
    button.classList.remove('addHideHandler');
  }
  if (BlocklyDialogs.isDialogVisible_) {
    BlocklyDialogs.hideDialog(false);
  }
  if (Blockly.getMainWorkspace()) {
    // Some levels have an editor instead of Blockly.
    Blockly.hideChaff(true);
  }
  BlocklyDialogs.isDialogVisible_ = true;
  BlocklyDialogs.dialogOrigin_ = origin;
  BlocklyDialogs.dialogDispose_ = disposeFunc;
  const dialog = BlocklyGames.getElementById('dialog');
  const shadow = BlocklyGames.getElementById('dialogShadow');
  const border = BlocklyGames.getElementById('dialogBorder');

  // Copy all the specified styles to the dialog.
  for (const name in style) {
    dialog.style[name] = style[name];
  }
  if (modal) {
    shadow.style.visibility = 'visible';
    shadow.style.opacity = 0.3;
    shadow.style.zIndex = 9;
  }
  dialog.appendChild(content);
  content.classList.remove('dialogHiddenContent');

  function endResult() {
    // Check that the dialog wasn't closed during opening.
    if (!BlocklyDialogs.isDialogVisible_) {
      return;
    }
    dialog.style.visibility = 'visible';
    dialog.style.zIndex = 100;
    border.style.visibility = 'hidden';
  }
  // The origin (if it exists) might be a button we should lose focus on.
  try {
    origin.blur();
  } catch(e) {}

  if (animate && origin) {
    BlocklyDialogs.matchBorder_(origin, false, 0.2);
    BlocklyDialogs.matchBorder_(dialog, true, 0.8);
    // In 175ms show the dialog and hide the animated border.
    setTimeout(endResult, 175);
  } else {
    // No animation.  Just set the final state.
    endResult();
  }
};

/**
 * Hide the dialog pop-up.
 * @param {boolean} opt_animate Animate the dialog closing.  Defaults to true.
 *     Requires that origin was not null when dialog was opened.
 */
BlocklyDialogs.hideDialog = function(opt_animate = true) {
  if (!BlocklyDialogs.isDialogVisible_) {
    return;
  }
  if (BlocklyDialogs.dialogMouseDownWrapper_) {
    Blockly.browserEvents.unbind(BlocklyDialogs.dialogMouseDownWrapper_);
    BlocklyDialogs.dialogMouseDownWrapper_ = null;
  }

  BlocklyDialogs.isDialogVisible_ = false;
  BlocklyDialogs.dialogDispose_ && BlocklyDialogs.dialogDispose_();
  BlocklyDialogs.dialogDispose_ = null;
  const origin = opt_animate ? BlocklyDialogs.dialogOrigin_ : null;
  const dialog = BlocklyGames.getElementById('dialog');
  const shadow = BlocklyGames.getElementById('dialogShadow');

  shadow.style.opacity = 0;

  function endResult() {
    shadow.style.zIndex = -1;
    shadow.style.visibility = 'hidden';
    const border = BlocklyGames.getElementById('dialogBorder');
    border.style.visibility = 'hidden';
  }
  if (origin && dialog) {
    BlocklyDialogs.matchBorder_(dialog, false, 0.8);
    BlocklyDialogs.matchBorder_(origin, true, 0.2);
    // In 175ms hide both the shadow and the animated border.
    setTimeout(endResult, 175);
  } else {
    // No animation.  Just set the final state.
    endResult();
  }
  dialog.style.visibility = 'hidden';
  dialog.style.zIndex = -1;
  while (dialog.firstChild) {
    const content = dialog.firstChild;
    content.classList.add('dialogHiddenContent');
    document.body.appendChild(content);
  }
};

/**
 * Match the animated border to the a element's size and location.
 * @param {!Element} element Element to match.
 * @param {boolean} animate Animate to the new location.
 * @param {number} opacity Opacity of border.
 * @private
 */
BlocklyDialogs.matchBorder_ = function(element, animate, opacity) {
  if (!element) {
    return;
  }
  const border = BlocklyGames.getElementById('dialogBorder');
  const bBox = BlocklyDialogs.getBBox(element);
  function change() {
    border.style.width = bBox.width + 'px';
    border.style.height = bBox.height + 'px';
    border.style.left = bBox.x + 'px';
    border.style.top = bBox.y + 'px';
    border.style.opacity = opacity;
  }
  if (animate) {
    border.className = 'dialogAnimate';
    setTimeout(change, 1);
  } else {
    border.className = '';
    change();
  }
  border.style.visibility = 'visible';
};

/**
 * Compute the absolute coordinates and dimensions of an HTML or SVG element.
 * @param {!Element} element Element to match.
 * @returns {!Object} Contains height, width, x, and y properties.
 */
BlocklyDialogs.getBBox = function(element) {
  const xy = Blockly.utils.style.getPageOffset(element);
  const box = {
    x: xy.x,
    y: xy.y,
  };
  if (element.getBBox) {
    // SVG element.
    const bBox = element.getBBox();
    box.height = bBox.height;
    box.width = bBox.width;
  } else {
    // HTML element.
    box.height = element.offsetHeight;
    box.width = element.offsetWidth;
  }
  return box;
};

/**
 * Display a storage-related modal dialog.
 * @param {?Element} origin Source of dialog opening animation.
 * @param {string} message Text to alert.
 */
BlocklyDialogs.storageAlert = function(origin, message) {
  const container = BlocklyGames.getElementById('containerStorage');
  container.textContent = '';
  const lines = message.split('\n');
  for (const line of lines) {
    const p = document.createElement('p');
    p.appendChild(document.createTextNode(line));
    container.appendChild(p);
  }

  const content = BlocklyGames.getElementById('dialogStorage');
  BlocklyDialogs.showDialog(content, origin, true, true, null,
      BlocklyDialogs.stopDialogKeyDown);
  BlocklyDialogs.startDialogKeyDown();
};

/**
 * If the user presses enter, escape, or space, hide the dialog.
 * @param {!Event} e Keyboard event.
 */
BlocklyDialogs.dialogKeyDown = function(e) {
  if (BlocklyDialogs.isDialogVisible_) {
    if (e.keyCode === 13 || e.keyCode === 27 || e.keyCode === 32) {
      BlocklyDialogs.hideDialog(true);
      e.stopPropagation();
      e.preventDefault();
    }
  }
};

/**
 * Start listening for BlocklyDialogs.dialogKeyDown.
 */
BlocklyDialogs.startDialogKeyDown = function() {
  document.body.addEventListener('keydown',
      BlocklyDialogs.dialogKeyDown, true);
};

/**
 * Stop listening for BlocklyDialogs.dialogKeyDown.
 */
BlocklyDialogs.stopDialogKeyDown = function() {
  document.body.removeEventListener('keydown',
      BlocklyDialogs.dialogKeyDown, true);
};

/**
 * If the user presses enter, escape, or space, hide the dialog.
 * Enter and space move to the index page, escape does not.
 * @param {!Event} e Keyboard event.
 * @private
 */
BlocklyDialogs.abortKeyDown_ = function(e) {
  BlocklyDialogs.dialogKeyDown(e);
  if (e.keyCode === 13 || e.keyCode === 32) {
    BlocklyInterface.indexPage();
  }
};

// Export symbols that would otherwise be renamed by Closure compiler.
window['BlocklyDialogs'] = BlocklyDialogs;

export default BlocklyDialogs;
