/* See license.txt for terms of usage */

"use strict";

// Add-ons SDK
const { Cu, Ci } = require("chrome");
const { EventTarget } = require("sdk/event/target");
const { Class } = require("sdk/core/heritage");
const { emit } = require("sdk/event/core");

// Firebug SDK
const { Trace, TraceError } = require("./core/trace.js").get(module.id);
const { Menu } = require("./menu.js");
const { Xul } = require("./core/xul.js");
const { Dom } = require("./core/dom.js");
const { ToolboxChrome } = require("./toolbox-chrome.js");

// XUL Builder
const { BOX, IMAGE, MENUPOPUP } = Xul;

/**
 * This object represents a tab menu that is used for panel options.
 * It can be accessed/opened through a little black triangle that's
 * displayed within a panel tab next to the label. The menu is available
 * only if Firebug theme is activated.
 */
const TabMenu = Class(
/** @lends TabMenu */
{
  extends: EventTarget,

  /**
   * Overlay existing panel with a tab menu.
   */
  initialize: function(panel, doc, tabIdPrefix, owner) {
    Trace.sysout("TabMenu.initialize;", this);

    // The panel can be instance of {@PanelBase} or {@BaseOverlay}.
    this.panel = panel;
    this.toolbox = panel.toolbox;
    this.doc = doc;
    this.owner = owner;
    this.tabIdPrefix = tabIdPrefix;

    let panelTabId = this.getPanelTabId();
    let tab = this.doc.getElementById(panelTabId);
    if (!tab) {
      TraceError.sysout("TabMenu.initialize; ERROR no tab! " + panelTabId +
        ", panel ID: " + panel.panelId, this);
      return;
    }

    this.tab = tab;

    this.onMouseDown = this.onMouseDown.bind(this);
    this.onSelectPanel = this.onSelectPanel.bind(this);

    // xxxHonza: ugh, how to handle events from the menu-target
    // element? It looks like elements within <radio> don't fire
    // mousedown events.
    this.tab.addEventListener("mousedown", this.onMouseDown);

    this.owner.on("select", this.onSelectPanel);
  },

  /**
   * Clean up the panel tab.
   */
  destroy: function() {
    // Destroy associated {@TabMenu} object. Note that it doesn't
    // have to exist if the panel was never selected. It's created
    // on demand when the panel is selected for the first time
    // (see onSelectPanel method).
    if (this.tab) {
      Trace.sysout("TabMenu.destroy; " + this.panel.id);

      this.tab.removeEventListener("mousedown", this.onMouseDown);
      this.owner.off("select", this.onSelectPanel);

      if (this.tab.tabMenu) {
        this.tab.tabMenu.remove();
        this.tab.tabMenu = null;
      }

      this.tab = null;
      this.toolbox = null;
    }
  },

  getPanelId: function() {
    return this.panel.overlayId || this.panel.panelId || this.panel.id;
  },

  getPanelTabId: function() {
    return this.tabIdPrefix + this.getPanelId();
  },

  onSelectPanel: function(eventId, panelId) {
    Trace.sysout("TabMenu.onSelectPanel; " + panelId);

    // Only handle the event if it's related to the panel
    // this tab menu instance is associated with.
    let id = this.getPanelId();
    if (panelId != id) {
      return;
    }

    // Create tab menu XUL structure. It should be created
    // when the <tab> binding is fully applied.
    // (is the binding applied when the tab is visible for the first time?)
    if (!this.tab.tabMenu) {
      this.initTabMenu();
    }

    // xxxHonza: support for runtime check:
    // Assert.ok(panelId == this.panel.id, "Panel id must match");

    let items = this.getOptionsMenuItems();
    let menuPopup = this.getOptionsMenuPopup();

    // The options menu target is visible only if the panel is
    // providing any menu items or entire custom menu popup.
    let collapsed = (!menuPopup && (!items || !items.length));
    this.tab.tabMenu.setAttribute("fb-collapsed", collapsed ? "true" : "false");

    // See the comment in onMouseDown() method below.
    this.lastSelectEvent = Date.now();
  },

  onMouseDown: function(event) {
    Trace.sysout("TabMenu.onMouseDown;", event);

    let tab = event.target;

    // Do not open the menu if the user clicked the tab to select
    // the associated panel (and it's just going to be selected).
    if (!tab.getAttribute("selected")) {
      return;
    }

    // The 'select' event comes just before the 'mousedown' event
    // (in case of <tabbox> used for side panels) and there is no way
    // to see that the click changed selected tab. In such case the menu
    // should *not* be opened. So, let's use the timing and bail out
    // in such case.
    // xxxHonza: Is there any better way?
    if (Date.now() - this.lastSelectEvent < 20) {
      return;
    }

    // If no custom menu popup is provided by the associated panel
    // let's use the default one.
    let menuPopup = this.getOptionsMenuPopup();
    if (!menuPopup) {
      this.initPopup(tab);
      menuPopup = this.tab.menuPopup;
    }

    let doc = tab.ownerDocument;
    let style = doc.defaultView.getComputedStyle(menuPopup, null);
    let rtlLanguage = style.direction == "rtl";

    let position = rtlLanguage ? "after_end" : "after_start";
    menuPopup.openPopup(tab, position, 0, 0, false, false);
  },

  initTabMenu: function() {
    if (this.tab.tabMenu) {
      return;
    }

    Trace.sysout("TabMenu.initTabMenu;");

    // Build tab menu.
    let panelTabId = this.getPanelTabId();
    let tabMenu = BOX({"class": "panelTabMenu"},
      IMAGE({"class": "menuTarget", "id": panelTabId + "-menu"}),
      MENUPOPUP({"class": "menuPopup"})
    ).build(this.tab);

    this.tab.tabMenu = tabMenu;
    this.tab.menuPopup = tabMenu.querySelector(".menuPopup");

    Trace.sysout("TabMenu.initTabMenu; DONE");
  },

  initPopup: function(tab) {
    Trace.sysout("TabMenu.initPopup;");

    let selected = tab.getAttribute("selected");
    if (selected != "true") {
      return;
    }

    let items = this.getOptionsMenuItems();
    if (!items || !items.length) {
      return;
    }

    Dom.clearNode(this.tab.menuPopup);

    Menu.createMenuItems(this.tab.menuPopup, items);

    let popupBoxObject = this.tab.menuPopup.popupBoxObject;
    popupBoxObject.setConsumeRollupEvent(popupBoxObject.ROLLUP_NO_CONSUME);
  },

  getOptionsMenuItems: function() {
    return this.panel.getOptionsMenuItems();
  },

  getOptionsMenuPopup: function() {
    return this.panel.getOptionsMenuPopup();
  }
});

