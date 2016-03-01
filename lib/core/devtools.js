/* See license.txt for terms of usage */

"use strict";

const { Cu } = require("chrome");

/**
 * Allows importing a JS module (Firefox platform) and specify alternative locations
 * to keep backward compatibility in case when the module location changes.
 * It helps Firebug to support multiple Firefox versions.
 *
 * @param {Array} locations List of URLs to try when importing the module.
 * @returns Scope of the imported module or an empty scope if module wasn't successfully loaded.
 */
function safeImport(...args) {
  for (var i=0; i<args.length; i++) {
    try {
      return Cu["import"](args[i], {});
    }
    catch (err) {
    }
  }
  return {};
}

exports.safeImport = safeImport;

/**
 * Allows requiring a devtools module and specify alternative locations
 * to keep backward compatibility in case when the module location changes.
 * It helps Firebug to support multiple Firefox versions.
 *
 * @param {Object} devtools Reference to DevTools module.
 * @param {Array} locations List of URLs to try when importing the module.
 * @returns Scope of the imported module or an empty scope if module wasn't successfully loaded.
 */
function safeRequire(devtools, ...args) {
  for (var i=0; i<args.length; i++) {
    try {
      return devtools["require"](args[i]);
    }
    catch (err) {
    }
  }
  return {};
}

exports.safeRequire = safeRequire;

/**
 * Allows importing or requiring a devtools module and specify alternative
 * locations to keep backward compatibility when the module location changes.
 */
function safeGet(devtools, ...args) {
  for (var i=0; i<args.length; i++) {
    var url = args[i];
    if (url.startsWith("resource://")) {
      try {
        return Cu["import"](url, {});
      }
      catch (err) {
      }
    } else if (url.startsWith("devtools/")) {
      try {
        return devtools["require"](url);
      }
      catch (err) {
      }
    }
  }
  return {};
}

exports.safeGet = safeGet;

// Support for new devtools modules path.
// See also:
// * https://wiki.mozilla.org/DevTools/Hacking
// * https://github.com/jryans/devtools-migrate/blob/master/README.md
// * https://developer.mozilla.org/en-US/docs/Tools/Contributing
// * https://bugzilla.mozilla.org/show_bug.cgi?id=912121
// * https://bugzilla.mozilla.org/show_bug.cgi?id=1203159

const devtools = exports.devtools = safeImport(
  "resource://devtools/shared/Loader.jsm",
  "resource://gre/modules/devtools/shared/Loader.jsm",
  "resource://gre/modules/devtools/Loader.jsm"
).devtools;

exports.DevToolsUtils = safeRequire(devtools,
  "devtools/shared/DevToolsUtils",
  "devtools/toolkit/DevToolsUtils"
);

exports.makeInfallible = exports.DevToolsUtils.makeInfallible;

exports.gDevTools = safeGet(devtools,
  "devtools/client/framework/devtools",
  "resource:///devtools/client/framework/gDevTools.jsm",
  "resource:///modules/devtools/client/framework/gDevTools.jsm",
  "resource:///modules/devtools/gDevTools.jsm"
).gDevTools;

exports.EventEmitter = safeRequire(devtools,
  "devtools/shared/event-emitter",
  "devtools/toolkit/event-emitter"
);

exports.ToolSidebar = safeRequire(devtools,
  "devtools/client/framework/sidebar",
  "devtools/framework/sidebar"
).ToolSidebar;

exports.DebuggerServer = safeGet(devtools,
  "devtools/server/main",
  "resource://gre/modules/devtools/dbg-server.jsm"
).DebuggerServer;

exports.DebuggerClient = safeGet(devtools,
  "devtools/shared/client/main",
  "resource://gre/modules/devtools/dbg-client.jsm"
).DebuggerClient;
