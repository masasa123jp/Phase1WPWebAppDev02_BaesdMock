/*
 * circle-toggle.js – add concentric circles on the map
 *
 * This script provides a small UI control that toggles the display
 * of concentric circles centred on the default map position.  These
 * visual guides help users understand distances on the map.  The
 * implementation relies on the global `map` and `DEFAULT_CENTER`
 * variables defined in map.js.  When the user clicks the button,
 * the script creates (or removes) circles with fixed radii.  If the
 * Google Maps API is not available the script silently does
 * nothing.
 */

(function() {
  'use strict';
  // Internal state: list of circle objects and toggle flag
  var circles = [];
  var shown   = false;

  /**
   * Create concentric circles on the map.  The radii are hard‑coded
   * values in metres.  Styling matches the brand colours used
   * elsewhere on the site.  Existing circles are cleared before
   * drawing new ones.
   */
  function createCircles() {
    if (typeof window.google === 'undefined' || !window.google.maps || typeof window.map === 'undefined') {
      return;
    }
    removeCircles();
    var radii = [5000, 10000]; // 5 km and 10 km rings
    radii.forEach(function(radius) {
      // Resolve a center point for the circles.  When DEFAULT_CENTER
      // is exposed by map.js it will be available on window; if not,
      // fall back to the current map's centre.  Casting to a
      // literal via toJSON() normalises the LatLng object.
      var center;
      if (typeof window.DEFAULT_CENTER !== 'undefined') {
        center = window.DEFAULT_CENTER;
      } else if (window.map && typeof window.map.getCenter === 'function') {
        try {
          var c = window.map.getCenter();
          center = c && typeof c.toJSON === 'function' ? c.toJSON() : undefined;
        } catch (_) {
          center = undefined;
        }
      }
      // If centre resolution fails, skip drawing this circle.
      if (!center) return;
      var circle = new google.maps.Circle({
        center: center,
        radius: radius,
        strokeColor: '#1F497D',
        strokeOpacity: 0.5,
        strokeWeight: 1,
        fillColor: '#FFC72C',
        fillOpacity: 0.05
      });
      // Explicitly attach to the map via setMap() because
      // constructing the circle with a non‑Map object results in
      // InvalidValueError: setMap: not an instance of Map.
      circle.setMap(window.map);
      circles.push(circle);
    });
  }

  /**
   * Remove any circles currently drawn on the map.
   */
  function removeCircles() {
    while (circles.length) {
      var c = circles.pop();
      try {
        c.setMap(null);
      } catch (_) {
        // ignore
      }
    }
  }

  /**
   * Toggle the visibility of the distance circles.  Called when the
   * user clicks the control button.
   */
  function toggle() {
    if (!shown) {
      createCircles();
      shown = true;
    } else {
      removeCircles();
      shown = false;
    }
  }

  /**
   * Insert a button into the map container once the DOM is ready.
   * The button uses CSS defined in styles.css (class circle-toggle-btn).
   */
  function insertButton() {
    var container = document.getElementById('map-container');
    if (!container) {
      return;
    }
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'circle-toggle-btn';
    btn.className = 'circle-toggle-btn';
    btn.setAttribute('data-i18n-key', 'toggle_range');
    btn.textContent = '範囲表示';
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      toggle();
    });
    container.appendChild(btn);
  }

  // Initialise once the DOM is available
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', insertButton);
  } else {
    insertButton();
  }
})();
