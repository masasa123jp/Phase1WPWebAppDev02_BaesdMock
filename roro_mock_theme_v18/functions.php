<?php
/**
 * Functions and definitions for the RORO Mock Theme.
 *
 * This file is responsible for enqueueing the original CSS and
 * JavaScript assets that power the mock application as well as
 * enabling a few core WordPress features such as automatic title
 * management.  By centralising asset loading here we avoid hard
 * coding paths in our templates and ensure cache busting via file
 * modification times.  Additional functionality can be added here as
 * needed.
 */

// Exit if accessed directly.
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Set up theme supports.
 */
function roro_mock_theme_setup() {
    // Let WordPress manage the document title.
    add_theme_support( 'title-tag' );
    // Enable support for custom logos (unused but available).
    add_theme_support( 'custom-logo' );
    // Enable featured images.
    add_theme_support( 'post-thumbnails' );
}
add_action( 'after_setup_theme', 'roro_mock_theme_setup' );

/**
 * Enqueue styles and scripts from the original mockup.
 */
function roro_mock_theme_enqueue_assets() {
    $theme_uri  = get_template_directory_uri();
    $theme_path = get_template_directory();

    // Main stylesheet from the mock project.
    wp_enqueue_style( 'roro-styles', $theme_uri . '/css/styles.css', array(), filemtime( $theme_path . '/css/styles.css' ) );

    /*
     * JavaScript files are enqueued conditionally based on the current page.
     * Loading all scripts on every page can lead to unintended behaviour—for
     * example, map.js and profile.js both call requireLogin() at the top. If
     * these scripts run on the login screen they will trigger endless
     * redirects because no user is logged in yet.  To avoid this, only
     * enqueue the scripts that are actually needed for the current template.
     */
    // Always enqueue the core language and main scripts.
    $core_scripts = array(
        'lang' => 'js/lang.js',
        'main' => 'js/main.js',
    );
    foreach ( $core_scripts as $handle => $relative_path ) {
        $full_path = $theme_path . '/' . $relative_path;
        if ( file_exists( $full_path ) ) {
            wp_enqueue_script( 'roro-' . $handle, $theme_uri . '/' . $relative_path, array(), filemtime( $full_path ), true );
        }
    }

    // Determine the current page context based on page template rather than slug.
    // This avoids issues where the slug does not match our expectations (e.g. user
    // creates a page with a custom slug).  When no specific template matches,
    // default to the login screen.
    $context = '';
    if ( is_front_page() || is_home() ) {
        $context = 'login';
    } elseif ( is_page_template( 'page-signup.php' ) ) {
        $context = 'signup';
    } elseif ( is_page_template( 'page-map.php' ) ) {
        $context = 'map';
    } elseif ( is_page_template( 'page-magazine.php' ) ) {
        $context = 'magazine';
    } elseif ( is_page_template( 'page-favorites.php' ) ) {
        $context = 'favorites';
    } elseif ( is_page_template( 'page-profile.php' ) ) {
        $context = 'profile';
    } elseif ( is_page_template( 'page-dify.php' ) ) {
        $context = 'dify';
    } elseif ( is_404() ) {
        $context = 'login';
    } else {
        $context = 'login';
    }
    // Decide which additional scripts to load based on the context.
    switch ( $context ) {
        case 'login':
            $additional = array( 'login' => 'js/login.js' );
            break;
        case 'signup':
            $additional = array( 'signup' => 'js/signup.js' );
            break;
        case 'map':
            $additional = array( 'map' => 'js/map.js' );
            break;
        case 'magazine':
            $additional = array( 'magazine' => 'js/magazine.js' );
            break;
        case 'favorites':
            $additional = array( 'favorites' => 'js/favorites.js' );
            break;
        case 'profile':
            $additional = array( 'profile' => 'js/profile.js' );
            break;
        case 'dify':
            /*
             * The Dify page uses ES modules for its implementation.  The
             * entrypoint dify-switch.js imports dify-embed.js and
             * custom-chat-ui.js via native module syntax.  Loading these
             * support scripts directly via wp_enqueue_script() as
             * non‑module scripts causes syntax errors ("Unexpected token
             * 'export'" or "Cannot use import statement outside a
             * module").  To avoid this, only enqueue the entrypoint
             * dify-switch.js here.  The page template (page-dify.php)
             * includes a <script type="module"> tag for
             * dify-switch.js, but we still enqueue it to generate a
             * handle for localisation and versioning.  The import
             * dependencies will be resolved by the browser.  We do
             * not enqueue dify.js on this page because the custom
             * module implementation supersedes it.
             */
            $additional = array(
                'dify-switch' => 'js/dify-switch.js',
            );
            break;
        default:
            // Unknown context: treat as login page.
            $additional = array( 'login' => 'js/login.js' );
            break;
    }
    // Enqueue the additional scripts determined above.
    foreach ( $additional as $handle => $relative_path ) {
        $full_path = $theme_path . '/' . $relative_path;
        if ( file_exists( $full_path ) ) {
            /*
             * Map scripts need to be available before the Google Maps API callback runs.
             * If we defer loading until the footer, the callback defined in the page
             * template may fire before map.js has registered its initMap() function.
             * To avoid "InvalidValueError: initMap is not a function", load the map
             * script in the header when the current slug is "map".  All other
             * scripts can remain in the footer.
             */
            $in_footer = true;
            if ( $context === 'map' && $handle === 'map' ) {
                $in_footer = false;
            }
            // For the magazine page, load its script in the header so that
            // its DOMContentLoaded callback fires before the event has
            // already been dispatched.  If loaded in the footer the
            // DOMContentLoaded event has already occurred and magazine.js
            // would never execute its setup logic.
            if ( $context === 'magazine' && $handle === 'magazine' ) {
                $in_footer = false;
            }
            wp_enqueue_script( 'roro-' . $handle, $theme_uri . '/' . $relative_path, array( 'roro-lang', 'roro-main' ), filemtime( $full_path ), $in_footer );
        }
    }

    // For the map page, enqueue the events data script.
    if ( isset( $additional['map'] ) ) {
        $events_js = $theme_path . '/data/events.js';
        if ( file_exists( $events_js ) ) {
            // Load events.js before map.js when viewing the map page.  Since map.js
            // may load in the header, events.js should follow the same placement.
            $events_in_footer = ! ( $context === 'map' );
            wp_enqueue_script( 'roro-events', $theme_uri . '/data/events.js', array(), filemtime( $events_js ), $events_in_footer );
        }
    }

    /*
     * Provide absolute URLs to the front‑end scripts via wp_localize_script.
     * This remains similar to the previous implementation, but now we only
     * attach the routes to scripts that are enqueued on the current page.
     */
    $routes = array(
        'login'  => home_url( '/mock-01_logon/' ),
        'map'    => home_url( '/map/' ),
        'signup' => home_url( '/signup/' ),
        'index'  => home_url( '/mock-01_logon/' ),
    );
    // List of script handles that may require localisation.
    $localisable = array( 'main', 'login', 'signup', 'profile' );
    foreach ( $localisable as $localize_handle ) {
        $script_handle = 'roro-' . $localize_handle;
        if ( wp_script_is( $script_handle, 'enqueued' ) ) {
            wp_localize_script( $script_handle, 'RORO_ROUTES', $routes );
        }
    }
}
add_action( 'wp_enqueue_scripts', 'roro_mock_theme_enqueue_assets' );

