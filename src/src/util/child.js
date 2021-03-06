// Checks to see if element is inside of another element
(() => {
  let d3selection;

  d3selection = require('./d3selection.js');

  module.exports = (parent, child) => {
    let node;
    if (!parent || !child) {
      return false;
    }
    if (d3selection(parent)) {
      parent = parent.node();
    }
    if (d3selection(parent)) {
      child = child.node();
    }
    node = child.parentNode;
    while (node !== null) {
      if (node === parent) {
        return true;
      }
      node = node.parentNode;
    }
    return false;
  };
}).call(this);