/**
 * Support for tab-menu for panels and overlays.
 */
const TabMenuDriver = Class(
/** @lends TabMenuBox */
{
  initialize: function(options) {
    Trace.sysout("TabMenuDriver.initialize; " + options.panel.overlayId, this);

    this.panel = options.panel;
    this.toolbox = options.toolbox;
    this.tabIdPrefix = options.tabIdPrefix || "toolbox-tab-";
    this.doc = options.doc || this.toolbox.doc;
    this.owner = options.owner || this.toolbox;

    this.onThemeChanged = this.onThemeChanged.bind(this);
    ToolboxChrome.on("theme-changed", this.onThemeChanged);
  },

  destroy: function() {
    Trace.sysout("TabMenuDriver.destroy;");

    this.destroyTabMenu();
  },

  createTabMenu: function() {
    Trace.sysout("TabMenuDriver.createTabMenu;");

    if (this.tabMenu) {
      return;
    }

    // The 'Options' panel doesn't have options.
    if (this.panel.id == "options") {
      return;
    }

    this.tabMenu = new TabMenu(this.panel, this.doc,
      this.tabIdPrefix, this.owner);
  },

  destroyTabMenu: function() {
    if (this.tabMenu) {
      this.tabMenu.destroy();
      this.tabMenu = null;
    }
  },

  /**
   * Executed by the framework when the panel is selected in the toolbox.
   */
  onPanelShow: function() {
    Trace.sysout("TabMenuDriver.show;");

    // Make sure the tab options menu is available.
    if (ToolboxChrome.isFirebugThemeActive()) {
      this.createTabMenu();
    }
  },

  /**
   * Executed by the framework when the panel is un-selected in the toolbox.
   */
  onPanelHide: function() {
    Trace.sysout("TabMenuDriver.hide;");
  },

  // Theme

  onThemeChanged: function(newTheme, oldTheme) {
    if (newTheme == "firebug") {
      this.createTabMenu();
    } else {
      this.destroyTabMenu();
    }
  },
});

// Exports from this module
exports.TabMenu = TabMenuDriver;
