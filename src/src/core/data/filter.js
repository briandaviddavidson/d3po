const fetchValue = require('../fetch/value.js');
const print = require('../console/print.js');
const validObject = require('../../object/validate.js');
//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Restricts data based on Solo/Mute filters
//------------------------------------------------------------------------------
module.exports = (vars, data) => {
  if (vars.dev.value) {
    print.time('filtering data');
  }

  let availableKeys = d3.keys(vars.data.keys || {});

  if ('attrs' in vars) {
    availableKeys = availableKeys.concat(d3.keys(vars.attrs.keys || {}));
  }

  data = data.filter(d => {
    const val = fetchValue(vars, d, vars.id.value);
    return val !== null;
  });

  const typeReqs = vars.types[vars.type.value].requirements || [];

  vars.data.filters.forEach(key => {
    if (
      availableKeys.indexOf(vars[key].value) >= 0 &&
      typeReqs.indexOf(key) >= 0
    ) {
      data = data.filter(d => {
        let val = fetchValue(vars, d, vars[key].value);

        if (key === 'y' && vars.y2.value && val === null) {
          val = fetchValue(vars, d, vars.y2.value);
        } else if (key === 'x' && vars.x2.value && val === null) {
          val = fetchValue(vars, d, vars.x2.value);
        }

        if (key === 'size') {
          return typeof val === 'number';
        } else {
          return val !== null;
        }
      });
    }
  });

  // if "solo", only check against "solo" (disregard "mute")
  const key = vars.data.solo.length ? 'solo' : 'mute';

  if (vars.data[key].length) {
    vars.data[key].forEach(v => {
      function test_value(val) {
        const arr = vars[v][key].value;

        let match = false;
        arr.forEach(f => {
          if (typeof f === 'function') {
            match = f(val);
          } else if (f === val) {
            match = true;
          }
        });

        return key === 'solo' ? match : !match;
      }

      function filter_data(d, flat) {
        if (!flat && vars[v].nesting) {
          let nesting = vars[v].nesting;
          if (validObject(nesting)) {
            nesting = d3.values(nesting);
          }
          for (let n = 0; n < nesting.length; n++) {
            const new_data = d.filter(dd =>
              test_value(fetchValue(vars, dd, nesting[n]))
            );
            if (new_data.length) {
              d = new_data;
            }
          }
        } else {
          d = d.filter(dd => test_value(fetchValue(vars, dd, vars[v].value)));
        }
        return d;
      }

      data = filter_data(data);

      if (v === 'id') {
        if ('nodes' in vars && vars.nodes.value) {
          if (vars.dev.value) {
            print.time('filtering nodes');
          }
          vars.nodes.restricted = filter_data(vars.nodes.value);
          if (vars.dev.value) {
            print.timeEnd('filtering nodes');
          }
        }

        if ('edges' in vars && vars.edges.value) {
          if (vars.dev.value) {
            print.time('filtering edges');
          }
          vars.edges.restricted = vars.edges.value.filter(d => {
            const points = filter_data([
              d[vars.edges.source],
              d[vars.edges.target]
            ]);
            return points.length === 2;
          });
          if (vars.dev.value) {
            print.timeEnd('filtering edges');
          }
        }
      }
    });
  } else if ('nodes' in vars) {
    vars.nodes.restricted = undefined;
    vars.edges.restricted = undefined;
  }

  if (vars.dev.value) {
    print.timeEnd('filtering data');
  }

  return data;
};
