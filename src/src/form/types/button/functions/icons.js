const prefix = require('../../../../client/prefix.js');
const rtl = require('../../../../client/rtl.js');

module.exports = (elem, vars) => {
  const reversed =
    (vars.font.align.value === 'right' && !rtl) ||
    (rtl && vars.font.align.value === 'right');

  elem.each(function(d) {
    const children = ['label'];

    if (d[vars.icon.value] && vars.data.viz.length <= vars.data.large) {
      children.push('icon');
    }

    let iconGraphic = vars.icon.button.value;
    if (d[vars.id.value] === vars.focus.value && vars.icon.select.value) {
      iconGraphic = vars.icon.select.value;
      children.push('selected');
    } else if (iconGraphic && d.d3po.icon !== false) {
      children.push('selected');
    }

    let buffer = 0;

    const items = d3
      .select(this)
      .selectAll('div.d3po_button_element')
      .data(children, c => c);

    items
      .enter()
      .append('div')
      .style('display', c => (c === 'label' ? 'block' : 'absolute'));

    items
      .order()
      .attr('class', c => {
        let extra = '';
        if (c === 'selected' && iconGraphic.indexOf('fa-') === 0) {
          extra = ' fa ' + iconGraphic;
        }
        return 'd3po_button_element d3po_button_' + c + extra;
      })
      .html(c => {
        if (c === 'label') {
          const k =
            vars.text.value &&
            vars.text.value in d &&
            !(d[vars.text.value] instanceof Array)
              ? vars.text.value
              : vars.id.value;
          return vars.format.value(d[k]);
        }
        return c === 'selected' && iconGraphic.indexOf('fa-') < 0
          ? iconGraphic
          : '';
      })
      .style('background-image', c => {
        if (c === 'icon') {
          return 'url(\'' + d[vars.icon.value] + '\')';
        }
        return 'none';
      })
      .style('background-color', c => {
        if (c === 'icon' && d.style === 'knockout') {
          return d[vars.color.value] || vars.ui.color.primary.value;
        }
        return 'transparent';
      })
      .style('background-size', '100%')
      .style('text-align', c =>
        c === 'label' ? vars.font.align.value : 'center'
      )
      .style('position', c => (c == 'label' ? 'static' : 'absolute'))
      .style('width', c => {
        if (c === 'label') {
          return 'auto';
        }

        if (vars.height.value) {
          buffer =
            vars.height.value -
            (vars.ui.padding.top + vars.ui.padding.bottom) -
            vars.ui.border * 2;
        } else {
          buffer = vars.font.size + vars.ui.border;
        }
        return buffer + 'px';
      })
      .style('height', c => {
        if (c === 'icon') {
          return buffer + 'px';
        }
        return 'auto';
      })
      .style('margin-top', function(c) {
        if (c === 'label') {
          return '0px';
        }
        let h;
        if (this.offsetHeight || this.getBoundingClientRect().height) {
          h = this.offsetHeight || this.getBoundingClientRect().height;
        } else if (c === 'selected') {
          h = vars.font.size;
        } else {
          h = buffer;
        }
        return -h / 2 + 'px';
      })
      .style('top', c => (c === 'label' ? 'auto' : '50%'))
      .style('left', c => {
        if ((c === 'icon' && !reversed) || (c === 'selected' && reversed)) {
          return vars.ui.padding.left + 'px';
        }
        return 'auto';
      })
      .style('right', c => {
        if ((c === 'icon' && reversed) || (c === 'selected' && !reversed)) {
          return vars.ui.padding.right + 'px';
        }
        return 'auto';
      })
      .style(prefix() + 'transition', c =>
        c === 'selected' ? vars.draw.timing / 1000 + 's' : 'none'
      )
      .style(prefix() + 'transform', c => {
        const degree = c === 'selected' ? vars.icon.select.rotate : 'none';
        return typeof degree === 'string'
          ? degree
          : 'rotate(' + degree + 'deg)';
      })
      .style('opacity', c => (c === 'selected' ? vars.icon.select.opacity : 1));

    items.exit().remove();

    const text = d3.select(this).selectAll('.d3po_button_label');

    if (buffer > 0) {
      let p = vars.ui.padding;

      if (children.length === 3) {
        p =
          p.top +
          'px ' +
          (p.right * 2 + buffer) +
          'px ' +
          p.bottom +
          'px ' +
          (p.left * 2 + buffer) +
          'px';
      } else if (
        (children.indexOf('icon') >= 0 && !rtl) ||
        (children.indexOf('selected') >= 0 && rtl)
      ) {
        p =
          p.top +
          'px ' +
          p.right +
          'px ' +
          p.bottom +
          'px ' +
          (p.left * 2 + buffer) +
          'px';
      } else {
        p =
          p.top +
          'px ' +
          (p.right * 2 + buffer) +
          'px ' +
          p.bottom +
          'px ' +
          p.left +
          'px';
      }

      text.style('padding', p);
    } else {
      text.style('padding', vars.ui.padding.css);
    }

    let width;
    if (typeof vars.width.value === 'number') {
      width = vars.width.value;
      width -= parseFloat(text.style('padding-left'), 10);
      width -= parseFloat(text.style('padding-right'), 10);
      width -= vars.ui.border * 2;
      width += 'px';
    } else {
      width = 'auto';
    }

    text.style('width', width);
  });
};
