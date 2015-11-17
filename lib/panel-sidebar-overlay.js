/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

// Add-ons SDK
const self = require("sdk/self");
const { Class } = require("sdk/core/heritage");
const { setTimeout } = require("sdk/timers");

// Firebug SDK
const { Trace, TraceError } = require("./core/trace.js").get(module.id);
const { Win } = require("./core/window.js");
const { ToolboxChrome } = require("./toolbox-chrome.js");

/**
 * This object if responsible for creating side panels and side panel overlays.
 */
const PanelSidebarOverlay = Class(
/** @lends PanelOverlay */
{
  /**
   * Options
   * owner: panel instance typically derived from {@PanelBase} or
   *        an overlay instance derived from {@PanelOverlay}.
   *        The owner should implement `getSidePanels` and `hasSidePanels`
   *        and/or methods.
   *
   * sidebar: instance of {@ToolSidebar}
   */
  initialize: function(options) {
    this.owner = options.owner;
    this.sidebar = options.sidebar;
    this.toolbox = options.toolbox;
    this.sidePanels = new Map();
    this.sideOverlays = new Map();
  },

  destroy: function() {
    // Destroy all overlay instances.
    for (let overlay of this.sideOverlays.values()) {
      overlay.destroy();
    }
  },

  hasSidePanels: function() {
    if (typeof this.owner.hasSidePanels == "function") {
      let sidePanels = this.owner.hasSidePanels();
      if (sidePanels) {
        return sidePanels;
      }
    }
    return [];
  },

  getSidePanels: function() {
    if (typeof this.owner.getSidePanels == "function") {
      let sidePanels = this.owner.getSidePanels();
      if (sidePanels) {
        return sidePanels;
      }
    }
    return [];
  },

  setupSidePanels: function() {
    let sidePanels = this.getSidePanels();

    Trace.sysout("basePanel.setupSidePanels; " + this.sidebar, sidePanels);

    if (!this.sidebar) {
      return;
    }

    // Hide the side bar if there are no side panels at all
    if (!this.hasSidePanels()) {
      this.sidebar.hide();
      return;
    }

    // Bail out if there are no custom side panels.
    if (!sidePanels || !sidePanels.length) {
      return;
    }

    let firstTabId;

    // Iterate all provided (custom) side panel constructors and build
    // corresponding structure in the side-bar.
    for (let ctor of sidePanels) {
      const { id } = ctor.prototype;

      if (!firstTabId) {
        firstTabId = id;
      }

      if (!this.sidebar.getTab(id)) {
        this.buildSidePanel(ctor);
      }
    }

    // Select the first panel by default.
    // xxxHonza: the last selected side panel for specific main
    // panel should be stored in preferences.
    if (firstTabId) {
      this.sidebar.select(firstTabId);
    }
  },

  /**
   * Returns an iframe associated with given side panel.
   *
   * @param {String} id ID of a side panel.
   */
  getSidePanelFrame: function(id) {
    // API changed in Firefox 38 (getTab replaced by getTabPanel).
    // See also: https://bugzilla.mozilla.org/show_bug.cgi?id=1101569
    let xulPanel;
    if (typeof this.sidebar.getTabPanel == "function") {
      xulPanel = this.sidebar.getTabPanel(id);
    }
    else {
      xulPanel = this.sidebar.getTab(id);
    }

    return xulPanel.querySelector("iframe");
  },

  buildSidePanel: function(ctor) {
    const { id, label, tooltip, icon, url } = ctor.prototype;

    Trace.sysout("basePanel.buildSidePanel; " + id, ctor);

    // Append new tab into the side bar.
    this.sidebar.addTab(id, self.data.url(url), false);

    let panelFrame = this.getSidePanelFrame(id);

    // Create instance of the side panel object and setup it.
    // xxxHonza: when main panels are created the frame is
    // not passed into the setup method (SDK design, see also issue #65).
    // Side panels API should behave similarly FIX ME.
    let panel = new ctor();
    this.sidePanels.set(id, panel);
    panel.setup({frame: panelFrame, toolbox: this.toolbox, owner: this.owner});

    let onLoad = (event) => {
      panelFrame.removeEventListener("load", onLoad, true);
      this.onSidePanelLoad(event, id);
    };

    if (!panelFrame) {
      TraceError.sysout("basePanel.buildSidePanel; ERROR no panel frame!" + id);
      return;
    }

    panelFrame.addEventListener("load", onLoad, true);
  },

  onSidePanelLoad: function(event, id) {
    // Update panel tab title with localized version
    // xxxHonza: report request for better (localizable) API.
    let tab = this.sidebar._tabs.get(id);
    let panel = this.sidePanels.get(id);
    tab.setAttribute("label", panel.label);
    tab.setAttribute("tooltiptext", panel.tooltip);
    Trace.sysout("basePanel.onSidePanelLoad; " + id, panel);

    // Get the side panel window from the target since
    // panelFrame.contentWindow isn't set when the <tabbox> is hidden.
    panel.onReady({window: event.target.defaultView});
  },

  removeSidePanels: function() {
    let sidePanels = this.getSidePanels();
    if (!this.sidebar || !sidePanels || !sidePanels.length) {
      return;
    }

    for (let Panel of sidePanels) {
      const { id } = Panel.prototype;

      Trace.sysout("removeSidePanel: " + id)

      this.sidebar.removeTab(id);
      this.sidePanels.get(id).destroy();
      this.sidePanels.delete(id);
    }
  },

  getSidePanel: function(id) {
    return this.sidePanels.get(id);
  },

  selectSidePanel: function(id) {
    this.sidebar.select(id);
  },

  toggleSidebar: function() {
    if (this.sidebar) {
      this.sidebar.toggle();
    }
  },

  // Side Panel Overlays

  setupSideOverlays: function() {
    Trace.sysout("baseOverlay.setupSideOverlays;");

    if (!this.sidebar) {
      return;
    }

    let overlays = this.getSideOverlays();
    if (!overlays) {
      return;
    }

    for (let overlay of overlays) {
      let overlayId = overlay.prototype.overlayId;
      if (!overlayId) {
        TraceError.sysout("baseOverlay.setupSideOverlays; ERROR " +
          "no overlay ID!");
        continue;
      }

      let panelFrame = this.getSidePanelFrame(overlayId);
      if (!panelFrame) {
        TraceError.sysout("baseOverlay.setupSideOverlays; ERROR " +
          "no panel frame");
        continue;
      }

      // Create instance of an overlay
      let instance = new overlay({
        owner: this.owner,
        panelFrame: panelFrame,
        toolbox: this.toolbox,
        id: overlayId
      });

      this.sideOverlays.set(overlayId, instance);

      instance.onBuild({toolbox: this.toolbox});

      if (ToolboxChrome.isFirebugThemeActive()) {
        instance.onApplyTheme(panelFrame.contentWindow, "firebug");
      }

      Win.loaded(panelFrame.contentWindow).then(doc => {
        instance.onReady({toolbox: this.toolbox});
      });
    }

    // Simulate "select" event so, the selected side panel
    // has the tab menu.
    setTimeout(() => {
      this.sidebar.emit("select", this.sidebar._currentTool);
    }, 250);
  },

  getSideOverlays: function() {
    if (typeof this.owner.getSideOverlays == "function") {
      let sideOverlays = this.owner.getSideOverlays();
      if (sideOverlays) {
        return sideOverlays;
      }
    }
    return [];
  },

});

// Exports from this module
exports.PanelSidebarOverlay = PanelSidebarOverlay;
