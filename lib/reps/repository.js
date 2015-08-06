/* See license.txt for terms of usage */

"use strict";

define(function(require, exports, module) {

/**
 * This module represents the public interface for extension.
 * It causes all data templates to be loaded and returns
 * reference to the template registry.
 *
 * Example:
 *
 * const { Reps } = require("reps/repository");
 *
 * // Generic JS value to render (primitive or object).
 * var value = ...
 *
 * // Get proper template for the JS value.
 * var rep = Reps.getRep(value);
 *
 * // Render
 * React.render(rep({object: value}), parentNode);
 */

// Load all existing rep templates
require("reps/regexp");
require("reps/stylesheet");
require("reps/event");
require("reps/date-time");
require("reps/css-rule");
require("reps/text-node");
require("reps/named-node-map");
require("reps/attribute");
require("reps/function");
require("reps/array");
require("reps/element");
require("reps/document");
require("reps/window");
require("reps/grip");
require("reps/undefined");
require("reps/null");
require("reps/string");
require("reps/number");
require("reps/object");

// Exports from this module
exports.Reps = require("reps/reps").Reps;
});
