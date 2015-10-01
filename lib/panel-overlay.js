/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

// Add-ons SDK
const { Class } = require("sdk/core/heritage");

// Firebug SDK
const { Trace, TraceError } = require("./core/trace.js").get(module.id);
const { TabMenu } = require("./tab-menu.js");
const { ToolboxChrome } = require("./toolbox-chrome.js");

/**
 * @overlay
 */
const PanelOverlay = Class(
/** @lends PanelOverlay */
{
  /**
   * Executed by the framework when a panel instance is created.
   */
  initialize: function(options) {
    Trace.sysout("PanelOverlay.initialize; " + options.id, options);

    this.overlayId = options.id;
    this.toolbox = options.toolbox;
    this.chrome = options.chrome;
    this.panelFrame = options.panelFrame;
    this.context = options.context;

    this.onThemeChanged = this.onThemeChanged.bind(this);
    ToolboxChrome.on("theme-changed", this.onThemeChanged);

    this.tabMenu = new TabMenu({
      panel: this,
      toolbox: this.toolbox
    });
  },

  destroy: function() {
    this.tabMenu.destroy();
  },

  /**
   * Executed by the framework when panel's frame is loaded.
   */
  onBuild: function(options) {
    Trace.sysout("PanelOverlay.onBuild; " + this.id, options);

    if (!options.panel) {
      return;
    }

    this.panel = options.panel;
  },

  /**
   * Executed by the framework when panel's initialization is done
   * and the panel is fully ready.
   */
  onReady: function(options) {
    Trace.sysout("PanelOverlay.onReady; " + this.id, options);

    // xxxHonza: the built-in panels should all use the {@ToolSidebar}
    // object. So far it's only the Console and Inspector panels.
    // The instance of the {@ToolSidebar} should be accessible through
    // panel.sidebar property. FIX ME, REPORT BUG
    if (this.panel && this.panel.sidebar) {
      this.sidebar = this.panel.sidebar;
    }
  },

  // Toolbar Buttons

  getPanelToolbarButtons: function() {
    let buttons = [];
    return buttons;
  },

  // Options

  getOptionsMenuItems: function() {
    let items = [];
    return items;
  },

  /**
   * Executed by the framework when the user clicks panel tab options
   * menu target. Returns custom menu popup for panel options.
   *
   * @returns {MenuPopup} The method can return custom <menupopup> element
   * that will be displayed when the user clicks the tab options target.
   */
  getOptionsMenuPopup: function() {
  },


  // Panel Selection

  /**
   * Executed by the framework when the panel is selected in the toolbox.
   */
  onShow: function() {
    Trace.sysout("PanelOverlay.show;");
    this.tabMenu.onPanelShow();
  },

  /**
   * Executed by the framework when the panel is un-selected in the toolbox.
   */
  onHide: function() {
    Trace.sysout("PanelOverlay.hide;");
    this.tabMenu.onPanelHide();
  },

  // Theme

  onThemeChanged: function(newTheme, oldTheme) {
  },

  onThemeSwitched: function(win, newTheme, oldTheme) {
  },

  // Accessors

  /**
   * Returns unique ID of the overlay.
   */
  get id() {
    return this.overlayId;
  },

  getPanel: function() {
    return this.panel;
  },

  getPanelDocument: function() {
    return this.panelFrame.contentDocument;
  },

  getPanelWindow: function() {
    return this.panelFrame.contentWindow;
  },

  getToolbar: function() {
    let doc = this.getPanelDocument();
    return doc.querySelector("#panelToolbar");
  }
});

// Exports from this module
exports.PanelOverlay = PanelOverlay;
