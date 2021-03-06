/* See license.txt for terms of usage */

"use strict";

// Add-on SDK
const self = require("sdk/self");
const options = require("@loader/options");
const { Cu, Ci } = require("chrome");
const { Panel } = require("dev/panel.js");
const { Class } = require("sdk/core/heritage");
const { viewFor } = require("sdk/view/core");
const { resolve } = require("sdk/core/promise");
const { loadSheet, removeSheet } = require("sdk/stylesheet/utils");
const Prefs = require("sdk/simple-prefs");
const { getMostRecentBrowserWindow } = require("sdk/window/utils");

// Firebug.SDK
const { Trace, TraceError, FBTrace } = require("./core/trace.js").get(module.id);
const { Locale } = require("./core/locale.js");
const { Content } = require("./core/content.js");
const { ToolboxChrome } = require("./toolbox-chrome.js");
const { devtools, gDevTools, EventEmitter } = require("./core/devtools.js");
const { Dom } = require("./core/dom.js");
const { TabMenu } = require("./tab-menu.js");
const { Str } = require("firebug.sdk/lib/core/string.js");
const { Win } = require("firebug.sdk/lib/core/window.js");

// Platform
const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});

// Constants
const { prefs } = Prefs;

/**
 * This object represents base for Toolbox panel. It automatically
 * sets up communication channel between the panel (chrome scope)
 * and the view (content) scope as well as handles theme changes.
 */
