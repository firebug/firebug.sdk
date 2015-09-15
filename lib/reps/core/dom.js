/* See license.txt for terms of usage */

"use strict";

define(function(require, exports, module) {

// Module implementation
var Dom = {};

Dom.clearNode = function(node) {
  node.textContent = "";
};

Dom.getAncestorByClass = function(node, className) {
  for (var parent = node; parent; parent = parent.parentNode) {
    if (parent.classList && parent.classList.contains(className)) {
      return parent;
    }
  }
  return null;
};

Dom.getAncestorByTagName = function(node, tagName) {
  for (var parent = node; parent; parent = parent.parentNode) {
    if (parent.localName && parent.tagName.toLowerCase() == tagName) {
      return parent;
    }
  }
  return null;
};

/**
 * Centers an element inside a scrollable area
 * @param {Object} element Element to scroll to
 * @param {Object} scrollBox Scrolled element (Must be an ancestor of
 * "element" or null for automatically determining the ancestor)
 * @param {Boolean} notX Specifies whether the element should be
 * centered horizontally
 * @param {Boolean} notY Specifies whether the element should be
 * centered vertically
 */
Dom.scrollIntoCenterView = function(element, scrollBox, notX, notY) {
  Dom.scrollTo(element, scrollBox, notX ? "none" : "centerOrLeft",
    notY ? "none" : "centerOrTop");
};

/**
 * Scrolls an element into view
 * @param {Object} element Element to scroll to
 * @param {Object} scrollBox Scrolled element (Must be an ancestor of
 * "element" or null for automatically determining the ancestor)
 * @param {String} alignmentX Horizontal alignment for the element
 * (valid values: "centerOrLeft", "left", "middle", "right", "none")
 * @param {String} alignmentY Vertical alignment for the element
 * (valid values: "centerOrTop", "top", "middle", "bottom", "none")
 * @param {Boolean} scrollWhenVisible Specifies whether "scrollBox"
 * should be scrolled even when "element" is completely visible
 */
// xxxHonza: fix code style
Dom.scrollTo = function(element, scrollBox, alignmentX, alignmentY,
  scrollWhenVisible) {
  if (!element) {
    return;
  }

  if (!scrollBox) {
    scrollBox = Dom.getOverflowParent(element);
  }

  if (!scrollBox) {
    return;
  }

  var offset = Dom.getAncestorOffset(element, scrollBox);

  if (!alignmentX) {
    alignmentX = "centerOrLeft";
  }

  if (!alignmentY) {
    alignmentY = "centerOrTop";
  }

  if (alignmentY) {
    var topSpace = offset.y - scrollBox.scrollTop;
    var bottomSpace = (scrollBox.scrollTop + scrollBox.clientHeight) -
      (offset.y + element.offsetHeight);

    var y;

    // Element is vertically not completely visible or scrolling is enforced
    if (topSpace < 0 || bottomSpace < 0 || scrollWhenVisible) {
      switch (alignmentY) {
        case "top":
          scrollBox.scrollTop = offset.y;
          break;

        case "center":
        case "centerOrTop":
          var elementFitsIntoScrollBox =
            element.offsetHeight <= scrollBox.clientHeight;
          y = elementFitsIntoScrollBox || alignmentY != "centerOrTop" ?
            offset.y - (scrollBox.clientHeight - element.offsetHeight) / 2 :
            offset.y;
          scrollBox.scrollTop = y;
          break;

        case "bottom":
          y = offset.y + element.offsetHeight - scrollBox.clientHeight;
          scrollBox.scrollTop = y;
          break;
      }
    }
  }

  if (alignmentX) {
    var leftSpace = offset.x - scrollBox.scrollLeft;
    var rightSpace = (scrollBox.scrollLeft + scrollBox.clientWidth) -
      (offset.x + element.clientWidth);

    var x;

    // Element is horizontally not completely visible or scrolling is enforced
    if (leftSpace < 0 || rightSpace < 0 || scrollWhenVisible) {
      switch (alignmentX) {
        case "left":
          scrollBox.scrollLeft = offset.x;
          break;

        case "center":
        case "centerOrLeft":
          var elementFitsIntoScrollBox =
            element.offsetWidth <= scrollBox.clientWidth;
          x = elementFitsIntoScrollBox || alignmentX != "centerOrLeft" ?
            offset.x - (scrollBox.clientWidth - element.offsetWidth) / 2 :
            offset.x;
          scrollBox.scrollLeft = x;
          break;

        case "right":
          x = offset.x + element.offsetWidth - scrollBox.clientWidth;
          scrollBox.scrollLeft = x;
          break;
      }
    }
  }

  Trace.sysout("dom.scrollTo;", element);
};

/**
 * Get the next scrollable ancestor
 * @param {Object} element Element to search the ancestor for
 * @returns {Object} Scrollable ancestor
 */
Dom.getOverflowParent = function(element) {
  for (var scrollParent = element.parentNode; scrollParent;
    scrollParent = scrollParent.offsetParent) {
    if (scrollParent.scrollHeight > scrollParent.offsetHeight) {
      return scrollParent;
    }
  }
};

/**
 * Gets the offset of an element relative to an ancestor
 * @param {Element} elt Element to get the info for
 * @param {Element} ancestor Ancestor element used as origin
 */
Dom.getAncestorOffset = function(elt, ancestor) {
  var offset = { x: 0, y: 0 };
  var offsetParent = elt;
  do {
    offset.x += offsetParent.offsetLeft;
    offset.y += offsetParent.offsetTop;
    offsetParent = offsetParent.offsetParent;
  } while (offsetParent && offsetParent !== ancestor);

  return offset;
};

Dom.addScript = function(doc, id, src) {
  var element = doc.getElementById(id);
  if (element) {
    return element;
  }

  element = doc.createElementNS("http://www.w3.org/1999/xhtml", "html:script");
  element.setAttribute("type", "text/javascript");
  element.setAttribute("id", id);
  element.textContent = src;

  if (doc.documentElement) {
    doc.documentElement.appendChild(element);
  }
  else {
    // See issue 1079, the svg test case gives this error
    TraceError.sysout("dom.addScript; ERROR doc has no documentElement (" +
      doc.readyState + ") " + doc.location, doc);
    return;
  }

  return element;
};

Dom.loadScript = function(doc, src, successCallback) {
  var script = doc.createElementNS("http://www.w3.org/1999/xhtml", "html:script");
  script.type = "text/javascript";
  script.async = true;
  script.src = src;
  script.addEventListener("load", event => {
    successCallback(event);
  });

  doc.documentElement.appendChild(script);

  return script;
};

// Exports from this module
exports.Dom = Dom;
});
