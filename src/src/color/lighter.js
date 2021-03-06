// Lightens a color
(() => {
  module.exports = (color, increment) => {
    let c;
    if (increment === void 0) {
      increment = 0.5;
    }
    c = d3.hsl(color);
    increment = (1 - c.l) * increment;
    c.l += increment;
    c.s -= increment;
    return c.toString();
  };
}).call(this);