/**
 * Add a custom body class for the front page so that the login page
 * styles are applied.  The original mockup uses the `login-page` class
 * to adjust layout and font sizes; adding it here replicates that
 * behaviour without altering the global header template.
 *
 * @param array $classes Existing body classes.
 * @return array Modified body classes.
 */
function roro_mock_theme_body_class( $classes ) {
    if ( is_front_page() || is_home() ) {
        $classes[] = 'login-page';
    }
    return $classes;
}
add_filter( 'body_class', 'roro_mock_theme_body_class' );

/**
 * Hide the WordPress admin bar on the front‑end.
 *
 * Showing the admin bar can cause content to shift on pages with fixed
 * headers or precise layouts, which in turn may manifest as a
 * "ちらつき" effect when the page loads.  Disabling the admin bar
 * ensures a stable layout on the public‑facing site.  Site editors
 * can still access the dashboard via /wp-admin/.
 *
 * @return bool False to hide the admin bar.
 */
function roro_mock_theme_hide_admin_bar() {
    return false;
}
add_filter( 'show_admin_bar', 'roro_mock_theme_hide_admin_bar' );

/**
 * Modify the script tag for specific handles to load as ES modules.
 *
 * The Dify page relies on native JavaScript modules (import/export).
 * WordPress enqueues scripts with type="text/javascript" by default,
 * which causes syntax errors when module syntax is encountered.  This
 * filter changes the type attribute to "module" for the designated
 * handles so that the browser interprets them correctly.
 *
 * @param string $tag    The HTML script tag.
 * @param string $handle The script's registered handle.
 * @param string $src    The script's source URL.
 * @return string Modified script tag for module scripts.
 */
