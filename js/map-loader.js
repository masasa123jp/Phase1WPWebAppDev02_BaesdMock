/*
  map-loader.js – Google Maps を “現在のUI言語” ロケールで動的に注入

  このスクリプトは getUserLang() から取得できる言語設定に合わせて、
  Google Maps API を適切な language/region パラメータ付きで読み込みます。
  すでに API が読み込まれている場合は再読み込みを行わず、初期化関数を実行します。
  API キーは <meta name="gmaps-api-key"> または window.__GMAPS_API_KEY__ に設定された
  値を使用します。base64 エンコードされている場合はデコードします。
*/

;(function () {
  /**
   * map-loader.js (trimmed) – acts as a shim for the Google Maps API callback.
   *
   * In the updated theme the actual loading of the Google Maps script is handled
   * by page-map.php.  This loader now only defines a fallback callback so that
   * the `callback=initMap` parameter used by Google Maps will correctly invoke
   * the internal initialisers defined in map.js.  It no longer attempts to load
   * the API on its own, avoiding duplicate injection of the script and related
   * console warnings.
   */

  // Define initMap as a bridge to our initialisation functions.  When the
  // Google Maps API executes its callback it will call this function.
  window.initMap = function () {
    if (typeof window.initGoogleMap === 'function') {
      window.initGoogleMap();
    } else if (typeof window.initHereMap === 'function') {
      window.initHereMap();
    }
  };
})();