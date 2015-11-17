/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "unstable"
};

// Add-on SDK
const self = require("sdk/self");
const { Class } = require("sdk/core/heritage");

// Firebug.SDK
const { Trace, TraceError } = require("./core/trace.js").get(module.id);
const { PanelBase } = require("./panel-base.js");

/**
 * Base object for {@Toolbox} panels. Every Panel object should be derived
 * from this object.
 *
 * xxxHonza: SidePanelBase doesn't register theme changes listeners
 * and so doesn't support onApply/UnapplyTheme callbacks.
 * Note that basic support is done in {@PanelBase} object.
 */
const SidePanelBase = Class(
/** @lends SidePanelBase */
{
  extends: PanelBase,

  /**
   * Executed by the framework when the panel is created
   *
   * @param {IFrame} frame: The <iframe> element associated with this side panel
   * @param {Toolbox} toolbox: Reference to the parent toolbox object.
   * @param {Panel} owner: Reference to the parent main panel.
   */
  setup: function({frame, toolbox, owner}) {
    PanelBase.prototype.setup.apply(this, arguments);

    Trace.sysout("SidePanelBase.setup; " + this.id, arguments);

    this.owner = owner;
    this.toolbox = toolbox;
    this.panelFrame = frame;
  },

  onReady: function(options) {
    PanelBase.prototype.onReady.apply(this, arguments);

    Trace.sysout("SidePanelBase.onReady; " + this.id, this);

    this.panelNode = options.window.document.body;
  },
});

// Exports from this module
exports.SidePanelBase = SidePanelBase;