function roro_mock_theme_set_module_type( $tag, $handle, $src ) {
    // Handles that should be loaded as ES modules.  Prefix with
    // roro- because wp_enqueue_script prepends the theme prefix to
    // our handle names.
    $module_handles = array( 'roro-dify-switch' );
    if ( in_array( $handle, $module_handles, true ) ) {
        // Build a script tag with type="module" and the same src.
        return '<script type="module" src="' . esc_url( $src ) . '"></script>';
    }
    return $tag;
}
add_filter( 'script_loader_tag', 'roro_mock_theme_set_module_type', 10, 3 );

/**
 * Custom rewrite rules to support legacy static paths.
 *
 * The original mockup used URLs such as `/mock-01_logon/index.html` and
 * `/mock-02_map/index.html`.  In WordPress, these do not correspond to
 * existing pages and would normally produce a 404.  To provide
 * backwards‑compatible access, rewrite these patterns to the
 * appropriate page slugs (e.g. `/mock-01_logon/` → `/`).
 *
 * After modifying rewrite rules, WordPress needs to flush them.  We
 * trigger a flush on theme activation via `after_switch_theme`.
 */
function roro_mock_theme_add_rewrites() {
    // Map `/mock-01_logon/` and `/mock-01_logon/index.html` to the site front page
    // Use index.php directly so WordPress loads the front‑page template even
    // when no static front page is set.  This avoids relying on
    // `page_on_front` which may be zero.
    add_rewrite_rule( '^mock-01_logon(?:/index\.html)?/?$', 'index.php', 'top' );
    // Map `/mock-02_map/` and `/mock-02_map/index.html` to a page with slug "map" if it exists; fall back to index.php
    add_rewrite_rule( '^mock-02_map(?:/index\.html)?/?$', 'index.php?pagename=map', 'top' );

    // Map `/signup.html` and `/signup/index.html` to the sign‑up page slug.  This
    // allows direct access to the registration screen using the static
    // filename as used in the original mockup.
    add_rewrite_rule( '^signup(?:/index\.html)?/?$', 'index.php?pagename=signup', 'top' );
}
add_action( 'init', 'roro_mock_theme_add_rewrites' );

/**
 * Flush rewrite rules when the theme is activated.
 */
function roro_mock_theme_flush_rewrites() {
    roro_mock_theme_add_rewrites();
    flush_rewrite_rules();
}
add_action( 'after_switch_theme', 'roro_mock_theme_flush_rewrites' );

/**
 * Detect and fix double index.html segments in the request URI.
 *
 * Some server configurations append `index.html` automatically and can
 * inadvertently produce URLs like `/mock-01_logon/index.html/index.html`.
 * WordPress will happily serve this URL via our 404 template, but the
 * unwanted suffix may cause further redirects or duplication.  Before
 * rendering, check the current request URI and, if multiple
 * `index.html` segments are present, perform a 301 redirect to a
 * normalised version containing only a single `index.html`.
 */
function roro_mock_theme_fix_double_index() {
    $uri = $_SERVER['REQUEST_URI'] ?? '';
    if ( preg_match( '#(index\.html/)+index\.html#', $uri ) ) {
        $sanitised = preg_replace( '#(index\.html/)+index\.html#', 'index.html', $uri );
        // Preserve query string if present.
        if ( ! empty( $_SERVER['QUERY_STRING'] ) ) {
            $sanitised .= '?' . $_SERVER['QUERY_STRING'];
        }
        wp_redirect( $sanitised, 301 );
        exit;
    }
}
add_action( 'template_redirect', 'roro_mock_theme_fix_double_index', 1 );