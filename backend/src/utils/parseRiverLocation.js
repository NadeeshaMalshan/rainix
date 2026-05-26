const { text } = require("express");

exports.parseRiverLocation =(text) => {
    const match = text.match(/(.*)\((.*)\)/);

    if (!match) {
        return {
      river: text,
      city: null
    };
    }

    return {
        river: match[1].trim(),
        city: match[2].trim()
    };
}