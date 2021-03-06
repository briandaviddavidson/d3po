/**
 * This function returns true if the variable passed is a literal javascript keyed Object.
 * It's a small, simple function, but it catches some edge-cases that can throw off your
 * code (such as Arrays and `null`).
 * @method d3po.object.validate
 * @for d3po.object
 * @param obj {Object} The object to validate.
 * @return {Boolean}
 */

(() => {
  module.exports = obj => obj && obj.constructor === Object;
}).call(this);
