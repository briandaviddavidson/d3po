// Creates a Base-64 Data URL from and Image URL
(() => {
  module.exports = (url, callback) => {
    let img;
    img = new Image();
    img.src = url;
    img.crossOrigin = 'Anonymous';
    img.onload = function() {
      let canvas;
      let context;
      canvas = document.createElement('canvas');
      canvas.width = this.width;
      canvas.height = this.height;
      context = canvas.getContext('2d');
      context.drawImage(this, 0, 0);
      callback.call(this, canvas.toDataURL('image/png'));
      canvas = null;
    };
  };
}).call(this);
