/* See license.txt for terms of usage */

"use strict";

// Add-on SDK
const self = require("sdk/self");
const { Cu, Ci } = require("chrome");
const { Class } = require("sdk/core/heritage");

// Firebug SDK
const { Trace, TraceError } = require("./core/trace.js").get(module.id);
const { TabMenu } = require("./tab-menu.js");
const { PanelOverlay } = require("./panel-overlay.js");

/**
 * Represents an overlay for side panels. Derived objects can customize
 * specific side panel in devtools.
 */
const SidePanelOverlay = Class(
/** @lends SidePanelOverlay */
{
  extends: PanelOverlay,

  // Initialization

  initialize: function(options) {
    PanelOverlay.prototype.initialize.apply(this, arguments);

    Trace.sysout("SidePanelOverlay.initialize;", options);

    this.owner = options.owner;
  },

  createTabMenu: function() {
    if (this.tabMenu) {
      return;
    }

    this.tabMenu = new TabMenu({
      panel: this,
      toolbox: this.toolbox,
      tabIdPrefix: "sidebar-tab-",
      doc: this.panelFrame.ownerDocument,
      owner: this.owner.sidebar
    });

    this.tabMenu.createTabMenu();
  },
});

// Exports from this module
exports.SidePanelOverlay = SidePanelOverlay;
