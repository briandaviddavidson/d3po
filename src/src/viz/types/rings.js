const arraySort = require('../../array/sort.js');
const events = require('../../client/pointer.js');
const fetchValue = require('../../core/fetch/value.js');
const fetchColor = require('../../core/fetch/color.js');
const legible = require('../../color/legible.js');
const removeTooltip = require('../../tooltip/remove.js');
const smallestGap = require('../../network/smallestgap.js');
const textColor = require('../../color/text.js');
const uniqueValues = require('../../util/uniques.js');

const rings = vars => {
  let radius = d3.min([vars.height.viz, vars.width.viz]) / 2;

  const ring_width =
    vars.small || !vars.labels.value
      ? (radius - vars.labels.padding * 2) / 2
      : radius / 3;

  const primaryRing =
    vars.small || !vars.labels.value ? ring_width * 1.4 : ring_width;

  const secondaryRing = ring_width * 2;
  const edges = [];
  let nodes = [];

  let center = vars.data.viz.filter(
    d => d[vars.id.value] === vars.focus.value[0]
  )[0];

  if (!center) {
    center = {
      d3po: {}
    };
    center[vars.id.value] = vars.focus.value[0];
  }

  center.d3po.x = vars.width.viz / 2;
  center.d3po.y = vars.height.viz / 2;
  center.d3po.r = primaryRing * 0.65;

  let primaries = [];
  const claimed = [vars.focus.value[0]];
  vars.edges.connections(vars.focus.value[0], vars.id.value).forEach(edge => {
    const c =
      edge[vars.edges.source][vars.id.value] == vars.focus.value[0]
        ? edge[vars.edges.target]
        : edge[vars.edges.source];
    let n = vars.data.viz.filter(d => d[vars.id.value] === c[vars.id.value])[0];

    if (!n) {
      n = {
        d3po: {}
      };
      n[vars.id.value] = c[vars.id.value];
    }

    n.d3po.edges = vars.edges
      .connections(n[vars.id.value], vars.id.value)
      .filter(
        c =>
          c[vars.edges.source][vars.id.value] != vars.focus.value[0] &&
          c[vars.edges.target][vars.id.value] != vars.focus.value[0]
      );
    n.d3po.edge = edge;
    claimed.push(n[vars.id.value]);
    primaries.push(n);
  });

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Sort primary nodes by children (smallest to largest) and then by sort
  // order.
  //--------------------------------------------------------------------------
  const sort =
    vars.order.value || vars.color.value || vars.size.value || vars.id.value;

  primaries.sort((a, b) => {
    const lengthdiff = a.d3po.edges.length - b.d3po.edges.length;

    if (lengthdiff) {
      return lengthdiff;
    } else {
      return arraySort(
        [a, b],
        sort,
        vars.order.sort.value,
        vars.color.value || [],
        vars
      );
    }
  });

  if (typeof vars.edges.limit.value == 'number') {
    primaries = primaries.slice(0, vars.edges.limit.value);
  } else if (typeof vars.edges.limit.value == 'function') {
    primaries = vars.edges.limit.value(primaries);
  }

  //^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
  // Check for similar children and give preference to nodes with less
  // overall children.
  //----------------------------------------------------------------------------
  const secondaries = [];

  let total = 0;
  primaries.forEach(p => {
    const primaryId = p[vars.id.value];

    p.d3po.edges = p.d3po.edges.filter(c => {
      const source = c[vars.edges.source][vars.id.value];
      const target = c[vars.edges.target][vars.id.value];
      return (
        (claimed.indexOf(source) < 0 && target == primaryId) ||
        (claimed.indexOf(target) < 0 && source == primaryId)
      );
    });

    total += p.d3po.edges.length || 1;

    p.d3po.edges.forEach(c => {
      const source = c[vars.edges.source];
      const target = c[vars.edges.target];
      const claim = target[vars.id.value] == primaryId ? source : target;
      claimed.push(claim[vars.id.value]);
    });
  });

  arraySort(
    primaries,
    sort,
    vars.order.sort.value,
    vars.color.value || [],
    vars
  );

  let offset = 0;
  const radian = Math.PI * 2;

  primaries.forEach((p, i) => {
    const children = p.d3po.edges.length || 1;
    const space = (radian / total) * children;

    if (i == 0) {
      offset -= space / 2;
    }

    let angle = offset + space / 2;
    angle -= radian / 4;

    p.d3po.radians = angle;
    p.d3po.x = vars.width.viz / 2 + primaryRing * Math.cos(angle);
    p.d3po.y = vars.height.viz / 2 + primaryRing * Math.sin(angle);

    offset += space;
    p.d3po.edges.sort((a, b) => {
      const a1 =
        a[vars.edges.source][vars.id.value] == p[vars.id.value]
          ? a[vars.edges.target]
          : a[vars.edges.source];

      const b1 =
        b[vars.edges.source][vars.id.value] == p[vars.id.value]
          ? b[vars.edges.target]
          : b[vars.edges.source];

      return arraySort(
        [a1, b1],
        sort,
        vars.order.sort.value,
        vars.color.value || [],
        vars
      );
    });

    p.d3po.edges.forEach((edge, i) => {
      const c =
        edge[vars.edges.source][vars.id.value] == p[vars.id.value]
          ? edge[vars.edges.target]
          : edge[vars.edges.source];

      const s = radian / total;

      let d = vars.data.viz.filter(
        a => a[vars.id.value] === c[vars.id.value]
      )[0];

      if (!d) {
        d = {
          d3po: {}
        };
        d[vars.id.value] = c[vars.id.value];
      }

      const a = angle - (s * children) / 2 + s / 2 + s * i;
      d.d3po.radians = a;
      d.d3po.x = vars.width.viz / 2 + secondaryRing * Math.cos(a);
      d.d3po.y = vars.height.viz / 2 + secondaryRing * Math.sin(a);
      secondaries.push(d);
    });
  });

  let primaryDistance = smallestGap(primaries, {
    accessor: function(n) {
      return [n.d3po.x, n.d3po.y];
    }
  });

  let secondaryDistance = smallestGap(secondaries, {
    accessor: function(n) {
      return [n.d3po.x, n.d3po.y];
    }
  });

  if (!primaryDistance) {
    primaryDistance = ring_width / 2;
  }

  if (!secondaryDistance) {
    secondaryDistance = ring_width / 4;
  }
  let primaryMax;
  if (primaryDistance / 2 - 4 < 8) {
    primaryMax = d3.min([primaryDistance / 2, 8]);
  } else {
    primaryMax = primaryDistance / 2 - 4;
  }

  let secondaryMax;
  if (secondaryDistance / 2 - 4 < 4) {
    secondaryMax = d3.min([secondaryDistance / 2, 4]);
  } else {
    secondaryMax = secondaryDistance / 2 - 4;
  }

  if (secondaryMax > ring_width / 10) {
    secondaryMax = ring_width / 10;
  }

  if (secondaryMax > primaryMax && secondaryMax > 10) {
    secondaryMax = primaryMax * 0.75;
  }
  if (primaryMax > secondaryMax * 1.5) {
    primaryMax = secondaryMax * 1.5;
  }

  primaryMax = Math.floor(primaryMax);
  secondaryMax = Math.floor(secondaryMax);

  let ids = uniqueValues(primaries, vars.id.value, fetchValue, vars);
  ids = ids.concat(uniqueValues(secondaries, vars.id.value, fetchValue, vars));
  ids.push(vars.focus.value[0]);

  const data = vars.data.viz.filter(d => ids.indexOf(d[vars.id.value]) >= 0);

  if (vars.size.value) {
    const domain = d3.extent(data, d => fetchValue(vars, d, vars.size.value));

    if (domain[0] == domain[1]) {
      domain[0] = 0;
    }

    radius = d3.scale
      .linear()
      .domain(domain)
      .rangeRound([3, d3.min([primaryMax, secondaryMax])]);

    const val = fetchValue(vars, center, vars.size.value);
    center.d3po.r = radius(val);
  } else {
    radius = d3.scale
      .linear()
      .domain([1, 2])
      .rangeRound([primaryMax, secondaryMax]);

    if (vars.edges.label) {
      center.d3po.r = radius(1) * 1.5;
    }
  }

  secondaries.forEach(s => {
    s.d3po.ring = 2;
    const val = vars.size.value ? fetchValue(vars, s, vars.size.value) : 2;
    s.d3po.r = radius(val);
  });

  primaries.forEach(p => {
    p.d3po.ring = 1;
    const val = vars.size.value ? fetchValue(vars, p, vars.size.value) : 1;
    p.d3po.r = radius(val);
  });

  nodes = [center].concat(primaries).concat(secondaries);

  primaries.forEach(p => {
    const check = [vars.edges.source, vars.edges.target];
    const edge = p.d3po.edge;

    check.forEach(node => {
      edge[node] = nodes.filter(
        n => n[vars.id.value] == edge[node][vars.id.value]
      )[0];
    });

    delete edge.d3po;
    edges.push(edge);

    vars.edges.connections(p[vars.id.value], vars.id.value).forEach(edge => {
      const c =
        edge[vars.edges.source][vars.id.value] == p[vars.id.value]
          ? edge[vars.edges.target]
          : edge[vars.edges.source];

      if (c[vars.id.value] != center[vars.id.value]) {
        let target = secondaries.filter(
          s => s[vars.id.value] == c[vars.id.value]
        )[0];

        if (!target) {
          target = primaries.filter(
            s => s[vars.id.value] == c[vars.id.value]
          )[0];
        }

        if (target) {
          edge.d3po = {
            spline: true,
            translate: {
              x: vars.width.viz / 2,
              y: vars.height.viz / 2
            }
          };

          const check = [vars.edges.source, vars.edges.target];

          check.forEach((node, i) => {
            edge[node] = nodes.filter(
              n => n[vars.id.value] == edge[node][vars.id.value]
            )[0];

            if (edge[node].d3po.edges === undefined) {
              edge[node].d3po.edges = {};
            }

            const oppID =
              i === 0
                ? edge[vars.edges.target][vars.id.value]
                : edge[vars.edges.source][vars.id.value];

            if (edge[node][vars.id.value] == p[vars.id.value]) {
              edge[node].d3po.edges[oppID] = {
                angle: p.d3po.radians + Math.PI,
                radius: ring_width / 2
              };
            } else {
              edge[node].d3po.edges[oppID] = {
                angle: target.d3po.radians,
                radius: ring_width / 2
              };
            }
          });

          edges.push(edge);
        }
      }
    });
  });

  let labelColor = false;
  if (
    vars.background.value &&
    ['transparent', 'none'].indexOf(vars.background.value) < 0 &&
    d3.hsl(vars.background.value).l < 0.5
  ) {
    labelColor = textColor(vars.background.value);
  }

  nodes.forEach(n => {
    if (!vars.small && vars.labels.value) {
      if (n[vars.id.value] != vars.focus.value[0]) {
        n.d3po.rotate = n.d3po.radians * (180 / Math.PI);

        let angle = n.d3po.rotate;
        const width = ring_width - vars.labels.padding * 3 - n.d3po.r;
        let buffer;
        let anchor;
        if (angle < -90 || angle > 90) {
          angle = angle - 180;
          (buffer = -(n.d3po.r + width / 2 + vars.labels.padding)),
          (anchor = 'end');
        } else {
          (buffer = n.d3po.r + width / 2 + vars.labels.padding),
          (anchor = 'start');
        }

        const background = primaries.indexOf(n) >= 0 ? true : false;

        var height = n.d3po.ring == 1 ? primaryDistance : secondaryDistance;

        n.d3po.label = {
          x: buffer,
          y: 0,
          w: width,
          h: height,
          angle: angle,
          anchor: anchor,
          valign: 'center',
          color: labelColor || legible(fetchColor(vars, n)),
          resize: [8, vars.labels.font.size],
          background: background,
          mouse: true
        };
      } else if (vars.size.value || vars.edges.label) {
        height = primaryRing - n.d3po.r * 2 - vars.labels.padding * 2;

        n.d3po.label = {
          x: 0,
          y: n.d3po.r + height / 2,
          w: primaryRing,
          h: height,
          color: labelColor || legible(fetchColor(vars, n)),
          resize: [10, 40],
          background: true,
          mouse: true
        };
      } else {
        delete n.d3po.rotate;
        delete n.d3po.label;
      }
    } else {
      delete n.d3po.rotate;
      delete n.d3po.label;
    }
  });

  vars.mouse.viz = {};
  vars.mouse.viz[events.click] = d => {
    if (d[vars.id.value] != vars.focus.value[0]) {
      removeTooltip(vars.type.value);
      const old_focus = vars.focus.value[0];
      vars.history.states.push(() => {
        vars.self.focus(old_focus).draw();
      });
      vars.self.focus(d[vars.id.value]).draw();
    }
  };

  return {
    edges: edges,
    nodes: nodes,
    data: data
  };
};

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Visualization Settings and Helper Functions
//------------------------------------------------------------------------------
rings.filter = (vars, data) => {
  const primaries = vars.edges.connections(
    vars.focus.value[0],
    vars.id.value,
    true
  );

  let secondaries = [];

  primaries.forEach(p => {
    secondaries = secondaries.concat(
      vars.edges.connections(p[vars.id.value], vars.id.value, true)
    );
  });

  const connections = primaries.concat(secondaries);
  const ids = uniqueValues(connections, vars.id.value, fetchValue, vars);
  const returnData = [];

  ids.forEach(id => {
    const d = data.filter(d => d[vars.id.value] == id)[0];

    if (!d) {
      const obj = {
        d3po: {}
      };
      obj[vars.id.value] = id;
      returnData.push(obj);
    } else {
      returnData.push(d);
    }
  });

  return returnData;
};
rings.nesting = false;
rings.scale = 1;
rings.shapes = ['circle', 'square', 'donut'];
rings.requirements = ['edges', 'focus'];
rings.tooltip = 'static';

module.exports = rings;
