/* See license.txt for terms of usage */

"use strict";

const { Cu } = require("chrome");

try {
  // New devtools modules path. See also:
  // * https://wiki.mozilla.org/DevTools/Hacking
  // * https://github.com/jryans/devtools-migrate/blob/master/README.md
  // * https://developer.mozilla.org/en-US/docs/Tools/Contributing
  exports.devtools = Cu.import("resource://gre/modules/devtools/shared/Loader.jsm", {});
  exports.makeInfallible = exports.devtools["require"]("devtools/shared/DevToolsUtils.js");
  exports.gDevTools = Cu.import("resource:///modules/devtools/client/framework/gDevTools.jsm")

} catch(e) {
  // Old devtools modules path
  exports.devtools = Cu.import("resource://gre/modules/devtools/Loader.jsm", {});
  exports.makeInfallible = exports.devtools["require"]("devtools/toolkit/DevToolsUtils.js");
  exports.gDevTools = Cu.import("resource:///modules/devtools/gDevTools.jsm", {});
}
