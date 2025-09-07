<?php
/**
 * Header template for the RORO Mock Theme.
 *
 * This template outputs the basic document structure and includes the
 * WordPress header hooks.  Individual page templates are responsible
 * for rendering their own page‑specific header content (such as the
 * application header with logo and title) after calling get_header().
 */
?><!DOCTYPE html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo( 'charset' ); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <!-- Include the favicon from the images directory -->
    <link rel="icon" href="<?php echo esc_url( get_template_directory_uri() ); ?>/images/favicon.ico" type="image/x-icon" />
    <?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>