/* See license.txt for terms of usage */

"use strict";

// Add-on SDK
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");

// Firebug SDK
const { Locale } = require("./core/locale.js");
const { Menu } = require("./menu.js");
const { Trace, TraceError } = require("./core/trace.js").get(module.id);
const { Xul } = require("./core/xul.js");

// Constants
const XUL_NS = "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul";

const { BOX, TOOLBAR } = Xul;

/**
 * Helper object that is used to create XUL toolbars in the UI.
 */
const PanelToolbar = Class(
/** @lends PanelToolbar */
{
  extends: EventTarget,

  initialize: function(options) {
    EventTarget.prototype.initialize.call(this);

    Trace.sysout("panelToolbar.initialize;", options);

    let box =
      BOX({"id": "panelToolbarBox"},
        TOOLBAR({"class": "chromeclass-toolbar",
          "id": "panelToolbar",
          "customizable": "false",
          "iconsize": "small"}
        )
      );

    let parentNode = options.parentNode;
    this.container = box.build(parentNode, options);
    this.toolbar = parentNode.querySelector("#panelToolbar");
  },

  addItem: function(item) {
    this.toolbar.appendChild(item);
  },

  createItems: function(items) {
    if (!items) {
      return;
    }

    for (let item of items) {
      createToolbarButton(this.toolbar, item);
    }
  },

  remove: function() {
    return this.container.remove();
  }
});

exports.PanelToolbar = PanelToolbar;
