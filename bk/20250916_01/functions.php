<?php
/**
 * Functions and definitions for the RORO Mock Theme (magazine-unified).
 *
 * ポイント
 * - プラグイン版 roro-magazine は magazine ページでは強制停止（dequeue / deregister）。
 * - テーマ版 js/magazine.js をヘッダで読込（DOMContentLoaded 済でも動くように）。
 * - magazine.js にテーマURL（画像パス正規化用）を wp_localize_script で渡す。
 * - そのほかのページ（map / login / signup / favorites / profile / dify）は従来どおり読み分け。
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * テーマ初期化
 */
function roro_mock_theme_setup() {
    add_theme_support( 'title-tag' );
    add_theme_support( 'custom-logo' );
    add_theme_support( 'post-thumbnails' );
}
add_action( 'after_setup_theme', 'roro_mock_theme_setup' );

/**
 * アセット読み込み（ページ文脈ごとにスクリプト選別）
 */
function roro_mock_theme_enqueue_assets() {
    $theme_uri  = get_template_directory_uri();
    $theme_path = get_template_directory();

    // CSS
    $css = $theme_path . '/css/styles.css';
    if ( file_exists( $css ) ) {
        wp_enqueue_style( 'roro-styles', $theme_uri . '/css/styles.css', array(), filemtime( $css ) );
    }

    // 共通JS（言語/メイン）
    $core_scripts = array(
        'lang' => 'js/lang.js',
        'main' => 'js/main.js',
    );
    foreach ( $core_scripts as $handle => $relative_path ) {
        $full = $theme_path . '/' . $relative_path;
        if ( file_exists( $full ) ) {
            wp_enqueue_script( 'roro-' . $handle, $theme_uri . '/' . $relative_path, array(), filemtime( $full ), true );
        }
    }

    // ページ文脈の判定：テンプレ優先 / slug fallback
    $context = 'login';
    $slug = '';
    if ( is_page() ) {
        $post = get_post();
        if ( $post ) $slug = strtolower( $post->post_name );
    }
    if ( is_front_page() || is_home() ) {
        $context = 'login';
    } elseif ( is_page_template( 'page-map.php' ) || $slug === 'map' ) {
        $context = 'map';
    } elseif ( is_page_template( 'page-magazine.php' ) || $slug === 'magazine' ) {
        $context = 'magazine';
    } elseif ( is_page_template( 'page-favorites.php' ) || $slug === 'favorites' ) {
        $context = 'favorites';
    } elseif ( is_page_template( 'page-profile.php' ) || $slug === 'profile' ) {
        $context = 'profile';
    } elseif ( is_page_template( 'page-signup.php' ) || $slug === 'signup' ) {
        $context = 'signup';
    } elseif ( is_page_template( 'page-dify.php' ) || $slug === 'dify' ) {
        $context = 'dify';
    }

    // 文脈別に追加スクリプトを選別
    $additional = array();
    switch ( $context ) {
        case 'map':
            // For the map page we load several scripts:
            // - map-loader.js to stub window.initMap prior to loading Google Maps
            // - map.js as the core initialization logic for Google and HERE maps
            // - circle-toggle.js adds a toggle button and concentric circle overlays
            // - layout-fix.js adjusts layout on devices with variable viewport and admin bar
            $additional = array(
                'map-loader'   => 'js/map-loader.js',
                'map'          => 'js/map.js',
                'circle-toggle' => 'js/circle-toggle.js',
                'layout-fix'    => 'js/layout-fix.js',
            );
            break;
        case 'magazine':
            $additional = array(
                'magazine' => 'js/magazine.js',
            );
            break;
        case 'favorites':
            $additional = array( 'favorites' => 'js/favorites.js' );
            break;
        case 'profile':
            $additional = array( 'profile' => 'js/profile.js' );
            break;
        case 'signup':
            $additional = array( 'signup' => 'js/signup.js' );
            break;
        case 'dify':
            $additional = array( 'dify' => 'js/dify.js' );
            break;
        case 'login':
        default:
            $additional = array( 'login' => 'js/login.js' );
            break;
    }

    // 追加スクリプトのenqueue（map/magazineはヘッダで）
    foreach ( $additional as $handle => $relative_path ) {
        $full = $theme_path . '/' . $relative_path;
        if ( ! file_exists( $full ) ) {
            continue;
        }
        $in_footer = true;
        if ( $context === 'map' && ( $handle === 'map' || $handle === 'map-loader' || $handle === 'circle-toggle' || $handle === 'layout-fix' ) ) {
            // For the map page we enqueue scripts in the header so that they can
            // safely define window.initMap before the Google API callback
            $in_footer = false;
        }
        if ( $context === 'magazine' && $handle === 'magazine' ) {
            $in_footer = false; // DOMContentLoaded 済でも確実に初期化したい
        }
        wp_enqueue_script(
            'roro-' . $handle,
            $theme_uri . '/' . $relative_path,
            array( 'roro-lang', 'roro-main' ),
            filemtime( $full ),
            $in_footer
        );
    }

    // mapページ：events.js（map.js より前に）
    if ( $context === 'map' ) {
        $events_js = $theme_path . '/data/events.js';
        if ( file_exists( $events_js ) ) {
            wp_enqueue_script(
                'roro-events',
                $theme_uri . '/data/events.js',
                array(),
                filemtime( $events_js ),
                false // ヘッダ
            );
        }
    }

    // ルート情報（例：画面遷移等で使用）
    $routes = array(
        'login'  => home_url( '/' ),
        'map'    => home_url( '/map/' ),
        'signup' => home_url( '/signup/' ),
        'index'  => home_url( '/' ),
        'magazine' => home_url( '/magazine/' ),
    );
    foreach ( array( 'main', 'login', 'signup', 'profile' ) as $h ) {
        $hd = 'roro-' . $h;
        if ( wp_script_is( $hd, 'enqueued' ) ) {
            wp_localize_script( $hd, 'RORO_ROUTES', $routes );
        }
    }

    /**
     * 重要：Magazineページをテーマ版に“一本化”
     * - プラグイン roro-magazine のスクリプトが読み込まれている場合は無効化。
     * - テーマ版 roro-magazine を使い、テーマURLをJSへ渡す。
     */
    if ( $context === 'magazine' ) {
        if ( wp_script_is( 'roro-magazine', 'registered' ) || wp_script_is( 'roro-magazine', 'enqueued' ) ) {
            // プラグインが同名ハンドルで登録している想定
            wp_dequeue_script( 'roro-magazine' );
            wp_deregister_script( 'roro-magazine' );
        }
        // テーマ版 magazine.js（上で enqueue 済み）
        if ( wp_script_is( 'roro-magazine', 'enqueued' ) ) {
            wp_localize_script( 'roro-magazine', 'RORO_THEME', array(
                'base' => $theme_uri, // 画像パスの正規化に使用（JS側の img() で使用）
            ) );
        } else {
            // もしハンドル名が 'roro-magazine' になっていない場合の保険
            if ( wp_script_is( 'roro-magazine', 'registered' ) ) {
                wp_localize_script( 'roro-magazine', 'RORO_THEME', array( 'base' => $theme_uri ) );
            } elseif ( wp_script_is( 'roro-magazine', 'enqueued' ) === false && wp_script_is( 'roro-magazine', 'registered' ) === false ) {
                // 追加スクリプトが 'roro-magazine' でなかったケース（例えば 'roro-magazine-custom' のような場合）
                // 'roro-magazine' に統一するのが望ましいが、ここでは最初の magazine.js に対してローカライズ。
                foreach ( $additional as $handle => $rp ) {
                    if ( $handle === 'magazine' ) {
                        wp_localize_script( 'roro-' . $handle, 'RORO_THEME', array( 'base' => $theme_uri ) );
                    }
                }
            }
        }
    }
}
add_action( 'wp_enqueue_scripts', 'roro_mock_theme_enqueue_assets' );

