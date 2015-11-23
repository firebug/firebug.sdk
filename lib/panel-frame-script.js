/* See license.txt for terms of usage */

"use strict";

/**
 * This module (a frame script) is responsible for communication
 * between the content (view) and chrome (panel) scopes.
 * The communication is based on a message manager and DOM events.
 *
 * Message sent from chrome to content:
 * chrome -> message -> frame script -> DOM Event -> content
 *
 * Message sent content to chrome:
 * content -> DOM Event -> frame script -> message -> content
 *
 * There are three types of events/message
 * 1) 'firebug.sdk/message' message used to sent data between the
 *    message manager and frame script.
 * 2) 'firebug.sdk/event' DOM Event type used to sent events from
 *    the content (view) to the frame script.
 * 3) 'firebug.sdk/chrome-event' DOM Event type used to sent events
 *    from the frame script to the content (view).
 */
(function({
  content,
  addMessageListener,
  sendAsyncMessage,
  removeMessageListener,
  addEventListener}) {

const Cu = Components.utils;
const Cc = Components.classes;
const Ci = Components.interfaces;

const document = content.document;
const window = content;

/**
 * Register a listener for messages from a panel (Controller, chrome scope).
 * A message from chrome scope comes through a message manager.
 * It's further distributed as DOM event, so it can be handled by
 * views (View, content scope).
 */
addMessageListener("firebug.sdk/message", message => {
  const { type, data } = message.data;
  var msgData = data ? window.wrappedJSObject.JSON.parse(JSON.stringify(data)) : null;

  // Fire generic event that is directly mapped to method calls.
  // See panel-view.js for more details about how the event is
  // processed in the window.
  var contentData = new window.Object();
  contentData.data = new window.Object();
  contentData.data.method = type;
  contentData.data.args = msgData;
  contentData.data.processed = false;

  event = new window.MessageEvent("firebug.sdk/chrome-event", contentData);
  window.dispatchEvent(event);

  // Do not distribute the event further. It's been already processed.
  if (contentData.data.processed) {
    return;
  }

  // Fire standard event using the 'type' field. The consumer can
  // register an event listener as follows:
  // window.addEventListener(type, event => {});
  contentData = new window.Object();
  contentData.data = msgData;
  var event = new window.MessageEvent(type, contentData);
  window.dispatchEvent(event);
});

/**
 * Send a message to the parent myPanel.js (Controller, chrome scope).
 */
function postChromeMessage(id, args) {
  const event = {
    type: id,
    args: args,
  };

  sendAsyncMessage("firebug.sdk/message", event);
}

/**
 * Register a listener for DOM events from myView.js (View, content scope).
 * It's further distributed as a message through message manager to
 * myPanel.js (Controller, chrome scope).
 */
window.addEventListener("firebug.sdk/event", function (event) {
  const data = event.data;
  postChromeMessage(data.type, data.args);
}, true);

// End of scope
})(this);
