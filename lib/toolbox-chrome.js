/* See license.txt for terms of usage */

"use strict";

module.metadata = {
  "stability": "experimental"
};

// Add-on SDK
const { Cu, Ci } = require("chrome");
const { EventTarget } = require("sdk/event/target");
const { extend } = require("sdk/core/heritage");
const { defer, resolve } = require("sdk/core/promise");

// Firebug SDK
const { Trace, TraceError } = require("./core/trace.js").get(module.id);
const { Context } = require("./context.js");
const { Dispatcher } = require("./dispatcher.js");

// DevTools
const { gDevTools } = Cu.import("resource:///modules/devtools/gDevTools.jsm", {});

/**
 * TODO docs
 */
var ToolboxChrome = extend(EventTarget.prototype,
/** @lends ToolboxChrome */
{
  // Initialization

  initialize: function() {
    this.initialized = true;
    this.contexts = new Map();
    this.registeredOverlays = new Map();

    // Bind DevTools event handlers.
    this.onToolboxCreated = this.onToolboxCreated.bind(this);
    this.onToolboxReady = this.onToolboxReady.bind(this);
    this.onToolboxDestroy = this.onToolboxDestroy.bind(this);
    this.onToolboxClosed = this.onToolboxClosed.bind(this);

    // Hook developer tools events.
    gDevTools.on("toolbox-created", this.onToolboxCreated);
    gDevTools.on("toolbox-ready", this.onToolboxReady);
    gDevTools.on("toolbox-destroy", this.onToolboxDestroy);
    gDevTools.on("toolbox-destroyed", this.onToolboxClosed);

    Dispatcher.emit("initialize");
  },

  shutdown: function() {
    gDevTools.off("toolbox-created", this.onToolboxCreated);
    gDevTools.off("toolbox-ready", this.onToolboxReady);
    gDevTools.off("toolbox-destroy", this.onToolboxDestroy);
    gDevTools.off("toolbox-destroyed", this.onToolboxClosed);

    Dispatcher.emit("shutdown");
  },

  // DevTools Event Handlers

  onToolboxCreated: function(eventId, toolbox) {
    Trace.sysout("ToolboxChrome.onToolboxCreated;", toolbox);

    // Make sure to create the toolbox context as soon as possible.
    // 'toolbox-created' has been introduced in Fx 39, so use
    // 'toolbox-ready' for previous versions.
    let context = this.getContext(toolbox);

    Dispatcher.emit("onToolboxCreated", arguments);
  },

  onToolboxReady: function(event, toolbox) {
    Trace.sysout("ToolboxChrome.onToolboxReady; ", toolbox);

    // Make sure to create the toolbox context as soon as possible.
    let context = this.getContext(toolbox);

    Dispatcher.emit("onToolboxReady", arguments);
  },

  onToolboxDestroy: function(eventId, target) {
    Trace.sysout("ToolboxChrome.onToolboxDestroy;", target);

    let context = this.contexts.get(target);
    if (!context) {
      Trace.sysout("ToolboxChrome.onToolboxDestroy; ERROR unknown target!",
        target);
      return;
    }

    Dispatcher.emit("onToolboxDestroy", arguments);

    this.contexts.delete(target);

    context.destroy();
  },

  onToolboxClosed: function(eventId, target) {
    Trace.sysout("ToolboxChrome.onToolboxClosed;", target);

    let context = this.contexts.get(target);
    if (!context) {
      Trace.sysout("ToolboxChrome.onToolboxClosed; ERROR unknown target!",
        target);
      return;
    }
  },

  // Overlays

  registerPanelOverlay: function(overlay) {
    let overlayId = overlay.prototype.overlayId;
    let panelId = overlay.prototype.panelId;

    Trace.sysout("ToolboxChrome.registerOverlay; " + overlayId, overlay);

    // Listen for panel initialization event.
    let onApplyOverlay = (eventId, toolbox, panelFrame) => {
      Trace.sysout("ToolboxChrome.onApplyOverlay; " + overlayId, panelFrame);

      let context = this.getContext(toolbox);

      // Bail out if the overlay already exists for this context/toolbox.
      if (context.getOverlay(overlayId)) {
        return;
      }

      try {
        // Create instance of an overlay
        let instance = new overlay({
          panelFrame: panelFrame,
          toolbox: toolbox,
          chrome: this,
          context: context
        });

        context.overlays.set(overlayId, instance);

        // Register for 'build' event (panel instance created).
        toolbox.once(panelId + "-build", (eventId, panel) => {
          Trace.sysout("ToolboxChrome.applyOverlay; " + eventId, panel);
          instance.onBuild({toolbox: toolbox, panel: panel});
        });

        // Register for 'ready' event (panel frame loaded).
        toolbox.once(panelId + "-ready", (eventId, panel) => {
          Trace.sysout("ToolboxChrome.applyOverlay; " + eventId, panel);
          instance.onReady({toolbox: toolbox, panel: panel});
        });
      }
      catch (err) {
        TraceError.sysout("ToolboxChrome.initialize; Overlay for: " +
          overlay.id + " EXCEPTION " + err, err);
      }
    };

    // Use 'on' (not 'once') listener since the '*-init' event is sent
    // every time the toolbox is closed and opened again. The listener
    // will be removed in destroyOverlay method when the extension is
    // destroyed.
    gDevTools.on(panelId + "-init", onApplyOverlay);

    this.registeredOverlays.set(overlayId, {
      ctor: overlay,
      creator: onApplyOverlay
    })
  },

  unregisterPanelOverlay: function(overlay) {
    let overlayId = overlay.prototype.overlayId;

    Trace.sysout("ToolboxChrome.unregisterOverlay; " + overlayId, overlay);

    let entry = this.registeredOverlays.get(overlayId);
    gDevTools.off(overlayId + "-init", entry.creator);

    this.registeredOverlays.delete(overlayId);
  },

  registerToolboxOverlay: function(overlay) {
    let overlayId = overlay.prototype.overlayId;

    Trace.sysout("ToolboxChrome.registerToolboxOverlay; " +
      overlayId, overlay);

    let onApplyOverlay = (eventId, toolbox) => {
      Trace.sysout("ToolboxChrome.onApplyToolboxOverlay; " +
        overlayId, toolbox);

      let context = this.getContext(toolbox);

      // Bail out if the overlay already exists for this context/toolbox.
      if (context.getOverlay(overlayId)) {
        return;
      }

      try {
        // Create instance of an overlay
        let instance = new overlay({
          toolbox: toolbox,
          chrome: this,
          context: context,
        });

        context.overlays.set(overlayId, instance);

        // Execute 'onReady' on the overlay instance when the toolbox
        // is ready. There are two options, (a) the toolbox is already
        // ready at this point (extension installed dynamically in the
        // middle of Firefox session), (b) the toolbox is not ready yet
        // and it's necessary to wait for the event.
        if (toolbox.isReady) {
          instance.onReady({toolbox: toolbox});
        } else {
          gDevTools.once("toolbox-ready", () => {
            instance.onReady({toolbox: toolbox});
          });
        }
      }
      catch (err) {
        TraceError.sysout("ToolboxChrome.initialize; Overlay for: " +
          overlay.id + " EXCEPTION " + err, err);
      }
    };

    // Use 'on' (not 'once') listener since the create event is sent
    // every time a toolbox is created (can be also on another browser tab).
    gDevTools.on("toolbox-created", onApplyOverlay);

    this.registeredOverlays.set(overlayId, {
      ctor: overlay,
      creator: onApplyOverlay
    })

    // Apply the overlay on all existing toolboxes. Registered toolbox
    // overlays must be always instantiated before registered panel
    // overlays.
    for (let [target, toolbox] of gDevTools._toolboxes) {
      toolbox.target.makeRemote().then(() => {
        onApplyOverlay(null, toolbox);
      });
    }
  },

  unregisterToolboxOverlay: function(overlay) {
    let overlayId = overlay.prototype.overlayId;

    Trace.sysout("ToolboxChrome.unregisterToolboxOverlay; " +
      overlayId, overlay);

    let entry = this.registeredOverlays.get(overlayId);
    gDevTools.off("toolbox-ready", entry.creator);

    this.registeredOverlays.delete(overlayId);
  },

  // Context

  getContext: function(toolbox) {
    let target = toolbox.target;
    let context = this.contexts.get(target);
    if (!context) {
      context = new Context(toolbox);
      this.contexts.set(target, context);
    }
    return context;
  },
});

function getToolboxWhenReady(toolId) {
  let deferred = defer();
  showToolbox(toolId).then(toolbox => {
    deferred.resolve(toolbox);
  });
  return deferred.promise;
}

// Exports from this module
exports.ToolboxChrome = ToolboxChrome;
