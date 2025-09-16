<?php
/**
 * Template Name: Map Page
 *
 * 役割:
 *  - 地図ページ用テンプレート。Google Maps を callback=initMap で1回だけ初期化。
 *  - zh（中国語）時は HERE のスクリプトを「プリロード」(将来切替の備え) ※initMapは呼ばない。
 *  - 最適化系プラグインを使う場合は、以下のハンドルを結合/遅延除外:
 *      roro-map-loader, roro-events, roro-map, google-maps-api
 */

if (!defined('ABSPATH')) exit;

get_header();

/** =========================================================
 * 0) API キーを <meta> に出力（既存 JS から参照するため）
 * ======================================================== */
if (!function_exists('roro_print_map_api_metas')) {
  function roro_print_map_api_metas() {
    // 取得ロジックは運用に合わせて調整可
    $gmaps_api_key = get_option('roro_gmaps_api_key', defined('RORO_GMAPS_API_KEY') ? RORO_GMAPS_API_KEY : '');
    $here_api_key  = get_option('roro_here_api_key',  defined('RORO_HERE_API_KEY')  ? RORO_HERE_API_KEY  : '');

    if (current_user_can('manage_options') && empty($gmaps_api_key)) {
      error_log('[RoRo Map] Google Maps API key is empty. Set roro_gmaps_api_key option.');
    }
    if (!empty($gmaps_api_key)) {
      echo '<meta name="gmaps-api-key" content="' . esc_attr($gmaps_api_key) . '">' . "\n";
    }
    if (!empty($here_api_key)) {
      echo '<meta name="here-api-key" content="' . esc_attr($here_api_key) . '">' . "\n";
    }
  }
  add_action('wp_head', 'roro_print_map_api_metas', 1);
}

/** =========================================================
 * 1) 言語/地域の決定
 *    - ?gm_lang=ja|en|zh|ko を優先、無ければ WP ロケールから推定
 *    - Google Maps の language / region に反映
 * ======================================================== */
function roro_resolve_map_locale() {
  // UI 指定
  $ui = isset($_GET['gm_lang']) ? strtolower(sanitize_text_field($_GET['gm_lang'])) : '';
  $ui = in_array($ui, array('ja','en','zh','ko'), true) ? $ui : '';

  // 指定が無ければ WP ロケールから推定
  if ($ui === '') {
    $loc = get_locale(); // 例: ja_JP / en_US / zh_CN / ko_KR
    if (strpos($loc,'ja') === 0)      $ui = 'ja';
    elseif (strpos($loc,'en') === 0)  $ui = 'en';
    elseif (strpos($loc,'zh') === 0)  $ui = 'zh';
    elseif (strpos($loc,'ko') === 0)  $ui = 'ko';
    else $ui = 'ja';
  }

  // Google Maps の language/region
  switch ($ui) {
    case 'en': return array('language' => 'en',    'region' => 'US');
    case 'zh': return array('language' => 'zh-CN', 'region' => 'CN');
    case 'ko': return array('language' => 'ko',    'region' => 'KR');
    case 'ja':
    default:   return array('language' => 'ja',    'region' => 'JP');
  }
}
$__roro_locale = roro_resolve_map_locale();

/** =========================================================
 * 2) Google Maps API キー取得
 * ======================================================== */
if (!function_exists('roro_get_google_maps_api_key')) {
  function roro_get_google_maps_api_key() {
    $candidates = array(
      getenv('RORO_GOOGLE_MAPS_API_KEY'),
      getenv('GOOGLE_MAPS_API_KEY'),
      defined('RORO_GOOGLE_MAPS_API_KEY') ? RORO_GOOGLE_MAPS_API_KEY : null,
      get_option('roro_google_maps_api_key'),
      get_option('roro_gmaps_api_key') // 後方互換
    );
    foreach ($candidates as $v) if (!empty($v)) return $v;
    return '';
  }
}
$gmaps_key = roro_get_google_maps_api_key();

/** =========================================================
 * 3) スクリプトを enqueue（順序はローダ→events→map→Google本体）
 * ======================================================== */
$theme_uri  = get_template_directory_uri();
$theme_path = get_template_directory();

/** 3-1) Google callback シム（initMap を確実に呼ばせる） */
wp_enqueue_script(
  'roro-map-loader',
  $theme_uri . '/js/map-loader.js',
  array(),
  file_exists($theme_path . '/js/map-loader.js') ? filemtime($theme_path . '/js/map-loader.js') : null,
  false // ヘッダ
); // 既存ローダの利用を継続。 :contentReference[oaicite:2]{index=2}

/** 3-2) イベント/マーカーのデータ */
$deps_for_map = array();
if ( file_exists( $theme_path . '/data/events.js' ) ) {
  wp_enqueue_script(
    'roro-events',
    $theme_uri . '/data/events.js',
    array(),
    filemtime($theme_path . '/data/events.js'),
    false // ヘッダ
  );
  $deps_for_map[] = 'roro-events';
}

