<?php
/**
 * Template Name: Map Page
 *
 * 最優先ゴール：
 *  - このテンプレートが使われる限り、地図関連JSが必ず正しい順で読み込まれる。
 *  - Google の callback=initMap が確実に window.initMap を呼べる。
 *
 * 注意：
 *  - 最適化系プラグイン使用時は、以下4ハンドルを「結合・遅延の除外」にしてください。
 *      roro-map-loader, roro-events, roro-map, google-maps-api
 */

if (!defined('ABSPATH')) exit;

get_header();

/** =========================================================
 *  0) APIキーを <meta> でローダ/初期化に渡す（旧版の資産を維持）
 * ======================================================== */
if (!function_exists('roro_print_map_api_metas')) {
  function roro_print_map_api_metas() {
    // 取得元は運用に合わせて調整。定数/環境変数/オプションを順に優先してもOK
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
 *  1) 言語/地域の決定
 *     - 旧版の「WPロケールベース」を維持しつつ、
 *       UI言語からの明示上書き（?gm_lang=ja|en|zh|ko）を可能にする
 * ======================================================== */
function roro_resolve_map_locale() {
  // 1) クエリ ?gm_lang= から優先的に決定
  $ui = isset($_GET['gm_lang']) ? strtolower(sanitize_text_field($_GET['gm_lang'])) : '';
  $ui = in_array($ui, array('ja','en','zh','ko'), true) ? $ui : '';

  // 2) UI指定がなければ WP ロケールから推定
  if ($ui === '') {
    $loc = get_locale(); // 例: ja_JP / en_US / zh_CN / ko_KR ...
    if (strpos($loc,'ja') === 0)      $ui = 'ja';
    elseif (strpos($loc,'en') === 0)  $ui = 'en';
    elseif (strpos($loc,'zh') === 0)  $ui = 'zh';
    elseif (strpos($loc,'ko') === 0)  $ui = 'ko';
    else $ui = 'ja';
  }

  // 3) Google Maps の language/region へマップ（必要に応じて運用で調整）
  switch ($ui) {
    case 'en': return array('language' => 'en',    'region' => 'US'); // 旧版の既定を踏襲
    case 'zh': return array('language' => 'zh-CN', 'region' => 'CN');
    case 'ko': return array('language' => 'ko',    'region' => 'KR');
    case 'ja':
    default:   return array('language' => 'ja',    'region' => 'JP');
  }
}
$__roro_locale = roro_resolve_map_locale();

/** =========================================================
 *  2) Google Maps API キー取得
 * ======================================================== */
if (!function_exists('roro_get_google_maps_api_key')) {
  function roro_get_google_maps_api_key() {
    $candidates = array(
      getenv('RORO_GOOGLE_MAPS_API_KEY'),
      getenv('GOOGLE_MAPS_API_KEY'),
      defined('RORO_GOOGLE_MAPS_API_KEY') ? RORO_GOOGLE_MAPS_API_KEY : null,
      get_option('roro_google_maps_api_key'),
      get_option('roro_gmaps_api_key') // 旧版互換
    );
    foreach ($candidates as $v) if (!empty($v)) return $v;
    return '';
  }
}
$gmaps_key = roro_get_google_maps_api_key();

/** =========================================================
 *  3) スクリプトを WordPress 標準の enqueue で読み込む（旧版踏襲）
 *     - 順序と依存を WP に管理させ、最適化プラグイン除外も従来どおり
 * ======================================================== */
$theme_uri  = get_template_directory_uri();
$theme_path = get_template_directory();

/** 3-1) Google callback シム（必ず先に） */
wp_enqueue_script(
  'roro-map-loader',
  $theme_uri . '/js/map-loader.js',
  array(), // 依存なし
  file_exists($theme_path . '/js/map-loader.js') ? filemtime($theme_path . '/js/map-loader.js') : null,
  false    // ヘッダで
); // → initMap() のポーリングで initGoogleMap()/initHereMap() を確実に呼ぶ。:contentReference[oaicite:7]{index=7}

/** 3-2) イベント/マーカーのデータ（あれば map.js の前に） */
$deps_for_map = array();
if ( file_exists( $theme_path . '/data/events.js' ) ) {
  wp_enqueue_script(
    'roro-events',
    $theme_uri . '/data/events.js',
    array(),
    filemtime($theme_path . '/data/events.js'),
    false   // ヘッダで
  );
  $deps_for_map[] = 'roro-events';
}

/** 3-3) 地図アプリ本体（events に依存） */
wp_enqueue_script(
  'roro-map',
  $theme_uri . '/js/map.js',
  $deps_for_map,
  file_exists($theme_path . '/js/map.js') ? filemtime($theme_path . '/js/map.js') : null,
  false  // ヘッダで
); // → initGoogleMap() を公開。カテゴリ/保存/描画ロジックは map.js に集約。:contentReference[oaicite:8]{index=8}

/** 3-4) Google Maps API 本体（WP 側でenqueue：旧版を維持）
 *       - language/region は 1) のロジックで UI 言語により上書き可能
 */
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
    array('roro-map-loader', 'roro-map'), // ローダ→map.js→Google本体の順でOK（callbackはローダが受ける）
    null,
    true  // フッタで
  );
  // async defer を確実に
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
  <img src="<?php echo esc_url( get_template_directory_uri() ); ?>/images/logo_roro.png" alt="ロゴ" class="small-logo" />
  <h2 data-i18n-key="map_title">おでかけマップ</h2>
  <button id="lang-toggle-btn" class="lang-toggle" title="Change language">
    <img src="<?php echo esc_url( get_template_directory_uri() ); ?>/images/switch-language.png" alt="Language" />
  </button>
