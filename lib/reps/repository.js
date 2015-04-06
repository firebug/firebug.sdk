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
require("reps/undefined");
require("reps/null");
require("reps/string");
require("reps/number");
require("reps/array");
require("reps/object");

// Exports from this module
exports.Reps = require("reps/reps").Reps;
});
