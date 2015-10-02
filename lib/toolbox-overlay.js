/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

// Add-ons SDK
const { Class } = require("sdk/core/heritage");
const { emit } = require("sdk/event/core");
const { EventTarget } = require("sdk/event/target");

// Firebug SDK
const { Trace, TraceError } = require("./core/trace.js").get(module.id);

/**
 * @overlay
 */
const ToolboxOverlay = Class(
/** @lends ToolboxOverlay */
{
  extends: EventTarget,

  /**
   * Executed by the framework when a panel instance is created.
   */
  initialize: function(options) {
    Trace.sysout("ToolboxOverlay.initialize; " + options.id, options);

    this.toolbox = options.toolbox;
    this.chrome = options.chrome;
    this.context = options.context;

    // Register event handlers
    this.onPanelSelected = this.onPanelSelected.bind(this);
    this.toolbox.on("select", this.onPanelSelected);

    // The 'select' event isn't fired when the first panel is selected
    // by default, so do it now.
    this.onPanelSelected("select", this.toolbox._defaultToolId);
  },

  destroy: function() {
  },

  /**
   * Executed by the framework when toolbox initialization is done
   * and it's fully loaded and ready.
   */
  onReady: function(options) {
    Trace.sysout("ToolboxOverlay.onReady; " + this.id, options);
  },

  // Panel Selection

  onPanelSelected: function(eventId, panelId) {
    Trace.sysout("ToolboxOverlay.onPanelSelected; " + panelId);

    if (this.selectedPanel && isFunction(this.selectedPanel, "onHide")) {
      this.selectedPanel.onHide();
    }

    this.selectedPanel = getPanelObject(this.toolbox, panelId);

    if (this.selectedPanel && isFunction(this.selectedPanel, "onShow")) {
      this.selectedPanel.onShow();
    }

    emit(this, "panel-selected", this.selectedPanel);
  },

  // Theme

  onThemeSwitched: function(win, newTheme, oldTheme) {
  },

  // Accessors

  get id() {
    return this.overlayId;
  },
});

// Helpers

/**
 * Returns an instance of a panel for panels based on SDK or
 * an instance of a panel overlay for built-in panels (not based on SDK).
 */
function getPanelObject(toolbox, id) {
  let panel = toolbox.getPanel(id);
  if (!panel) {
    return;
  }

  let overlay = panel._firebugPanelOverlay;
  if (overlay) {
    return overlay;
  }

  return panel;
}

function isFunction(obj, name) {
  return typeof obj[name] == "function";
}

// Exports from this module
exports.ToolboxOverlay = ToolboxOverlay;
