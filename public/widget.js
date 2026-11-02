/* GhanaCrimes embed: <div data-ghanacrimes-region="greater-accra"></div><script src="https://www.ghanacrimes.com/widget.js" async></script> */
(function () {
  var nodes = document.querySelectorAll('[data-ghanacrimes-region]');
  for (var i = 0; i < nodes.length; i++) {
    var n = nodes[i]; if (n.getAttribute('data-gc-done')) continue;
    var f = document.createElement('iframe');
    f.src = 'https://www.ghanacrimes.com/embed/region/' + encodeURIComponent(n.getAttribute('data-ghanacrimes-region'));
    f.title = 'Latest crime news from GhanaCrimes'; f.loading = 'lazy';
    f.style.cssText = 'width:100%;max-width:400px;height:' + (n.getAttribute('data-height') || '360') + 'px;border:1px solid #ddd;border-radius:6px';
    n.appendChild(f); n.setAttribute('data-gc-done', '1');
  }
})();
