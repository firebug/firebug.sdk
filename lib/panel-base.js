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

// Firebug.SDK
const { Locale } = require("firebug.sdk/lib/core/locale.js");
const { Content } = require("firebug.sdk/lib/core/content.js");
const { ToolboxChrome } = require("firebug.sdk/lib/toolbox-chrome.js");
const { devtools, gDevTools } = require("firebug.sdk/lib/core/devtools.js");

// Platform
const { Services } = Cu.import("resource://gre/modules/Services.jsm", {});

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

  /**
   * Executed by the framework when an instance of this panel is created.
   * There is one instance of this panel per {@Toolbox}. The panel is
   * instantiated when selected in the toolbox for the first time.
   */
  initialize: function(options) {
    console.log("PanelBase.initialize;", options);

    this.onContentMessage = this.onContentMessage.bind(this);
    this.onThemeChanged = this.onThemeChanged.bind(this);
  },

  /**
   * Executed by the framework when the panel is destroyed.
   */
  dispose: function() {
    console.log("PanelBase.dispose;");

    this.detach();
  },

 /**
  * Executed by the framework when the panel content iframe is
  * constructed. Allows e.g to connect the backend through
  * `debuggee` object
  */
  setup: function(options) {
    console.log("PanelBase.setup;", options);

    this.debuggee = options.debuggee;
    this.panelFrame = viewFor(this);
    this.toolbox = getToolbox(this.panelFrame.contentWindow);

    ToolboxChrome.on("theme-changed", this.onThemeChanged);

    this.attach();
  },

  onReady: function() {
    console.log("PanelBase.onReady;");

    // Load content script and register message handler.
    let { messageManager } = this.panelFrame.frameLoader;
    if (messageManager) {
      let url = module.uri.replace("panel-base.js", "panel-frame-script.js");
      messageManager.loadFrameScript(url, false);
      messageManager.addMessageListener("firebug.sdk/message", this.onContentMessage);
    }
  },

  onThemeChanged: function(newTheme, oldTheme) {
    this.postContentMessage("theme-changed", {
      newTheme: newTheme,
      oldTheme: oldTheme,
    });
  },

  // Events from the View (myView.html)

  onContentReady: function(args) {
    console.log("PanelBase.onContentReady()", args);

    let win = this.panelFrame.contentWindow;
    let theme = {
      getDefinition: function(themeId) {
        let view = Content.getContentView(win);
        let def = gDevTools.getThemeDefinition(themeId);
        return view.JSON.parse(JSON.stringify(def));
      },
      loadSheet: function(url) {
        loadSheet(win, url, "author");
      },
      removeSheet: function(win, url) {
        removeSheet(win, url, "author");
      },
      getCurrentTheme: function() {
        return Services.prefs.getCharPref("devtools.theme");
      }
    }

    Content.exportIntoContentScope(win, Locale, "Locale");
    Content.exportIntoContentScope(win, theme, "Theme");

    this.postContentMessage("initialize", {
      currentTheme: Services.prefs.getCharPref("devtools.theme")
    });
  },

  /**
   * Handle messages coming from the view (PanelBase.html)
   */
  onContentMessage: function(msg) {
    console.log("PanelBase.onContentMessage;", msg);

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
    let { messageManager } = this.panelFrame.frameLoader;
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
