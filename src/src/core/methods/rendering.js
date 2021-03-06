(() => {
  module.exports = rendering => {
    let accepted;
    accepted = ['auto', 'optimizeSpeed', 'crispEdges', 'geometricPrecision'];
    if (!(accepted.indexOf(rendering) >= 0)) {
      rendering = 'crispEdges';
    }
    return {
      accepted: accepted,
      value: rendering
    };
  };
}).call(this);
