/* See license.txt for terms of usage */

"use strict";

const { Cu, Ci, Cc } = require("chrome");

// Platform Services
const ioService = Cc["@mozilla.org/network/io-service;1"].getService(Ci.nsIIOService);

let Http = {};

Http.getResource = function(url) {
  try {
    let channel = ioService.newChannel(url, null, null);
    let input = channel.open();
    return readFromStream(input);
  }
  catch (e) {
  }
}

// Helpers

function readFromStream(stream, charset) {
  let sis = Cc["@mozilla.org/scriptableinputstream;1"].
    createInstance(Ci.nsIScriptableInputStream);
  sis.init(stream);

  let segments = [];
  for (let count = stream.available(); count; count = stream.available()) {
    segments.push(sis.readBytes(count));
  }

  sis.close();

  return segments.join("");
};

// Exports from this module
exports.Http = Http;
