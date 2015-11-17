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
const { EventEmitter, gDevTools } = require("./core/devtools.js");
const { PanelSidebarOverlay } = require("./panel-sidebar-overlay.js");
const { Win } = require("./core/window.js");

/**
 * Base object for all Toolbox panel overlays.
 */
const PanelOverlay = Class(
/** @lends PanelOverlay */
{
  /**
   * Executed by the framework when a panel instance is created.
   */
  initialize: function(options) {
    Trace.sysout("PanelOverlay.initialize; " + options.id, options);

    EventEmitter.decorate(this);

    this.overlayId = options.id;
    this.toolbox = options.toolbox;
    this.chrome = options.chrome;
    this.panelFrame = options.panelFrame;
    this.context = options.context;

    // Listen to theme changes
    this.onThemeChanged = this.onThemeChanged.bind(this);
    ToolboxChrome.on("theme-changed", this.onThemeChanged);

    this.themeSwitched = this.themeSwitched.bind(this);
    gDevTools.on("theme-switched", this.themeSwitched);
  },

  destroy: function() {
    this.destroyTabMenu();

    if (this.sidebarOverlay) {
      this.sidebarOverlay.destroy();
    }

    ToolboxChrome.off("theme-changed", this.onThemeChanged);
    gDevTools.off("theme-switched", this.themeSwitched);
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

    this.createTabMenu();

    this.sidebarOverlay = new PanelSidebarOverlay({
      owner: this,
      toolbox: this.toolbox,
      sidebar: this.sidebar
    });

    if (this.searchable && ToolboxChrome.isFirebugThemeActive()) {
      this.updateSearchBox(true);
    }

    this.setupSidePanels();
    this.setupSideOverlays();

    // Use a custom attribute to distinguish toolbox panels from standalone ones
    // (such as console panel)
    let win = this.getPanelWindow();
    win.document.documentElement.setAttribute("panel", "true");
  },

  setupSidePanels: function() {
    this.sidebarOverlay.setupSidePanels();
  },

  setupSideOverlays: function() {
    this.sidebarOverlay.setupSideOverlays();
  },

  // Tab Menu

  createTabMenu: function() {
    if (this.tabMenu) {
      return;
    }

    this.tabMenu = new TabMenu({
      panel: this,
      toolbox: this.toolbox,
      tabIdPrefix: "toolbox-tab-",
      doc: this.toolbox.doc,
      owner: this.toolbox
    });

    this.tabMenu.createTabMenu();
  },

  destroyTabMenu: function() {
    if (this.tabMenu) {
      this.tabMenu.destroy();
      this.tabMenu = null;
    }
  },

  // Search

  search: function (nativeSearchBoxSelector, value) {
    let doc = this.getPanelDocument();
    let win = this.getPanelWindow();

    // Inject the searched pattern to the native search box.
    // xxxHonza: The search box UI will be built-in at some point
    // see: https://bugzilla.mozilla.org/show_bug.cgi?id=1026479
    // As soon as the bug is fixed this code will change TESTME
    let nativeSearchBox = doc.querySelector(nativeSearchBoxSelector);
    nativeSearchBox.value = value;

    // Trigger the "command" event for the native search box
    // to apply the filter.
    let event = doc.createEvent("xulcommandevent");
    event.initCommandEvent("command", true, true, win, 0, false, false, false,
        false, null);
    nativeSearchBox.dispatchEvent(event);
  },

  updateSearchBox: function(apply) {
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

  // Side Panels

  /**
   * Return list of side panels that should be created for this panel.
   */
  getSidePanels: function() {
    return [];
  },

  /**
   * Can be overridden by overlays to indicate that the (built-in)
   * panel has side panels even if there are no additional custom
   * panels appended.
   */
  hasSidePanels: function() {
    let panels = this.getSidePanels();
    return (panels && panels.length);
  },

  // Panel Selection

  /**
   * Executed by the framework when the panel is selected in the toolbox.
   */
  onShow: function() {
    Trace.sysout("PanelOverlay.show;");
    this.tabMenu.onPanelShow();

    if (this.searchable && ToolboxChrome.isFirebugThemeActive()) {
      this.updateSearchBox(true);
    }
  },

  /**
   * Executed by the framework when the panel is un-selected in the toolbox.
   */
  onHide: function() {
    Trace.sysout("PanelOverlay.hide;");
    this.tabMenu.onPanelHide();

    // Unapply search-box customization when the Inspector panel
    // is hidden (unselected). The search box is shared among
    // panels and other customization can apply.
    if (this.searchable) {
      this.updateSearchBox(false);
    }
  },

  // Theme

  onThemeChanged: function(newTheme, oldTheme) {
  },

  themeSwitched: function(eventId, win, newTheme, oldTheme) {
    let frame = this.panelFrame;
    if (frame && frame.contentWindow === win) {
      Win.loaded(win).then(() => {
        this.onThemeSwitched(win, newTheme, oldTheme);
      });
    }
  },

  onThemeSwitched: function(win, newTheme, oldTheme) {
    if (newTheme == "firebug") {
      this.onApplyTheme(win, oldTheme);
    } else if (oldTheme == "firebug"){
      this.onUnapplyTheme(win, newTheme);
    }
  },

  /**
   * Executed by the framework when Firebug theme is applied.
   *
   * xxxHonza: onApplyTheme and onUnapplyTheme are not executed for
   * custom panels that don't include theme-switching.js file in
   * the content document. Note that the document must have chrome
   * privileges.
   *
   * @param {Window} Window in the iframe the theme is applied to.
   * @param {@String} ID of the previous theme.
   */
  onApplyTheme: function(win, oldTheme) {
    Trace.sysout("PanelOverlay.onApplyTheme;");

    if (this.searchable) {
      this.updateSearchBox(true);
    }

    this.createTabMenu();

    // Emit select event, so the tab-menu is visible after
    // Firebug theme is activated.
    this.toolbox.emit("select", this.toolbox.currentToolId);
  },

  /**
   * Executed by the framework when Firebug theme is unapplied.
   *
   * @param {Window} Window in the iframe the theme is applied to.
   * @param {@String} ID of the new theme.
   */
  onUnapplyTheme: function(win, newTheme) {
    Trace.sysout("PanelOverlay.onUnapplyTheme;");

    if (this.searchable) {
      this.updateSearchBox(false);
    }

    this.destroyTabMenu();
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
