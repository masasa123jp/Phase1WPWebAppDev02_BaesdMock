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
   * getGoogleLocale – ユーザー言語に対応する Google Maps の language/region を決定します。
   *
   * ja: 日本語 UI、地域 JP
   * en: 英語 UI、地域 JP（日本内ユーザー向け）
   * zh: 中国語簡体 UI、地域 CN
   * ko: 韓国語 UI、地域 KR
   */
  function getGoogleLocale() {
    var lang = (typeof window.getUserLang === 'function') ? window.getUserLang() : 'ja';
    switch (lang) {
      case 'en':
        return { language: 'en',    region: 'JP' };
      case 'zh':
        return { language: 'zh-CN', region: 'CN' };
      case 'ko':
        return { language: 'ko',    region: 'KR' };
      case 'ja':
      default:
        return { language: 'ja',    region: 'JP' };
    }
  }

  /**
   * readMeta – 指定された name の meta タグの content 値を取得します。
   * 該当タグが存在しない場合は空文字列を返します。
   *
   * @param {string} name
   * @returns {string}
   */
  function readMeta(name) {
    var el = document.querySelector('meta[name="' + name + '"]');
    return el ? el.getAttribute('content') : '';
  }

  /**
   * getApiKey – Google Maps API キーを取得します。
   * meta タグに設定された gmaps-api-key を優先し、なければグローバル変数を参照します。
   * base64 エンコードされている場合はデコードし、失敗した場合はそのまま返します。
   *
   * @returns {string}
   */
  function getApiKey() {
    var raw = readMeta('gmaps-api-key') || (typeof window.__GMAPS_API_KEY__ !== 'undefined' ? window.__GMAPS_API_KEY__ : '');
    if (!raw) return '';
    try {
      return atob(raw);
    } catch (_e) {
      return raw;
    }
  }

  /**
   * alreadyLoaded – Google Maps API が既にロード済みかを判定します。
   *
   * @returns {boolean}
   */
  function alreadyLoaded() {
    return !!(window.google && window.google.maps);
  }

  /**
   * injectGoogleScript – Google Maps API スクリプトを動的に挿入します。
   * API キーが設定されている場合のみ実行し、既に読み込み済みの場合は処理をスキップします。
   */
  function injectGoogleScript() {
    // 既にロード済みであれば何もしないで初期化関数を呼び出します
    if (alreadyLoaded()) {
      if (typeof window.initGoogleMap === 'function') {
        window.initGoogleMap();
      }
      return;
    }
    // API キーを取得します
    var key = getApiKey();
    if (!key) {
      console.error('[map-loader] Google Maps API key is empty.');
      return;
    }
    // ユーザー言語に基づいてロケールを設定します
    var loc = getGoogleLocale();
    // 既に Google Maps API のスクリプトが挿入されていないか確認します（言語違いでも重複を避ける）
    var exists = Array.prototype.some.call(document.getElementsByTagName('script'), function (s) {
      return /maps\.googleapis\.com\/maps\/api\/js/.test(s.src);
    });
    if (exists) return;
    // Google Maps API の URL を生成します
    var url = 'https://maps.googleapis.com/maps/api/js'
            + '?key=' + encodeURIComponent(key)
            + '&libraries=places'
            + '&language=' + encodeURIComponent(loc.language)
            + '&region='   + encodeURIComponent(loc.region);
    // スクリプト要素を生成して head に追加します
    var s = document.createElement('script');
    s.src = url;
    s.async = true;
    s.defer = true;
    s.onload = function () {
      if (typeof window.initGoogleMap === 'function') {
        window.initGoogleMap();
      } else if (typeof window.initMap === 'function') {
        window.initMap();
      }
    };
    s.onerror = function (e) {
      console.error('[map-loader] Failed to load Google Maps API:', e);
    };
    document.head.appendChild(s);
  }

  // DOM 準備が完了したら API の注入を開始します
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectGoogleScript);
  } else {
    injectGoogleScript();
  }

  /**
   * Google の callback=initMap 互換のための shim
   * API スクリプトの URL パラメータで callback=initMap が指定されている場合でも
   * この関数が呼び出され、map.js 側の initGoogleMap または initHereMap へ委譲します。
   */
  window.initMap = function () {
    if (typeof window.initGoogleMap === 'function') {
      window.initGoogleMap();
    } else if (typeof window.initHereMap === 'function') {
      window.initHereMap();
    }
  };
})();