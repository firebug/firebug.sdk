/* See license.txt for terms of usage */

"use strict";

const { Cu } = require("chrome");

// Support for new devtools modules path.
// See also:
// * https://wiki.mozilla.org/DevTools/Hacking
// * https://github.com/jryans/devtools-migrate/blob/master/README.md
// * https://developer.mozilla.org/en-US/docs/Tools/Contributing
// * https://bugzilla.mozilla.org/show_bug.cgi?id=912121
try {
  exports.devtools = Cu.import("resource://gre/modules/devtools/shared/Loader.jsm", {}).devtools;
  exports.DevToolsUtils = exports.devtools["require"]("devtools/shared/DevToolsUtils");
  exports.makeInfallible = exports.DevToolsUtils.makeInfallible;
  exports.gDevTools = Cu.import("resource:///modules/devtools/client/framework/gDevTools.jsm").gDevTools;
  exports.EventEmitter = exports.devtools["require"]("devtools/shared/event-emitter");
  exports.ToolSidebar = exports.devtools["require"]("devtools/client/framework/sidebar").ToolSidebar;
} catch(e) {
  exports.devtools = Cu.import("resource://gre/modules/devtools/Loader.jsm", {}).devtools;
  exports.DevToolsUtils = exports.devtools["require"]("devtools/toolkit/DevToolsUtils");
  exports.makeInfallible = exports.DevToolsUtils.makeInfallible;
  exports.gDevTools = Cu.import("resource:///modules/devtools/gDevTools.jsm", {}).gDevTools;
  exports.EventEmitter = exports.devtools["require"]("devtools/toolkit/event-emitter");
  exports.ToolSidebar = exports.devtools["require"]("devtools/framework/sidebar").ToolSidebar;
}

/**
 * Allows requiring a devtools module and specify alternative locations
 * to keep backward compatibility in case when the module location changes.
 * It helps Firebug to support multiple Firefox versions.
 *
 * @param {Object} devtools Reference to DevTools module.
 * @param {Array} locations List of URLs to try when importing the module.
 * @returns Scope of the imported module or an empty scope if module wasn't successfully loaded.
 */
exports.safeRequire = function(devtools, ...args) {
  for (var i=0; i<args.length; i++) {
    try {
      return devtools["require"](args[i]);
    }
    catch (err) {
    }
  }
  return {};
};

/**
 * Allows importing a JS module (Firefox platform) and specify alternative locations
 * to keep backward compatibility in case when the module location changes.
 * It helps Firebug to support multiple Firefox versions.
 *
 * @param {Array} locations List of URLs to try when importing the module.
 * @returns Scope of the imported module or an empty scope if module wasn't successfully loaded.
 */
exports.safeImport = function(...args) {
  for (var i=0; i<args.length; i++) {
    try {
      return Cu["import"](args[i], {});
    }
    catch (err) {
    }
  }
  return {};
};
