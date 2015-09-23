/* See license.txt for terms of usage */

"use strict";

const { Cu } = require("chrome");

try {
  // New devtools modules path. See also:
  // * https://wiki.mozilla.org/DevTools/Hacking
  // * https://github.com/jryans/devtools-migrate/blob/master/README.md
  // * https://developer.mozilla.org/en-US/docs/Tools/Contributing
  exports.devtools = Cu.import("resource://gre/modules/devtools/shared/Loader.jsm", {}).devtools;
  exports.DevToolsUtils = exports.devtools["require"]("devtools/shared/DevToolsUtils");
  exports.makeInfallible = exports.DevToolsUtils.makeInfallible;
  exports.gDevTools = Cu.import("resource:///modules/devtools/client/framework/gDevTools.jsm").gDevTools;
  exports.EventEmitter = exports.devtools["require"]("devtools/shared/event-emitter");
  exports.ToolSidebar = exports.devtools["require"]("devtools/client/framework/sidebar").ToolSidebar;
  exports.CssLogic = exports.devtools["require"]("devtools/shared/styleinspector/css-logic").CssLogic;
  exports.Widgets = exports.devtools.require("devtools/client/webconsole/console-output").Widgets;
} catch(e) {
  exports.devtools = Cu.import("resource://gre/modules/devtools/Loader.jsm", {}).devtools;
  exports.DevToolsUtils = exports.devtools["require"]("devtools/toolkit/DevToolsUtils");
  exports.makeInfallible = exports.DevToolsUtils.makeInfallible;
  exports.gDevTools = Cu.import("resource:///modules/devtools/gDevTools.jsm", {}).gDevTools;
  exports.EventEmitter = exports.devtools["require"]("devtools/toolkit/event-emitter");
  exports.ToolSidebar = exports.devtools["require"]("devtools/framework/sidebar").ToolSidebar;
  exports.CssLogic = exports.devtools["require"]("devtools/styleinspector/css-logic").CssLogic;
  exports.Widgets = exports.devtools.require("devtools/webconsole/console-output").Widgets;
}
