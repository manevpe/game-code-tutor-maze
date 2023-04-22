import BlocklyInterface from "./lib-interface";
import BlocklyGames from "./lib-games";
import BlocklyDialogs from "./lib-dialogs";

import {javascriptGenerator} from 'blockly/javascript';


var BlocklyCode = {};

/**
 * User's JavaScript code from previous execution.
 * @type string
 */
BlocklyCode.executedJsCode = "";

/**
 * Get the user's executable code as JS from the editor (Blockly or ACE).
 * @returns {string} JS code.
 */
BlocklyCode.getJsCode = function () {
  if (BlocklyInterface.blocksDisabled) {
    // Text editor.
    return BlocklyInterface.editor["getValue"]();
  }
  // Blockly editor.
  return javascriptGenerator.workspaceToCode(BlocklyInterface.workspace);
};

/**
 * Highlight the block (or clear highlighting).
 * @param {?string} id ID of block that triggered this action.
 * @param {boolean=} opt_state If undefined, highlight specified block and
 * automatically unhighlight all others.  If true or false, manually
 * highlight/unhighlight the specified block.
 */
BlocklyCode.highlight = function (id, opt_state) {
  if (id) {
    const m = id.match(/^block_id_([^']+)$/);
    if (m) {
      id = m[1];
    }
  }
  BlocklyInterface.workspace.highlightBlock(id, opt_state);
};

/**
 * Convert the user's code to raw JavaScript.
 * @param {string} code Generated code.
 * @returns {string} The code without serial numbers.
 */
BlocklyCode.stripCode = function (code) {
  // Strip out serial numbers.
  code = code.replace(/(,\s*)?'block_id_[^']+'\)/g, ")");
  return code.replace(/\s+$/, "");
};

/**
 * Load the JavaScript interpreter.
 * Defer loading until page is loaded and responsive.
 */
BlocklyCode.importInterpreter = function () {
  function load() {
    //<script type="text/javascript"
    //  src="third-party/JS-Interpreter/compressed.js"></script>
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "assets/third-party/js-interpreter/interpreter.js";
    document.head.appendChild(script);
  }
  setTimeout(load, 1);
};

/**
 * Load the Prettify CSS and JavaScript.
 * Defer loading until page is loaded and responsive.
 */
BlocklyCode.importPrettify = function () {
  function load() {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.type = "text/css";
    link.href = "assets/third-party/prettify/prettify.css";
    document.head.appendChild(link);
    const script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "assets/third-party/prettify/prettify.js";
    document.head.appendChild(script);
  }
  setTimeout(load, 1);
};

/**
 * Congratulates the user for completing the level and offers to
 * direct them to the next level, if available.
 */
BlocklyCode.congratulations = function () {
  const content = BlocklyGames.getElementById("dialogDone");
  const style = {
    width: "40%",
    left: "30%",
    top: "3em",
  };

  // Add the user's code.
  if (BlocklyInterface.workspace) {
    const linesText = BlocklyGames.getElementById("dialogLinesText");
    linesText.textContent = "";
    let code = BlocklyCode.executedJsCode;
    code = BlocklyCode.stripCode(code);
    let noComments = code.replace(/\/\/[^\n]*/g, ""); // Inline comments.
    noComments = noComments.replace(/\/\*.*\*\//g, ""); /* Block comments. */
    noComments = noComments.replace(/[ \t]+\n/g, "\n"); // Trailing spaces.
    noComments = noComments.replace(/\n+/g, "\n"); // Blank lines.
    noComments = noComments.trim();
    const lineCount = noComments.split("\n").length;
    const pre = BlocklyGames.getElementById("containerCode");
    pre.textContent = code;
    if (typeof prettyPrintOne === "function") {
      code = pre.innerHTML;
      code = prettyPrintOne(code, "js");
      pre.innerHTML = code;
    }
    let locMsg;
    if (lineCount === 1) {
      locMsg = "You solved this level with 1 line of JavaScript:";
    } else {
      locMsg = "You solved this level with %1 lines of JavaScript:".replace(
        "%1",
        String(lineCount)
      );
    }
    linesText.appendChild(document.createTextNode(locMsg));
  }

  let levelMsg;
  if (BlocklyGames.LEVEL < BlocklyGames.MAX_LEVEL) {
    levelMsg = "Are you ready for level %1?".replace(
      "%1",
      String(BlocklyGames.LEVEL + 1)
    );
  } else {
    levelMsg = "Are you ready for the next challenge?";
  }

  const ok = BlocklyGames.getElementById("doneOk");
  ok.addEventListener("click", BlocklyInterface.nextLevel, true);
  ok.addEventListener("touchend", BlocklyInterface.nextLevel, true);

  BlocklyDialogs.showDialog(content, null, false, true, style, function () {
    document.body.removeEventListener(
      "keydown",
      BlocklyCode.congratulationsKeyDown_,
      true
    );
  });
  document.body.addEventListener(
    "keydown",
    BlocklyCode.congratulationsKeyDown_,
    true
  );

  BlocklyGames.getElementById("dialogDoneText").textContent = levelMsg;
};

/**
 * If the user presses enter, escape, or space, hide the dialog.
 * Enter and space move to the next level, escape does not.
 * @param {!Event} e Keyboard event.
 * @private
 */
BlocklyCode.congratulationsKeyDown_ = function (e) {
  BlocklyDialogs.dialogKeyDown(e);
  if (e.keyCode === 13 || e.keyCode === 32) {
    BlocklyInterface.nextLevel();
  }
};

export default BlocklyCode;
