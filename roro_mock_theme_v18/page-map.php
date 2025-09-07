<?php
/**
 * Template Name: Map Page
 *
 * Displays the event map using the original map.html markup.  API
 * keys should be configured in your hosting environment; see the
 * README or comments in the original mockup for details.  This
 * template focuses on the structure and placeholders, leaving the
 * interactive map logic to the enqueued JavaScript.
 */

get_header();
?>

<header class="app-header">
    <img src="<?php echo esc_url( get_template_directory_uri() ); ?>/images/logo_roro.png" alt="ロゴ" class="small-logo" />
    <h2 data-i18n-key="map_title">おでかけマップ</h2>
    <button id="lang-toggle-btn" class="lang-toggle" title="Change language">
        <img src="<?php echo esc_url( get_template_directory_uri() ); ?>/images/switch-language.png" alt="Language" />
    </button>
</header>

<main id="map-container">
    <!-- カテゴリフィルタバー：イベントや施設の種類を絞り込むボタンを配置 -->
    <div id="category-bar" class="category-bar"></div>
    <!-- マップを描画するコンテナ -->
    <div id="map"></div>
    <!-- ユーザー登録住所を基点に半径20kmの範囲に戻るボタン -->
    <button id="reset-view-btn" class="reset-btn" title="周辺表示" data-i18n-key="reset_view">周辺表示</button>
</main>

<!-- 言語に応じてマップAPIを動的にロード -->
<script>
  (function() {
    // 現在の言語設定を取得
    var lang = localStorage.getItem('userLang') || 'ja';
    if (lang === 'zh') {
      // 中国語の場合は HERE Maps のライブラリを読み込む
      var hereScripts = [
        'https://js.api.here.com/v3/3.1/mapsjs-core.js',
        'https://js.api.here.com/v3/3.1/mapsjs-service.js',
        'https://js.api.here.com/v3/3.1/mapsjs-ui.js',
        'https://js.api.here.com/v3/3.1/mapsjs-mapevents.js'
      ];
      var loadedCount = 0;
      hereScripts.forEach(function(src) {
        var s = document.createElement('script');
        s.src = src;
        s.async = true;
        s.defer = true;
        s.onload = function() {
          loadedCount++;
          if (loadedCount === hereScripts.length) {
            // 全ての HERE ライブラリ読み込み後にマップ初期化
            if (typeof window.initMap === 'function') window.initMap();
          }
        };
        document.head.appendChild(s);
      });
    } else {
      // Google Maps を読み込む
      var regionMap = {
        ja: 'JP',
        en: 'US',
        zh: 'JP',
        ko: 'KR'
      };
      var region = regionMap[lang] || 'JP';
      // 言語コードは zh の場合 zh-CN を使用
      var langParam = (lang === 'zh' ? 'zh-CN' : lang);
      // APIキーを環境変数や WordPress の設定から取得することを推奨します。
      var apiKey = 'AIzaSyCrd23wbCghvlHewI4azSXYhoJGL3CO3qI';
      // initMap が未定義の場合のフォールバック定義。Google Maps API の
      // callback は global の initMap を呼び出すため、この定義により
      // map.js の読み込み前でも初期化処理を行えるようにします。
      if (typeof window.initMap !== 'function') {
        window.initMap = function() {
          if (typeof window.initGoogleMap === 'function') {
            window.initGoogleMap();
          } else if (typeof window.initHereMap === 'function') {
            window.initHereMap();
          }
        };
      }
      var script = document.createElement('script');
      // callback パラメータを指定して Google Maps API を読み込む。API のロード後
      // initMap が呼ばれます。initMap は map.js が読み込み済みなら
      // そちらの定義が優先され、未読み込みなら上記のフォールバックが呼ばれます。
      script.src = 'https://maps.googleapis.com/maps/api/js?key=' + apiKey +
        '&callback=initMap' +
        '&language=' + encodeURIComponent(langParam) +
        '&region=' + encodeURIComponent(region) +
        '&loading=async';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  })();
</script>

<?php get_footer(); ?>