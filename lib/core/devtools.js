/* See license.txt for terms of usage */

"use strict";

const { Cu } = require("chrome");

try {
  // New devtools modules path. See also:
  // * https://wiki.mozilla.org/DevTools/Hacking
  // * https://github.com/jryans/devtools-migrate/blob/master/README.md
  // * https://developer.mozilla.org/en-US/docs/Tools/Contributing
  exports.devtools = Cu.import("resource://gre/modules/devtools/shared/Loader.jsm", {}).devtools;
  exports.makeInfallible = exports.devtools["require"]("devtools/shared/DevToolsUtils.js").makeInfallible;
  exports.gDevTools = Cu.import("resource:///modules/devtools/client/framework/gDevTools.jsm").gDevTools;

} catch(e) {
  exports.devtools = Cu.import("resource://gre/modules/devtools/Loader.jsm", {}).devtools;
  exports.makeInfallible = exports.devtools["require"]("devtools/toolkit/DevToolsUtils.js").makeInfallible;
  exports.gDevTools = Cu.import("resource:///modules/devtools/gDevTools.jsm", {}).gDevTools;
}
