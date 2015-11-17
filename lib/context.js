/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

const { Trace, TraceError } = require("./core/trace.js").get(module.id);
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");
const { Win } = require("./core/window.js");

// DevTools
const { gDevTools } = require("./core/devtools");

/**
 * This object represents a toolbox context that shares the same
 * live cycle as the devtools Toolbox. Its purpose is storing additional
 * data like for example existing panel overlays objects.
 */
const Context = Class(
/** @lends Context */
{
  extends: EventTarget,

  // Initialization

  initialize: function(toolbox) {
    EventTarget.prototype.initialize.call(this);

    Trace.sysout("Context.initialize;", toolbox);

    this.toolbox = toolbox;
    this.overlays = new Map();
  },

  destroy: function() {
    Trace.sysout("Context.destroy;");

    // Destroy all registered overlay instances.
    for (let overlay of this.overlays.values()) {
      overlay.destroy();
    }
  },

  // Overlays

  getOverlay: function(overlayId) {
    return this.overlays.get(overlayId);
  },

  getPanelOverlay: function(panelId) {
    for (let overlay of this.overlays.values()) {
      if (overlay.panel && overlay.panelId == panelId) {
        return overlay;
      }
    }
  },
});

// Exports from this module
exports.Context = Context;
