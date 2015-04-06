/* See license.txt for terms of usage */

"use strict";

define(function(require, exports, module) {

// Dependencies
const React = require("react");
const { Reps } = require("reps/reps");
const { ObjectBox } = require("reps/object-box");

/**
 * @template TODO docs
 */
const Null = React.createClass({
/** @lends Null */

  displayName: "NullRep",

  render: function() {
    return (
      ObjectBox({className: "null"},
        "null"
      )
    )
  },
});

// Registration

function supportsObject(object, type) {
  // xxxHonza: how to check the grip?
  if (object && object.type && object.type == "null") {
    return true;
  }

  return (object == null);
}

Reps.registerRep({
  rep: React.createFactory(Null),
  supportsObject: supportsObject
});

exports.Null = React.createFactory(Null);
});
