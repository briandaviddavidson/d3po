// Function to process data by url or element
(() => {
  module.exports = (value, vars, method) => {
    let elem;
    if (vars.history) {
      vars.history.reset();
    }
    if (value.constructor === String) {
      if (value.indexOf('/') >= 0) {
        method.url = value;
        return [];
      }
      elem = d3.selectAll(value);
      if (elem.size()) {
        return elem;
      }
      if (value.indexOf('.') >= 0) {
        method.url = value;
      }
      return [];
    } else {
      return value;
    }
  };
}).call(this);
