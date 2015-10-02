/* See license.txt for terms of usage */

"use strict";

define(function(require, exports/*, module*/) {

/**
 * This object represents a base for panel views. Panel view is
 * an object that is responsible for rendering of panel content.
 * Panel view lives in panel iframe and within content scope
 * with no extra privileges. The communication with the chrome
 * scope - i.e. with the panel is done through messages and
 * message manager.
 *
 * The view can use standard web technologies to render HTML.
 */
var PanelView =
/** @lends PanelView */
{
  onInitialize: function() {
    this.onChromeEvent = this.onChromeEvent.bind(this);

    // Events from the chrome scope (chrome messages are forwarded
    // as DOM events in panel-frame-script.js)
    addEventListener("firebug.sdk/chrome-event", this.onChromeEvent);

    // Make sure the document takes the entire available space
    // (vertically and horizontally).
    this.resizer = new Resizer(window);

    this.initialize();
  },

  initialize: function() {
    // TODO: implement in derived object.
  },

  // Connection to Chrome

  /**
   * Post events handled by panel-frame-script.js, it's consequently
   * forwarded to the chrome scope through message manager and
   * handled by a panel - an object derived from PanelBase
   * (Controller, chrome scope).
   *
   * @param type {String} Type of the message.
   * @param data {Object} Message data, must be serializable to JSON.
   */
  postChromeMessage: function(id, data) {
    const event = new MessageEvent("firebug.sdk/event", {
      data: {
        type: id,
        args: data,
      }
    });
    dispatchEvent(event);
  },

  /**
   * Handles 'firebug.sdk/chrome-event' DOM events and executes
   * directly a method that corresponds to the 'method' field.
   * This event is sent when a chrome message is fired from the
   * chrome scope (see base-panel.js).
   */
  onChromeEvent: function(event) {
    var data = event.data;
    var method = data.method;
    var args = data.args;

    if (typeof this[method] == "function") {
      this[method](args);

      // Set a flag that indicates that appropriate event handler
      // has been found and executed.
      data.processed = true;
    }
  }
}

// Create View

function createView(base, view) {
  var newView = {};
  for (var i=0; i<arguments.length; i++) {
    var ob = arguments[i];
    for (var prop in ob) {
      // Use property descriptor to clone also getters and setters.
      var pd = Object.getOwnPropertyDescriptor(ob, prop);
      if (pd) {
        Object.defineProperty(newView, prop, pd);
      } else {
        newView[prop] = ob[prop];
      }
    }
  }

  newView.onInitialize = newView.onInitialize.bind(newView);
  window.addEventListener("initialize", newView.onInitialize);

  // Content modules are loaded, send a message to the
  // parent panel (handled in panel-base.js).
  // The panel will send 'initialize' event back.
  newView.postChromeMessage("onContentReady");

  return newView;
}

// View Resizer

/**
 * This object is responsible for setting proper body height
 * when the window changes its size.
 */
function Resizer(win) {
  this.win = win;
  this.win.addEventListener("resize", this.onResize.bind(this));
  this.onResize();
}

Resizer.prototype =
/** @lends Resizer */
{
  onResize: function() {
    var doc = this.win.document;
    doc.body.style.height = this.win.innerHeight + "px";
    doc.body.style.width = this.win.innerWidth + "px";
  }
};

// Exports from this module
exports.PanelView = PanelView;
exports.createView = createView;
});