</header>

<main id="map-container">
  <div id="category-bar" class="category-bar"></div>
  <div id="map"></div>
  <button id="reset-view-btn" class="reset-btn" title="周辺表示" data-i18n-key="reset_view">周辺表示</button>
</main>

<!-- =========================================================
     4) （オプション）HERE ローダ
     - 旧版の方針を温存：zh の時に読み込む想定
     - 実装としては map.js が「zh でも Google を使う」構成ですが、将来方針変更に備え温存
     ========================================================= -->
<script>
(function () {
  try {
    var params = new URLSearchParams(location.search);
    var gm = (params.get('gm_lang') || (localStorage.getItem('userLang') || 'ja')).toLowerCase();
    if (gm === 'zh') {
      var list = [
        'https://js.api.here.com/v3/3.1/mapsjs-core.js',
        'https://js.api.here.com/v3/3.1/mapsjs-service.js',
        'https://js.api.here.com/v3/3.1/mapsjs-ui.js',
        'https://js.api.here.com/v3/3.1/mapsjs-mapevents.js'
      ];
      var loaded = 0;
      list.forEach(function (src) {
        var s = document.createElement('script');
        s.src = src; s.async = true; s.defer = true;
        s.onload = function(){ loaded++; if (loaded === list.length && typeof window.initMap === 'function') { window.initMap(); } };
        s.onerror = function(){ console.error('[HERE loader] failed:', src); };
        document.head.appendChild(s);
      });
    }
  } catch (e) {
    console.error('[HERE loader] error:', e);
  }
})();
</script>

<!-- =========================================================
     5) フォールバック（最適化や順序崩れの救済）
     - map.js / Google 本体が欠けた場合に注入する
     - language/region は 1) の決定結果を使用
     ========================================================= -->
<script>
(function(){
  var base = "<?php echo esc_js($theme_uri); ?>";
  function has(re){ return Array.prototype.some.call(document.scripts, function(s){ return re.test(s.src || ''); }); }
  function inject(src){ var s=document.createElement('script'); s.src=src; s.async=true; s.defer=true; document.head.appendChild(s); console.log('[map fallback] injected:', src); }

  // map.js が無ければ注入
  if (!has(/\/js\/map\.js(\?|$)/)) inject(base + '/js/map.js');

  // Google API が無ければ注入（UI言語 or WPロケールで生成した URL を使用）
  <?php if (!empty($gmaps_key)) : ?>
    if (!window.google || !window.google.maps || !has(/maps\.googleapis\.com\/maps\/api\/js/)) {
      var url = 'https://maps.googleapis.com/maps/api/js'
        + '?key='     + encodeURIComponent('<?php echo esc_js($gmaps_key); ?>')
        + '&callback=' + 'initMap'
        + '&language=' + encodeURIComponent('<?php echo esc_js($__roro_locale['language']); ?>')
        + '&region='   + encodeURIComponent('<?php echo esc_js($__roro_locale['region']); ?>')
        + '&loading=async&libraries=places';
      inject(url);
    }
  <?php else: ?>
    console.warn('[map fallback] Google API key is not configured on server; cannot inject API.');
  <?php endif; ?>
})();
</script>

<?php get_footer(); ?>
