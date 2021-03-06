const arraySort = require('../../array/sort.js');
const dataNest = require('./nest.js');
const fetchValue = require('../fetch/value.js');
const fetchText = require('../fetch/text.js');
//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Merges data underneath the size threshold
//-------------------------------------------------------------------
module.exports = (vars, rawData, split) => {
  let threshold;
  if (vars.size.threshold.value === false) {
    threshold = 0;
  } else if (typeof vars.size.threshold.value === 'number') {
    threshold = vars.size.threshold.value;
  } else if (typeof vars.size.threshold.value === 'function') {
    threshold = vars.size.threshold.value(vars);
  } else if (typeof vars.types[vars.type.value].threshold === 'number') {
    threshold = vars.types[vars.type.value].threshold;
  } else if (typeof vars.types[vars.type.value].threshold === 'function') {
    threshold = vars.types[vars.type.value].threshold(vars);
  } else {
    threshold = 0.02;
  }

  if (typeof threshold == 'number' && threshold > 0) {
    const largeEnough = [];
    let cutoff = vars.depth.value === 0 ? 0 : {};
    let removed = [];
    const parents = [];
    const labelException = [];
    const largest = {};

    const nest = d3.nest();

    if (split) {
      nest.key(d => fetchValue(vars, d, split));
    }

    nest
      .rollup(leaves => {
        let total = leaves.length;
        if (vars.aggs.value[vars.size.value]) {
          if (typeof vars.aggs.value[vars.size.value] == 'function') {
            total = vars.aggs.value[vars.size.value](leaves);
          } else if (typeof vars.aggs.value[vars.size.value] == 'string') {
            total = d3[vars.aggs.value[vars.size.value]](leaves, l =>
              fetchValue(vars, l, vars.size.value)
            );
          }
        } else {
          total = d3.sum(leaves, l => fetchValue(vars, l, vars.size.value));
        }
        const x = split ? fetchValue(vars, leaves[0], split) : 'all';
        largest[x] = total;
        return total;
      })
      .entries(rawData);

    rawData.forEach(d => {
      const id = fetchValue(vars, d, vars.id.value);
      const val = fetchValue(vars, d, vars.size.value);
      const x = split ? fetchValue(vars, d, split) : 'all';
      const allowed = val / largest[x] >= threshold;

      if (allowed && largeEnough.indexOf(id) < 0) {
        largeEnough.push(id);
        if (vars.depth.value) {
          const p = fetchValue(vars, d, vars.id.nesting[vars.depth.value - 1]);
          if (parents.indexOf(p) < 0) {
            parents.push(p);
          }
        }
      }
    });

    const filteredData = rawData.filter(d => {
      const id = fetchValue(vars, d, vars.id.value);
      const allowed = largeEnough.indexOf(id) >= 0;

      const p = vars.depth.value
        ? fetchValue(vars, d, vars.id.nesting[vars.depth.value - 1])
        : null;

      if (
        p !== null &&
        parents.indexOf(p) < 0 &&
        labelException.indexOf(p) < 0
      ) {
        labelException.push(p);
      }

      if (!allowed) {
        const val = fetchValue(vars, d, vars.size.value);
        if (val > 0) {
          if (vars.depth.value === 0) {
            if (val > cutoff) {
              cutoff = val;
            }
          } else {
            if (!(p in cutoff)) {
              cutoff[p] = 0;
            }
            if (val > cutoff[p]) {
              cutoff[p] = val;
            }
          }
          removed.push(d);
        }
      }
      return allowed;
    });

    if (removed.length > 1) {
      removed = arraySort(removed, vars.size.value, 'desc', [], vars);

      const levels = vars.id.nesting.slice(0, vars.depth.value);
      if (
        vars.types[vars.type.value].requirements.indexOf(vars.axes.discrete) >=
        0
      ) {
        levels.push(vars[vars.axes.discrete].value);
      }
      var merged = dataNest(vars, removed, levels);

      merged.forEach(m => {
        const parent = vars.id.nesting[vars.depth.value - 1];
        const p_id = fetchValue(vars, m, parent);
        const children = parent
          ? removed.filter(r => fetchValue(vars, r, parent) === p_id)
          : removed;

        if (children.length > 1) {
          vars.id.nesting.forEach((d, i) => {
            if (vars.depth.value == i) {
              const prev = m[d];
              if (typeof prev === 'string') {
                m[d] = 'd3po_other_' + prev;
              } else {
                m[d] = 'd3po_other';
              }
            } else if (i > vars.depth.value) {
              delete m[d];
            }
          });

          if (vars.color.value && vars.color.type === 'string') {
            if (vars.depth.value === 0) {
              m[vars.color.value] = vars.color.missing;
            } else {
              m[vars.color.value] = fetchValue(
                vars,
                p_id,
                vars.color.value,
                parent
              );
            }
          }

          if (vars.icon.value) {
            m[vars.icon.value] = fetchValue(
              vars,
              p_id,
              vars.icon.value,
              parent
            );
          }

          if (p_id) {
            m.d3po.depth = vars.depth.value;
          }

          let textLabel;
          if (vars.depth.value === 0) {
            textLabel = vars.format.value(vars.format.locale.value.ui.values, {
              key: 'threshold',
              vars: vars
            });
            textLabel +=
              ' < ' +
              vars.format.value(cutoff, {
                key: vars.size.value,
                vars: vars
              });
          } else {
            textLabel = fetchText(vars, m, vars.depth.value - 1);
            textLabel = textLabel.length
              ? textLabel[0].split(' < ')[0]
              : vars.format.value(vars.format.locale.value.ui.values, {
                key: 'threshold',
                vars: vars
              });
            if ((p_id, labelException.indexOf(p_id) < 0)) {
              textLabel +=
                ' < ' +
                vars.format.value(cutoff[p_id], {
                  key: vars.size.value,
                  vars: vars
                });
            }
          }
          if ((p_id, labelException.indexOf(p_id) < 0)) {
            textLabel +=
              ' (' +
              vars.format.value(threshold * 100, {
                key: 'share',
                vars: vars
              }) +
              ')';
          }

          m.d3po.threshold = cutoff;
          m.d3po.merged = children;

          if (vars.text.value) {
            m[vars.text.value] = textLabel;
          }
          m.d3po.text = textLabel;
        }
      });
    } else {
      merged = removed;
    }

    return filteredData.concat(merged);
  }

  return rawData;
};
