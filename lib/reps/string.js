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
const StringRep = React.createFactory(React.createClass(
/** @lends StringRep */
{
  displayName: "String",

  render: function() {
    var text = this.props.object;
    var member = this.props.member;
    if (member && member.open) {
      return (
        ObjectBox({className: "string"},
          "\"" + text + "\""
        )
      )
    } else {
      return (
        ObjectBox({className: "string"},
          "\"" + cropMultipleLines(text) + "\""
        )
      )
    }
  },
}));

// Helpers

function escapeNewLines(value) {
  return value.replace(/\r/gm, "\\r").replace(/\n/gm, "\\n");
};

function cropMultipleLines(text, limit) {
  return escapeNewLines(cropString(text, limit));
};

function cropString(text, limit, alternativeText) {
  if (!alternativeText) {
    alternativeText = "...";
  }

  // Make sure it's a string.
  text = text + "";

  // Use default limit if necessary.
  if (!limit) {
    limit = 50;//Options.get("stringCropLength"); xxxHonza
  }

  // Crop the string only if a limit is actually specified.
  if (limit <= 0) {
    return text;
  }

  // Set the limit at least to the length of the alternative text
  // plus one character of the original text.
  if (limit <= alternativeText.length) {
    limit = alternativeText.length + 1;
  }

  var halfLimit = (limit - alternativeText.length) / 2;

  if (text.length > limit) {
    return text.substr(0, Math.ceil(halfLimit)) + alternativeText +
      text.substr(text.length - Math.floor(halfLimit));
  }

  return text;
};

function isCropped(value) {
  var cropLength = 50;//Options.get("stringCropLength"); xxxHonza
  return typeof(value) == "string" && value.length > cropLength;
}

// Registration

function supportsObject(object, type) {
  return (type == "string");
}

Reps.registerRep({
  rep: StringRep,
  supportsObject: supportsObject
});

// Exports from this module
exports.StringRep = StringRep;
exports.isCropped = isCropped;
});