const PanelBase = Class(
/** @lends PanelBase */
{
  extends: Panel,

  // Needs to be specified by derived object.
  label: "",
  tooltip: "",
  icon: "",
  url: "",

  // Feature flags
  searchable: false,

  /**
   * Executed by the framework when an instance of this panel is created.
   * There is one instance of this panel per {@Toolbox}. The panel is
   * instantiated when selected in the toolbox for the first time.
   */
  initialize: function(options) {
    EventEmitter.decorate(this);

    this.onContentMessage = this.onContentMessage.bind(this);
    this.onThemeChanged = this.onThemeChanged.bind(this);
    this.onPrefChanged = this.onPrefChanged.bind(this);
    this.themeSwitched = this.themeSwitched.bind(this);
  },

  /**
   * Executed by the framework when an overlaid panel is destroyed.
   */
  destroy: function() {
    this.tabMenu.destroy();

    Prefs.off("", this.onPrefChanged);

    if (this.toggleSideBar) {
      this.toggleSideBar.destroy();
    }
  },

  /**
   * Executed by the framework when the panel is destroyed.
   */
  dispose: function() {
    this.destroy();
    this.detach();
    delete this.debuggee;
  },

 /**
  * Executed by the framework when the panel content iframe is
  * constructed. Allows e.g to connect the backend through
  * `debuggee` object
  */
  setup: function(options) {
    this.debuggee = options.debuggee;
    this.panelFrame = options.frame || viewFor(this);
    this.toolbox = options.toolbox || getToolbox(this.panelFrame.contentWindow);

    if (!this.panelFrame) {
      TraceError.sysout("PanelBase.setup; ERROR no panel frame!", options);
    }

    // Listen to all preference that belong to this extension
    // preference branch.
    Prefs.on("", this.onPrefChanged);
  },

  onReady: function() {
    // Load content script and register message handler.
    let { messageManager } = this.panelFrame.frameLoader;
    if (messageManager) {
      let url = module.uri.replace("panel-base.js", "panel-frame-script.js");
      messageManager.loadFrameScript(url, false);
      messageManager.addMessageListener("firebug.sdk/message", this.onContentMessage);
    }

    this.createTabMenu();

    // Listen to theme changes. The listeners are registered here
    // in onReady, so theme changes are called after the panel
    // is fully ready.
    ToolboxChrome.on("theme-changed", this.onThemeChanged);
    gDevTools.on("theme-switched", this.themeSwitched);

    // Theme initialization
    let currentTheme = ToolboxChrome.getCurrentTheme();
    this.onThemeChanged(currentTheme);

    let win = this.getPanelWindow();
    this.themeSwitched("theme-switched", win, currentTheme);
  },

  // Events from the View (myView.html)

  onContentReady: function(args) {
    let win = this.getPanelWindow();

    let theme = {
      getDefinition: function(themeId) {
        let view = Content.getContentView(win);
        let def = gDevTools.getThemeDefinition(themeId);
        return view.JSON.parse(JSON.stringify(def));
      },
      getCurrentTheme: function() {
        return ToolboxChrome.getCurrentTheme();
      }
    }

    let options = {
      get: function(name) {
        return prefs[name];
      },
      set: function(name, value) {
        prefs[name] = value;
      }
    }

    let contentTrace = {
      sysout: function() {
        FBTrace.sysout.apply(FBTrace, arguments);
      }
    }

    Content.exportIntoContentScope(win, Locale, "Locale");
    Content.exportIntoContentScope(win, theme, "Theme");
    Content.exportIntoContentScope(win, options, "Options");
    Content.exportIntoContentScope(win, contentTrace, "Trace");
    Content.exportIntoContentScope(win, contentTrace, "FBTrace");
    Content.exportIntoContentScope(win, TraceError, "TraceError");
    Content.exportIntoContentScope(win, Str, "Str");

    // Load 'theme-switching' script that updates theme class
    // name when the active theme changes.
    let url = module.uri.replace("panel-base.js", "theme-switching.js");
    Dom.loadScript(win.document, url, event => {
      this.attach().then(() => {
        let config = {
          currentTheme: Services.prefs.getCharPref("devtools.theme"),
        };
        config = this.getContentConfig(config);
        this.postContentMessage("initialize", config);
      });
    });
  },

  /**
   * Executed just before 'initialize' event is sent to the content view.
   * This method allows appending custom properties to the config object
   * passed along.
   */
  getContentConfig: function(config) {
    return config;
  },

  /**
   * Handle messages coming from the view (*.html)
   */
  onContentMessage: function(msg) {
    let event = msg.data;
    let method = event.type;

    // Execute appropriate event handler.
    if (typeof this[method] == "function") {
      this[method](event.args);
    };
  },

  /**
   * Send message to the content scope (panel's iframe)
   */
  postContentMessage: function(id, data) {
    if (!this.panelFrame.frameLoader) {
      return;
    }

    let { messageManager } = this.panelFrame.frameLoader;
    if (!messageManager) {
      return;
    }

    messageManager.sendAsyncMessage("firebug.sdk/message", {
      type: id,
      bubbles: false,
      cancelable: false,
      data: data,
    });
  },

  // Backend

  attach: function() {
    // TODO: implement in base object
    return resolve();
  },

  detach: function() {
    // TODO: implement in base object
    return resolve();
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

  /**
   * Default search uses simple text selection inside the panel.
   */
  onSearch: function(text, reverse) {
    Trace.sysout("PanelBase.onSearch; " + text);

    this.postContentMessage("onSearch", {
      text: text,
      reverse: reverse
    });
  },

  updateSearchBox: function(apply) {
  },

  // Preferences

  onPrefChanged: function(prefName) {
    this.postContentMessage("onPrefChanged", {
      prefName: prefName,
      newValue: prefs[prefName],
    });
  },

  // Theme

  onThemeChanged: function(newTheme, oldTheme) {
    this.postContentMessage("theme-changed", {
      newTheme: newTheme,
      oldTheme: oldTheme,
    });
  },

  /**
   * Executed by the Context object that is distributing "theme-switched"
   * event fired by XUL windows that includes theme-switching.js script.
   */
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

  onApplyTheme: function(win, oldTheme) {
    if (this.searchable) {
      this.updateSearchBox(true);
    }

    this.createTabMenu();

    // Emit select event, so the tab-menu is visible after
    // Firebug theme is activated.
    this.toolbox.emit("select", this.toolbox.currentToolId);
  },

  onUnapplyTheme: function(win, newTheme) {
    if (this.searchable) {
      this.updateSearchBox(true);
    }

    this.destroyTabMenu();
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
    Trace.sysout("PanelBase.onShow; " + this.id);
    this.tabMenu.onPanelShow();
  },

  /**
   * Executed by the framework when the panel is un-selected in the toolbox.
   */
  onHide: function() {
    Trace.sysout("PanelBase.onHide; " + this.id);
    this.tabMenu.onPanelHide();
  },

  // Accessors

  /**
   * Returns content document of the panel frame.
   */
  getPanelDocument: function() {
    return this.panelFrame.contentDocument;
  },

  /**
   * Returns content window of the panel frame.
   */
  getPanelWindow: function() {
    return this.panelFrame.contentWindow;
  }
});

// Helpers

function getToolbox(win) {
  let tab = getCurrentTab(win);
  if (tab) {
    let target = devtools.TargetFactory.forTab(tab);
    return gDevTools.getToolbox(target);
  }
}

function getCurrentTab(win) {
  if (win) {
    let browserDoc = win.top.document;

    // The browser (id='content') is null in case the Toolbox is
    // detached from the main browser window.
    let browser = browserDoc.getElementById("content");
    if (browser) {
      return browser.selectedTab;
    }
  }

  let browser = getMostRecentBrowserWindow();
  if (browser) {
    return browser.gBrowser.mCurrentTab;
  }
}

// Exports from this module
exports.PanelBase = PanelBase;
