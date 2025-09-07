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

    // JavaScript files.  Loading these on all pages is acceptable for the
    // purpose of the mock conversion.  In a real theme you would conditionally
    // enqueue only what each template requires.
    $scripts = array(
        'lang'        => 'js/lang.js',
        'main'        => 'js/main.js',
        'login'       => 'js/login.js',
        'signup'      => 'js/signup.js',
        'map'         => 'js/map.js',
        'magazine'    => 'js/magazine.js',
        'favorites'   => 'js/favorites.js',
        'profile'     => 'js/profile.js',
        'dify'        => 'js/dify.js',
        'dify-switch' => 'js/dify-switch.js',
        'dify-embed'  => 'js/dify-embed.js',
        'custom-chat' => 'js/custom-chat-ui.js',
    );

    foreach ( $scripts as $handle => $relative_path ) {
        $full_path = $theme_path . '/' . $relative_path;
        if ( file_exists( $full_path ) ) {
            wp_enqueue_script( 'roro-' . $handle, $theme_uri . '/' . $relative_path, array(), filemtime( $full_path ), true );
        }
    }

    // Load the events data file for the map page if it exists.
    $events_js = $theme_path . '/data/events.js';
    if ( file_exists( $events_js ) ) {
        wp_enqueue_script( 'roro-events', $theme_uri . '/data/events.js', array(), filemtime( $events_js ), true );
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