/**
 * 見た目用のbodyクラス（Frontを簡易ログイン画面扱いに）
 */
function roro_mock_theme_body_class( $classes ) {
    if ( is_front_page() || is_home() ) {
        $classes[] = 'login-page';
    }
    if ( is_page_template( 'page-map.php' ) || get_post_field( 'post_name', get_post() ) === 'map' ) {
        $classes[] = 'map-page';
    }

    // ▼ 追加：サインアップ画面の見た目用クラス
    if ( is_page_template( 'page-signup.php' ) || get_post_field( 'post_name', get_post() ) === 'signup' ) {
        $classes[] = 'signup-page';
    }

    return $classes;
}
add_filter( 'body_class', 'roro_mock_theme_body_class' );

/**
 * mapの古い静的パス互換（省略可能）
 */
function roro_mock_theme_add_rewrites() {
    add_rewrite_rule( '^mock-02_map(?:/index\.html)?/?$', 'index.php?pagename=map', 'top' );
}
add_action( 'init', 'roro_mock_theme_add_rewrites' );

/**
 * ============================================================
 * RORO_FORCE_MAG_GLOBAL: Always enqueue magazine assets site-wide
 * - Enqueues js/magazine.js and css/magazine.css on every page to avoid missing injection.
 * - Adds inline bootstrap to expose openMagazineAlias with retries.
 * RORO_MAG_EMERGENCY_INJECTOR: Dynamic injection if magazine.js is removed by optimizers.
 * ============================================================
 */
add_action( 'wp_enqueue_scripts', function () {
    $theme_uri  = get_template_directory_uri();
    $theme_path = get_template_directory();
    $mag_js  = $theme_path . '/js/magazine.js';
    $mag_css = $theme_path . '/css/magazine.css';
    if ( file_exists( $mag_css ) ) {
        wp_enqueue_style( 'roro-magazine-global', $theme_uri . '/css/magazine.css', array(), filemtime( $mag_css ) );
    }
    if ( file_exists( $mag_js ) ) {
        wp_enqueue_script( 'roro-magazine-global', $theme_uri . '/js/magazine.js', array(), filemtime( $mag_js ), false );
        wp_localize_script( 'roro-magazine-global', 'RORO_THEME', array( 'base' => $theme_uri ) );
        $bootstrap = <<<JS
(function(){
  function expose(){
    if (typeof window.openMagazine === 'function') {
      window.openMagazineAlias = window.openMagazine;
      return;
    }
    var tries=0;
    (function retry(){
      tries++;
      if (typeof window.openMagazine === 'function') {
        window.openMagazineAlias = window.openMagazine;
      } else if (tries < 40) {
        setTimeout(retry, 150);
      }
    })();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', expose, {once:true});
  } else {
    expose();
  }
  window.addEventListener('load', expose, {once:true});
})();
JS;
        wp_add_inline_script( 'roro-magazine-global', $bootstrap, 'after' );
    }
}, 5);

// Emergency injector: if magazine.js is missing at runtime, inject it
add_action( 'wp_print_footer_scripts', function(){
    ?>
    <script>
    (function(){
      var hasMag = Array.prototype.some.call(document.scripts, function(s){ return /\/js\/magazine\.js(\?|$)/.test(s.src); });
      if(!hasMag){
        var base = (window.RORO_THEME ? RORO_THEME.base : document.body.getAttribute('data-theme-base') || '');
        var s = document.createElement('script');
        s.src = base + '/js/magazine.js';
        document.head.appendChild(s);
      }
    })();
    </script>
    <?php
});
/* End RORO_MAG_EMERGENCY_INJECTOR */