const arraySort = require('../../../array/sort.js');
const createTooltip = require('../../../tooltip/create.js');
const dataNest = require('../../../core/data/nest.js');
const fetchData = require('./data.js');
const fetchColor = require('../../../core/fetch/color.js');
const fetchText = require('../../../core/fetch/text.js');
const fetchValue = require('../../../core/fetch/value.js');
const mergeObject = require('../../../object/merge.js');
const removeTooltip = require('../../../tooltip/remove.js');
const segments = require('../shapes/segments.js');
const scroll = require('../../../client/scroll.js');
const uniques = require('../../../util/uniques.js');
const validObject = require('../../../object/validate.js');
const zoomDirection = require('../zoom/direction.js');
//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// Creates correctly formatted tooltip for Apps
//-------------------------------------------------------------------
module.exports = params => {
  if (!('d3po' in params.data)) {
    params.data.d3po = {};
  }

  const vars = params.vars;
  const d = params.data;

  const dataDepth =
    'd3po' in d && 'depth' in d.d3po ? d.d3po.depth : vars.depth.value;

  let mouse = params.mouseevents ? params.mouseevents : false;
  let arrow = 'arrow' in params ? params.arrow : true;
  const id = fetchValue(vars, d, vars.id.value);
  const tooltip_id = params.id || vars.type.value;

  if (
    d3.event &&
    d3.event.type == 'click' &&
    (vars.tooltip.html.value || vars.tooltip.value.long) &&
    !('fullscreen' in params)
  ) {
    var fullscreen = true;
    var length = 'long';
    var footer = vars.footer.value;

    (arrow = false), (mouse = true), (vars.covered = true);
  } else {
    var align = params.anchor || vars.tooltip.anchor;
    const zoom = zoomDirection(d, vars);
    fullscreen = false;
    length = params.length || 'short';

    let text = '';
    if (
      !(
        !vars.mouse.click.value ||
        (vars.mouse.viz && vars.mouse.viz.click === false)
      )
    ) {
      if (zoom === 1 && vars.zoom.value) {
        text = vars.format.value(vars.format.locale.value.ui.expand);
      } else if (
        zoom === -1 &&
        vars.zoom.value &&
        vars.history.states.length &&
        !vars.tooltip.value.long
      ) {
        text = vars.format.value(vars.format.locale.value.ui.collapse);
      } else if (
        !vars.small &&
        length == 'short' &&
        (vars.tooltip.html.value || vars.tooltip.value.long) &&
        (vars.focus.value.length !== 1 || vars.focus.value[0] != id)
      ) {
        text = vars.format.locale.value.ui.moreInfo;
      } else if (length == 'long') {
        text = vars.footer.value || '';
      }
    }

    footer = text.length
      ? vars.format.value(text, {
        key: 'footer',
        vars: vars
      })
      : false;
  }

  let x;
  let y;
  let offset;
  if ('x' in params) {
    x = params.x;
  } else if (vars.types[vars.type.value].tooltip === 'static') {
    x = d.d3po.x;
    if (vars.zoom.translate && vars.zoom.scale) {
      x = vars.zoom.translate[0] + x * vars.zoom.scale;
    }
    x += vars.margin.left;
    if (params.length !== 'long') {
      y += scroll.x();
      x += vars.container.value.node().getBoundingClientRect().left;
      x += parseFloat(vars.container.value.style('padding-left'), 10);
    }
  } else {
    x = d3.mouse(d3.select('html').node())[0];
  }

  if ('y' in params) {
    y = params.y;
  } else if (vars.types[vars.type.value].tooltip == 'static') {
    y = d.d3po.y;
    if (vars.zoom.translate && vars.zoom.scale) {
      y = vars.zoom.translate[1] + y * vars.zoom.scale;
    }
    y += vars.margin.top;
    if (params.length !== 'long') {
      y += scroll.y();
      y += vars.container.value.node().getBoundingClientRect().top;
      y += parseFloat(vars.container.value.style('padding-top'), 10);
    }
  } else {
    y = d3.mouse(d3.select('html').node())[1];
  }

  if ('offset' in params) {
    offset = params.offset;
  } else if (vars.types[vars.type.value].tooltip == 'static') {
    offset = d.d3po.r ? d.d3po.r : d.d3po.height / 2;
    if (vars.zoom.scale) {
      offset = offset * vars.zoom.scale;
    }
  } else {
    offset = 3;
  }

  function make_tooltip(html) {
    const titleDepth = 'depth' in params ? params.depth : dataDepth;

    let ex = {};
    let children;

    let depth =
      vars.id.nesting[titleDepth + 1] in d ? titleDepth + 1 : titleDepth;

    const nestKey = vars.id.nesting[depth];
    let nameList = 'merged' in d.d3po ? d.d3po.merged : d[nestKey];

    if (!(nameList instanceof Array)) {
      nameList = [nameList];
    }

    const dataValue = fetchValue(vars, d, vars.size.value);

    if (vars.tooltip.children.value) {
      nameList = nameList.slice(0);
      if (nameList.length > 1 && validObject(nameList[0])) {
        nameList = dataNest(vars, nameList, [nestKey]);
      }

      if (vars.size.value && validObject(nameList[0])) {
        const namesNoValues = [];
        const namesWithValues = nameList.filter(n => {
          const val = fetchValue(vars, n, vars.size.value);
          if (val !== null && (!('d3po' in n) || !n.d3po.merged)) {
            return true;
          } else {
            namesNoValues.push(n);
          }
        });

        arraySort(namesWithValues, vars.size.value, 'desc', [], vars);

        nameList = namesWithValues.concat(namesNoValues);
      }

      const maxChildrenShownInShortMode =
        vars.tooltip.children.value === true ? 3 : vars.tooltip.children.value;

      const limit =
        length === 'short' ? maxChildrenShownInShortMode : vars.data.large;

      const listLength = nameList.length;
      const max = d3.min([listLength, limit]);

      children = {
        values: []
      };
      for (let i = 0; i < max; i++) {
        if (!nameList.length) {
          break;
        }

        const obj = nameList.shift();
        const name = fetchText(vars, obj, depth)[0];
        var id = validObject(obj) ? fetchValue(vars, obj, nestKey, depth) : obj;

        if (id !== d[vars.id.nesting[titleDepth]] && name && !children[name]) {
          const value = validObject(obj)
            ? fetchValue(vars, obj, vars.size.value, nestKey)
            : null;

          const color = fetchColor(vars, obj, nestKey);

          children[name] =
            value && !(value instanceof Array)
              ? vars.format.value(value, {
                key: vars.size.value,
                vars: vars,
                data: obj
              })
              : '';
          const child = {};
          child[name] = children[name];
          children.values.push(child);

          if (color) {
            if (!children.d3po_colors) {
              children.d3po_colors = {};
            }
            children.d3po_colors[name] = color;
          }
        } else {
          i--;
        }
      }

      if (listLength > max) {
        children.d3poMore = listLength - max;
      }
    }

    if (d.d3po.tooltip) {
      ex = mergeObject(ex, d.d3po.tooltip);
    }

    function getLabel(method) {
      return typeof vars[method].value === 'string'
        ? vars[method].value
        : vars.format.locale.value.method[method];
    }

    if (vars.tooltip.size.value) {
      if (dataValue && typeof vars.size.value !== 'number') {
        ex[getLabel('size')] = dataValue;
      }
      if (
        vars.axes.opposite &&
        vars[vars.axes.opposite].value !== vars.size.value
      ) {
        ex[getLabel(vars.axes.opposite)] = fetchValue(
          vars,
          d,
          vars[vars.axes.opposite].value
        );
      }
      if (
        vars.axes.opposite &&
        vars[vars.axes.opposite + '2'].value !== vars.size.value
      ) {
        ex[getLabel(vars.axes.opposite + '2')] = fetchValue(
          vars,
          d,
          vars[vars.axes.opposite + '2'].value
        );
      }
      if (vars.color.valueScale) {
        ex[getLabel('color')] = fetchValue(vars, d, vars.color.value);
      }
    }

    const active = segments(vars, d, 'active');
    const temp = segments(vars, d, 'temp');
    const total = segments(vars, d, 'total');

    if (typeof active == 'number' && active > 0 && total) {
      ex[getLabel('active')] =
        active +
        '/' +
        total +
        ' (' +
        vars.format.value((active / total) * 100, {
          key: 'share',
          vars: vars,
          data: d
        }) +
        ')';
    }

    if (typeof temp == 'number' && temp > 0 && total) {
      ex[getLabel('temp')] =
        temp +
        '/' +
        total +
        ' (' +
        vars.format.value((temp / total) * 100, {
          key: 'share',
          vars: vars,
          data: d
        }) +
        ')';
    }

    if (vars.tooltip.share.value && d.d3po.share) {
      ex.share = vars.format.value(d.d3po.share * 100, {
        key: 'share',
        vars: vars,
        data: d
      });
    }

    depth = 'depth' in params ? params.depth : dataDepth;
    let title = params.title || fetchText(vars, d, depth)[0];

    let icon = uniques(
      d,
      vars.icon.value,
      fetchValue,
      vars,
      vars.id.nesting[depth]
    );

    const tooltip_data = params.titleOnly
      ? []
      : fetchData(vars, d, length, ex, children, depth);

    if (icon.length === 1 && typeof icon[0] === 'string') {
      icon = icon[0];
    } else {
      icon = false;
    }

    if (
      tooltip_data.length > 0 ||
      footer ||
      (!d.d3po_label && length == 'short' && title) ||
      (d.d3po_label &&
        (!('visible' in d.d3po_label) ||
          ('visible' in d.d3po_label && d.d3po_label.visible === false)))
    ) {
      if (!title) {
        title = vars.format.value(id, {
          key: vars.id.value,
          vars: vars
        });
      }

      depth =
        'd3po' in d && 'merged' in d.d3po
          ? dataDepth - 1
          : 'depth' in params
            ? params.depth
            : dataDepth;

      if (depth < 0) {
        depth = 0;
      }

      depth = vars.id.nesting[depth];

      if (typeof vars.icon.style.value == 'string') {
        var icon_style = vars.icon.style.value;
      } else if (
        typeof vars.icon.style.value == 'object' &&
        vars.icon.style.value[depth]
      ) {
        icon_style = vars.icon.style.value[depth];
      } else {
        icon_style = 'default';
      }

      let width = vars.tooltip.small;
      if (params.width) {
        width = params.width;
      } else if (fullscreen) {
        width = vars.tooltip.large;
      }

      const parent =
        (!fullscreen && params.length !== 'long') ||
        (fullscreen && vars.tooltip.fullscreen.value)
          ? d3.select('body')
          : vars.container.value;

      if (!params.description && d && vars.tooltip.sub.value) {
        params.description = fetchValue(vars, d, vars.tooltip.sub.value);
      }

      createTooltip({
        align: align,
        arrow: arrow,
        locale: vars.format.locale.value,
        background: vars.tooltip.background,
        curtain: vars.tooltip.curtain.color,
        curtainopacity: vars.tooltip.curtain.opacity,
        fontcolor: vars.tooltip.font.color,
        fontfamily: vars.tooltip.font.family.value,
        fontsize: vars.tooltip.font.size,
        fontweight: vars.tooltip.font.weight,
        data: tooltip_data,
        color: fetchColor(vars, d),
        allColors: true,
        footer: params.footer === false ? params.footer : footer,
        fullscreen: fullscreen,
        html: html,
        js: params.js,
        icon: icon,
        id: tooltip_id,
        max_height: params.maxheight,
        max_width: width,
        mouseevents: mouse,
        offset: offset,
        parent: parent,
        stacked: vars.tooltip.stacked.value,
        style: icon_style,
        title: title,
        description: params.description,
        width:
          !params.width && !fullscreen && tooltip_data.length == 0
            ? 'auto'
            : width,
        x: x,
        y: y
      });
    } else {
      removeTooltip(tooltip_id);
    }
  }

  if (fullscreen || params.length === 'long') {
    if (typeof vars.tooltip.html.value == 'string') {
      make_tooltip(vars.tooltip.html.value);
    } else if (typeof vars.tooltip.html.value == 'function') {
      make_tooltip(vars.tooltip.html.value(id));
    } else if (
      vars.tooltip.html.value &&
      typeof vars.tooltip.html.value == 'object' &&
      vars.tooltip.html.value.url
    ) {
      let tooltip_url = vars.tooltip.html.value.url;
      if (typeof tooltip_url === 'function') {
        tooltip_url = tooltip_url(id);
      }
      d3.json(tooltip_url, data => {
        const html = vars.tooltip.html.value.callback
          ? vars.tooltip.html.value.callback(data)
          : data;
        make_tooltip(html);
      });
    } else {
      make_tooltip(params.html);
    }
  } else {
    make_tooltip(params.html);
  }
};
