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

/**
 * Returns a formatted time string
 *
 * Examples:
 * Str.formatTime(12345678) => default formatting options => "3h 25m 45.678s"
 * Str.formatTime(12345678, "ms") => use milliseconds as min. time unit => "3h 25m 45s 678ms"
 * Str.formatTime(12345678, null, "m") => use minutes as max. time unit => "205m 45.678s"
 * Str.formatTime(12345678, "m", "h") => use minutes as min. and hours as max. time unit
 *     => "3h 25.7613m"
 *
 * @param {Integer} time Time to format in milliseconds
 * @param {Integer} [minTimeUnit=1] Minimal time unit to use in the formatted string
 *     (default is seconds)
 * @param {Integer} [maxTimeUnit=4] Maximal time unit to use in the formatted string
 *     (default is days)
 * @returns {String} Formatted time string
 */
Str.formatTime = function(time, minTimeUnit, maxTimeUnit, decimalPlaces)
{
    var time = parseInt(time);

    if (isNaN(time))
        return "";

    var timeUnits = [
        {
            unit: "ms",
            interval: 1000
        },
        {
            unit: "s",
            interval: 60
        },
        {
            unit: "m",
            interval: 60
        },
        {
            unit: "h",
            interval: 24
        },
        {
            unit: "d",
            interval: 1
        },
    ];

    if (time == -1)
    {
        return "";
    }
    else
    {
        // Get the index of the min. and max. time unit and the decimal places
        var minTimeUnitIndex = (Math.abs(time) < 1000) ? 0 : 1;
        var maxTimeUnitIndex = timeUnits.length - 1;

        for (var i=0, len=timeUnits.length; i<len; ++i)
        {
            if (timeUnits[i].unit == minTimeUnit)
                minTimeUnitIndex = i;
            if (timeUnits[i].unit == maxTimeUnit)
                maxTimeUnitIndex = i;
        }

        if (!decimalPlaces)
            decimalPlaces = (Math.abs(time) >= 60000 && minTimeUnitIndex == 1 ? 0 : 2);

        // Calculate the maximal time interval
        var timeUnitInterval = 1;
        for (var i=0; i<maxTimeUnitIndex; ++i)
            timeUnitInterval *= timeUnits[i].interval;

        var formattedString = (time < 0 ? "-" : "");
        time = Math.abs(time);
        for (var i=maxTimeUnitIndex; i>=minTimeUnitIndex; --i)
        {
            var value = time / timeUnitInterval;
            if (i != minTimeUnitIndex)
            {
                if (value < 0)
                    value = Math.ceil(value);
                else
                    value = Math.floor(value);
            }
            else
            {
                var decimalFactor = Math.pow(10, decimalPlaces);
                value = Math.round(value * decimalFactor) / decimalFactor;
            }

            if (value != 0 || (i == minTimeUnitIndex && formattedString == ""))
                formattedString += value.toLocaleString() + timeUnits[i].unit + " ";
            time %= timeUnitInterval;
            if (i != 0)
                timeUnitInterval /= timeUnits[i - 1].interval;
        }

        return formattedString.trim();
    }
};

exports.Str = Str;
});
