/* See license.txt for terms of usage */

"use strict";

define(function(require, exports, module) {

// Dependencies
const React = require("react");
const { Reps } = require("reps/reps");
const { A, SPAN } = Reps.DOM;

/**
 * @template Generic link template. Used for all UI elements that
 * should behave as links and navigate the user thorough the UI.
 */
const ObjectLink = React.createClass(
/** @lends ObjectLink */
{
  displayName: "ObjectLink",

  render: function() {
    var className = this.props.className;
    var objectClassName = className ? " objectLink-" + className : "";
    var linkClassName = "objectLink" + objectClassName + " a11yFocus";

    return (
      SPAN({className: linkClassName, onClick: this.onClick},
        this.props.children
      )
    )
  },

  onClick: function(event) {
    if (!this.props.object) {
      return;
    }

    event.stopPropagation();
    event.preventDefault();

    // Fire generic event for UI navigation. E.g. clicking on
    // an element object navigates the user to the Inspector
    // panel.
    var customEvent = new CustomEvent("fbsdk:navigate", {
      detail: {
        repObject: this.props.object
      }
    });

    var target = event.target;
    target.dispatchEvent(customEvent);
  }
});

// Exports from this module
exports.ObjectLink = React.createFactory(ObjectLink);
});
