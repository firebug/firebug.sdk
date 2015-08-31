/* See license.txt for terms of usage */

"use strict";

define(function(require, exports, module) {

// Dependencies
const React = require("react");
const { Reps } = require("reps/reps");
const { ObjectBox } = require("reps/object-box");
const { Caption } = require("reps/caption");
const { Url } = require("./core/url");

// Shortcuts
const { SPAN, A } = Reps.DOM;

/**
 * Template for native JS array object.
 */
var ArrayRep =
/** @lends ArrayRep */
{
  displayName: "ArrayRep",

  render: function() {
    var mode = this.props.mode || "short";
    var object = this.props.object;
    var hasTwisty = this.hasSpecialProperties(object);

    var items;

    if (mode == "tiny") {
      items = this.getLength(object);
    } else {
      // xxxHonza: prefs["ObjectShortIteratorMax"]
      var max = (mode == "short") ? 3 : 300;
      items = this.getItems(object, max);
    }

    return (
      ObjectBox({className: "array", onClick: this.onToggleProperties},
        A({className: "objectLink", onclick: this.onClickBracket},
          SPAN({className: "objectTitle"}, this.getTitle(object)),
          SPAN({className: "arrayLeftBracket", role: "presentation"}, "[")
        ),
        items,
        A({className: "objectLink", onclick: this.onClickBracket},
          SPAN({className: "arrayRightBracket", role: "presentation"}, "]")
        ),
        SPAN({className: "arrayProperties", role: "group"})
      )
    )
  },

  getLength: function(object) {
    return object.preview.length;
  },

  getTitle: function(object) {
    return object["class"] ? object["class"] : "";
  },

  getItems: function(array, max) {
    var items = this.arrayIterator(array, max);

    items = items.map(item => ItemRep(item));

    if (items.length > max + 1) {
      items.pop();
      items.push(Caption({
        key: "more",
        object: Locale.$STR("reps.more"),
      }));
    }

    return items;
  },

  arrayIterator: function(array, max) {
    var items = [];

    for (var i=0; i<array.length && i<=max; i++) {
      try {
        var delim = (i == array.length-1 ? "" : ", ");
        var value = array[i];

        // Cycle detected
        //if (value === array) {
        //  value = new Reps.ReferenceObj(value);
        //}

        items.push({
          key: i,
          object: value,
          delim: delim
        });
      }
      catch (exc) {
        items.push({object: exc, delim: delim, key: i});
      }
    }

    return items;
  },

  /**
   * Returns true if the passed object is an array with additional (custom)
   * properties, otherwise returns false. Custom properties should be
   * displayed in extra expandable section.
   *
   * Example array with a custom property.
   * let arr = [0, 1];
   * arr.myProp = "Hello";
   *
   * @param {Array} array The array object.
   */
  hasSpecialProperties: function(array) {
    function isInteger(x) {
      var y = parseInt(x, 10);
      if (isNaN(y)) {
        return false;
      }
      return x === y.toString();
    }

    var n = 0;
    var props = Object.getOwnPropertyNames(array);
    for (var i=0; i<props.length; i++) {
      var p = props[i];

      // Valid indexes are skipped
      if (isInteger(p)) {
        continue;
      }

      // Ignore standard 'length' property, anything else is custom.
      if (p != "length") {
        return true;
      }
    }

    return false;
  },

  // Event Handlers

  onToggleProperties: function(event) {
    // xxxHonza: TODO
  },

  onClickBracket: function(event) {
  }
};

/**
 * @rep
 */
var ItemRep = React.createFactory(React.createClass(
/** @lends ItemRep */
{
  displayName: "ItemRep",

  render: function(){
    var object = this.props.object;
    var delim = this.props.delim;
    var TAG = Reps.getRep(object);
    return (
      SPAN({},
        TAG({object: object}),
        delim
      )
    )
  }
}));

/**
 * Template for a Grip that represents an array.
 */
var GripArrayRep = Reps.extend(ArrayRep,
/** @lends GripArrayRep */
{
  displayName: "GripArrayRep",

  getLength: function(grip) {
    return grip.preview ? grip.preview.length : 0;
  },

  arrayIterator: function(grip, max) {
    var items = [];

    if (!grip.preview || !grip.preview.length) {
      return items;
    }

    var array = grip.preview.items;
    if (!array) {
      return items;
    }

    var provider = this.props.provider;
    if (!provider) {
      return items;
    }

    for (var i=0; i<array.length && i<=max; i++) {
      try {
        var delim = (i == array.length-1 ? "" : ", ");
        var value = provider.getValue(array[i]);

        // Cycle detected
        //if (value === array) {
        //  value = new ReferenceObj(value);
        //}

        items.push({
          key: i,
          object: value,
          delim: delim,
          provider: this.props.provider
        });
      }
      catch (exc) {
        items.push({object: exc, delim: delim, key: i});
      }
    }

    return items;
  },

  hasSpecialProperties: function(array) {
    return false;
  },
});

// Registration


var ArrayClass = React.createClass(ArrayRep);
var GripArrayClass = React.createClass(GripArrayRep);
var ArrayRepFactory = React.createFactory(ArrayClass);
var GripArrayRepFactory = React.createFactory(GripArrayClass);

// Native array support
function supportsObject(object, type) {
  return Array.isArray(object) ||
    Object.prototype.toString.call(object) === "[object Arguments]";
}

Reps.registerRep({
  rep: ArrayRepFactory,
  supportsObject: supportsObject
});

// Grip array support
function supportsObject(grip, type) {
  if (!Reps.isGrip(grip)) {
    return;
  }
  return (grip.preview && grip.preview.kind == "ArrayLike");
}

Reps.registerRep({
  rep: GripArrayRepFactory,
  supportsObject: supportsObject
});

// Exports from this module
exports.ArrayRep = ArrayRepFactory;
exports.ArrayComponent = ArrayRep;
exports.GripArrayRep = GripArrayRepFactory;
exports.GripArrayComponent = GripArrayRep;
});
