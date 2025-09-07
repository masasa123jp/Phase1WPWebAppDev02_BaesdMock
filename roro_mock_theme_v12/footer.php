<?php
/**
 * Footer template for the RORO Mock Theme.
 *
 * The theme includes a bottom navigation bar on every page after login.
 * This footer renders that navigation and highlights the active page
 * automatically based on the current post slug.  After the navigation
 * WordPress footer hooks are called and the document is closed.
 */

// Determine the current slug to apply the active class.  If the front
// page is being displayed we treat it as the login page.
$current_slug = '';
if ( is_front_page() || is_home() ) {
    $current_slug = 'index';
} elseif ( is_page() ) {
    global $post;
    if ( $post instanceof WP_Post ) {
        $current_slug = $post->post_name;
    }
}

// Helper function to echo active class.
function roro_active_class( $slug, $current_slug ) {
    return ( $slug === $current_slug ) ? ' active' : '';
}
?>

    <nav class="bottom-nav">
        <a href="<?php echo esc_url( home_url( '/map/' ) ); ?>" class="nav-item<?php echo roro_active_class( 'map', $current_slug ); ?>">
            <img src="<?php echo esc_url( get_template_directory_uri() ); ?>/images/icon_map.png" alt="Map" />
            <span data-i18n-key="nav_map">マップ</span>
        </a>
        <a href="<?php echo esc_url( home_url( '/dify/' ) ); ?>" class="nav-item<?php echo roro_active_class( 'dify', $current_slug ); ?>">
            <img src="<?php echo esc_url( get_template_directory_uri() ); ?>/images/icon_ai.png" alt="AI" />
            <span data-i18n-key="nav_ai">AI</span>
        </a>
        <a href="<?php echo esc_url( home_url( '/favorites/' ) ); ?>" class="nav-item<?php echo roro_active_class( 'favorites', $current_slug ); ?>">
            <img src="<?php echo esc_url( get_template_directory_uri() ); ?>/images/icon_favorite.png" alt="お気に入り" />
            <span data-i18n-key="nav_favorites">お気に入り</span>
        </a>
        <a href="<?php echo esc_url( home_url( '/magazine/' ) ); ?>" class="nav-item<?php echo roro_active_class( 'magazine', $current_slug ); ?>">
            <img src="<?php echo esc_url( get_template_directory_uri() ); ?>/images/icon_magazine.png" alt="雑誌" />
            <span data-i18n-key="nav_magazine">雑誌</span>
        </a>
        <a href="<?php echo esc_url( home_url( '/profile/' ) ); ?>" class="nav-item<?php echo roro_active_class( 'profile', $current_slug ); ?>">
            <img src="<?php echo esc_url( get_template_directory_uri() ); ?>/images/icon_profile.png" alt="マイページ" />
            <span data-i18n-key="nav_profile">マイページ</span>
        </a>
    </nav>

    <?php wp_footer(); ?>
</body>
</html>