/** 3-3) 地図アプリ本体 */
wp_enqueue_script(
  'roro-map',
  $theme_uri . '/js/map.js',
  $deps_for_map,
  file_exists($theme_path . '/js/map.js') ? filemtime($theme_path . '/js/map.js') : null,
  false // ヘッダ
); // map.js 側でカテゴリ UI・描画を一元管理。 :contentReference[oaicite:3]{index=3}

/** 3-4) Google Maps API 本体 */
if ( ! empty($gmaps_key) ) {
  $api_url = sprintf(
    'https://maps.googleapis.com/maps/api/js?key=%s&callback=initMap&language=%s&region=%s&loading=async&libraries=places',
    rawurlencode($gmaps_key),
    rawurlencode($__roro_locale['language']),
    rawurlencode($__roro_locale['region'])
  );
  wp_enqueue_script(
    'google-maps-api',
    $api_url,
    array('roro-map-loader', 'roro-map'),
    null,
    true // フッタ
  );
  // async/defer を担保
  add_filter('script_loader_tag', function($tag, $handle){
    if ($handle === 'google-maps-api' && strpos($tag,'async')===false) {
      $tag = str_replace('<script ', '<script async defer ', $tag);
    }
    return $tag;
  }, 10, 2);
} else {
  if (current_user_can('manage_options')) {
    echo '<!-- [RoRo Map] Google Maps API key is not configured. -->';
  }
}
?>

<!-- ========================== 画面描画部 ========================== -->
<header class="app-header">
  <img src="<?php echo esc_url( get_template_directory_uri() ); ?>/images/logo_roro.png" alt="Logo" class="small-logo" />
  <h2 data-i18n-key="map_title">おでかけマップ</h2>
  <button id="lang-toggle-btn" class="lang-toggle" title="Change language">
    <img src="<?php echo esc_url( get_template_directory_uri() ); ?>/images/switch-language.png" alt="Language" />
  </button>
</header>

<main id="map-container">
  <div id="category-bar" class="category-bar"></div>
  <div id="map"></div>
  <button id="reset-view-btn" class="reset-btn" data-i18n-key="reset_view" title="周辺表示">周辺表示</button>
</main>

<!-- =========================================================
     4) HERE ローダ（zh の時のみ「プリロード」）
     ※ 以前は読み込み完了後に window.initMap() を再実行していたが削除
     ========================================================= -->
<script>
(function () {
  try {
    var params = new URLSearchParams(location.search);
    var gm = (params.get('gm_lang') || (localStorage.getItem('userLang') || 'ja')).toLowerCase();
    if (gm === 'zh') {
      ['https://js.api.here.com/v3/3.1/mapsjs-core.js',
       'https://js.api.here.com/v3/3.1/mapsjs-service.js',
       'https://js.api.here.com/v3/3.1/mapsjs-ui.js',
       'https://js.api.here.com/v3/3.1/mapsjs-mapevents.js'
      ].forEach(function (src) {
        var s = document.createElement('script');
        s.src = src; s.async = true; s.defer = true;
        s.onerror = function(){ console.warn('[HERE loader] failed:', src); };
        document.head.appendChild(s);
      });
    }
  } catch (e) {
    console.warn('[HERE loader] error:', e);
  }
})();
</script>

<!-- =========================================================
     5) フォールバック（欠落時の自己回復）
     ========================================================= -->
<script>
(function(){
  var base = "<?php echo esc_js($theme_uri); ?>";
  function has(re){ return Array.prototype.some.call(document.scripts, function(s){ return re.test(s.src || ''); }); }
  function inject(src){ var s=document.createElement('script'); s.src=src; s.async=true; s.defer=true; document.head.appendChild(s); }

  // map.js が見つからなければ注入
  if (!has(/\/js\/map\.js(\?|$)/)) inject(base + '/js/map.js');

  // Google API が見つからなければ注入
  <?php if (!empty($gmaps_key)) : ?>
    if (!(window.google && window.google.maps) && !has(/maps\.googleapis\.com\/maps\/api\/js/)) {
      var url = 'https://maps.googleapis.com/maps/api/js'
        + '?key='      + encodeURIComponent('<?php echo esc_js($gmaps_key); ?>')
        + '&callback=' + 'initMap'
        + '&language=' + encodeURIComponent('<?php echo esc_js($__roro_locale['language']); ?>')
        + '&region='   + encodeURIComponent('<?php echo esc_js($__roro_locale['region']); ?>')
        + '&loading=async&libraries=places';
      inject(url);
    }
  <?php endif; ?>
})();
</script>

<?php get_footer(); ?>
