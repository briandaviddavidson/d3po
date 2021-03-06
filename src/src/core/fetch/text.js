const fetchValue = require('./value.js');
const validObject = require('../../object/validate.js');
const uniques = require('../../util/uniques.js');

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Get array of available text values
//------------------------------------------------------------------------------
module.exports = (vars, obj, depth) => {
  if (typeof depth !== 'number') {
    depth = vars.depth.value;
  }

  const key = vars.id.nesting[depth];
  let textKeys;

  if (vars.text.nesting && validObject(vars.text.nesting)) {
    if (vars.text.nesting[key]) {
      textKeys = vars.text.nesting[key];
    } else {
      textKeys = vars.text.value;
    }
  } else {
    textKeys = [];
    if (vars.text.value && depth === vars.depth.value) {
      textKeys.push(vars.text.value);
    }
    textKeys.push(key);
  }

  if (!(textKeys instanceof Array)) {
    textKeys = [textKeys];
  }

  const names = [];

  if (validObject(obj) && 'd3po' in obj && obj.d3po.text) {
    names.push(obj.d3po.text.toString());
    names.push(
      vars.format.value(obj.d3po.text.toString(), {
        vars: vars,
        data: obj
      })
    );
  } else {
    const formatObj = validObject(obj) ? obj : undefined;

    if (formatObj && obj[vars.id.value] instanceof Array) {
      obj = obj[vars.id.value];
    } else if (!(obj instanceof Array)) {
      obj = [obj];
    }

    textKeys.forEach(t => {
      let name = uniques(obj, t, fetchValue, vars, key);

      if (name.length) {
        if (name.length > 1) {
          name = name.filter(
            n =>
              n instanceof Array ||
              (typeof n === 'string' && n.indexOf(' < ') < 0)
          );
        }
        name = name.map(n => {
          if (n instanceof Array) {
            n = n.filter(nn => nn);
            return n.map(nn =>
              vars.format.value(nn.toString(), {
                vars: vars,
                data: formatObj,
                key: t
              })
            );
          } else if (n) {
            return vars.format.value(n.toString(), {
              vars: vars,
              data: formatObj,
              key: t
            });
          }
        });
        if (name.length === 1) {
          name = name[0];
        }
        names.push(name);
      }
    });
  }

  return names;
};
