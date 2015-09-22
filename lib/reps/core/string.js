/* See license.txt for terms of usage */

"use strict";

define(function(require, exports, module) {

var Str = {};

Str.cropString = function(text, limit, alternativeText)
{
  if (!alternativeText) {
    alternativeText = "...";
  }

  // Make sure it's a string.
  text = String(text);

  // Use default limit if necessary.
  if (!limit) {
    limit = 50;//prefs["stringCropLength"];
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

Str.escapeNewLines = function(value) {
  return value.replace(/\r/gm, "\\r").replace(/\n/gm, "\\n");
};

Str.cropMultipleLines = function(text, limit) {
  return this.escapeNewLines(this.cropString(text, limit));
};

Str.formatSize = function(bytes) {
  var negative = (bytes < 0);
  bytes = Math.abs(bytes);

  var sizePrecision = 2;

  // Get size precision (number of decimal places from the preferences)
  // and make sure it's within limits.
  sizePrecision = (sizePrecision > 2) ? 2 : sizePrecision;
  sizePrecision = (sizePrecision < -1) ? -1 : sizePrecision;

  var result;

  if (sizePrecision == -1) {
    result = bytes + " B";
  }

  var precision = Math.pow(10, sizePrecision);

  if (bytes == -1 || bytes == undefined) {
    return "?";
  }
  else if (bytes == 0) {
    return "0 B";
  }
  else if (bytes < 1024) {
    result = bytes.toLocaleString() + " B";
  }
  else if (Math.round(bytes / 1024 * precision) / precision < 1024) {
    result = Str.toFixedLocaleString(bytes / 1024, sizePrecision) + " KB";
  }
  else {
    result = Str.toFixedLocaleString(bytes / (1024 * 1024), sizePrecision) + " MB";
  }

  return negative ? "-" + result : result;
};

Str.toFixedLocaleString = function(number, decimals) {
  // Check whether 'number' is a valid number
  if (isNaN(parseFloat(number))) {
    throw new Error("Value '" + number +
      "' of the 'number' parameter is not a number");
  }

  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(number);
};

exports.Str = Str;
});
