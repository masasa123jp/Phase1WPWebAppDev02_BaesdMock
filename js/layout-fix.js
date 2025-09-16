/*
 * layout-fix.js – dynamic height adjustment for the map page
 *
 * WordPress themes and admin bars can alter the available viewport
 * height, causing the map container to extend beyond the visible
 * area or leave unwanted whitespace.  This script recalculates the
 * available space on load and resize events and sets a minimum
 * height on the #map-container accordingly.  The calculation
 * accounts for the fixed header and category bar heights.  If a
 * bottom navigation bar is present it can be factored in later.
 */

(function() {
  'use strict';
  function adjust() {
    var header = document.querySelector('.app-header');
    var catBar = document.getElementById('category-bar');
    var container = document.getElementById('map-container');
    if (!container) return;
    var topHeight = 0;
    if (header) topHeight += header.offsetHeight;
    if (catBar) topHeight += catBar.offsetHeight;
    // Reserve 1rem gap below category bar
    topHeight += 16;
    var available = window.innerHeight - topHeight;
    if (available < 300) available = 300;
    container.style.minHeight = available + 'px';
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', adjust);
  } else {
    adjust();
  }
  window.addEventListener('resize', adjust);
})();
