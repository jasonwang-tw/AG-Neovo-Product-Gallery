<?php
/**
 * Plugin Name: AG Neovo Product Gallery
 * Description: AG Neovo product gallery using WooCommerce's native slider and lightbox.
 * Version: 1.0.8
 * Requires at least: 6.8
 * Requires PHP: 7.4
 * Requires Plugins: woocommerce
 * Text Domain: agneovo-product-gallery
 * License: GPL-2.0-or-later
 */

namespace AGNeovo\ProductGallery;

defined( 'ABSPATH' ) || exit;

final class Gallery {
    private const LEGACY_PLUGIN = 'woo-product-gallery-slider/woo-product-gallery-slider.php';
    private static $enabled = false;

    public static function boot() {
        // Do this before WordPress queries or the template start generating cacheable output.
        if ( isset( $_GET['agneovo_gallery_preview'] ) && ! defined( 'DONOTCACHEPAGE' ) ) {
            define( 'DONOTCACHEPAGE', true );
        }
        add_action( 'wp', [ __CLASS__, 'configure' ], 20 );
    }

    public static function configure() {
        if ( is_admin() || ! function_exists( 'is_product' ) || ! is_product() || ! function_exists( 'WC' ) || ! function_exists( 'wc_get_template' ) ) {
            return;
        }

        $preview = isset( $_GET['agneovo_gallery_preview'] ) && is_string( $_GET['agneovo_gallery_preview'] )
            && wp_verify_nonce( sanitize_text_field( wp_unslash( $_GET['agneovo_gallery_preview'] ) ), 'agneovo_product_gallery_preview_' . get_queried_object_id() );
        $active_plugins = (array) get_option( 'active_plugins', [] );
        $network_plugins = is_multisite() ? (array) get_site_option( 'active_sitewide_plugins', [] ) : [];
        $legacy_active = in_array( self::LEGACY_PLUGIN, $active_plugins, true ) || isset( $network_plugins[ self::LEGACY_PLUGIN ] );
        if ( $legacy_active && ! $preview ) {
            return;
        }
        if ( $preview ) {
            nocache_headers();
            header( 'X-Robots-Tag: noindex, nofollow', true );
        }

        self::$enabled = true;
        if ( class_exists( '\Product_Gallery_Sldier\Product' ) ) {
            $legacy = \Product_Gallery_Sldier\Product::get_instance();
            remove_action( 'woocommerce_before_single_product_summary', [ $legacy, 'wpgs_product_image' ], 20 );
            remove_action( 'wp_enqueue_scripts', [ $legacy, 'frontend_scripts' ], 90 );
        }
        remove_filter( 'wc_get_template', 'wpgs_get_template', 10 );
        remove_action( 'woocommerce_before_single_product_summary', 'woocommerce_show_product_images', 20 );
        add_action( 'woocommerce_before_single_product_summary', [ __CLASS__, 'render' ], 20 );
        add_action( 'woocommerce_product_thumbnails', 'woocommerce_show_product_thumbnails', 20 );

        add_theme_support( 'wc-product-gallery-slider' );
        add_theme_support( 'wc-product-gallery-lightbox' );
        add_filter( 'woocommerce_single_product_zoom_enabled', '__return_false' );
        add_filter( 'woocommerce_single_product_image_gallery_classes', [ __CLASS__, 'classes' ] );
        add_filter( 'woocommerce_single_product_carousel_options', [ __CLASS__, 'carousel_options' ] );
        add_filter( 'woocommerce_gallery_image_size', [ __CLASS__, 'main_image_size' ], 100 );
        add_filter( 'woocommerce_gallery_thumbnail_size', [ __CLASS__, 'thumbnail_size' ], 100 );
        add_filter( 'wc_get_template', [ __CLASS__, 'native_template' ], 100, 2 );
        add_filter( 'body_class', [ __CLASS__, 'body_class' ] );
        add_action( 'wp_enqueue_scripts', [ __CLASS__, 'assets' ], 100 );
    }

    public static function render() {
        echo '<div class="productMainImg agneovo-gallery-shell">';
        wc_get_template( 'single-product/product-image.php' );
        echo '</div>';
    }

    public static function native_template( $located, $template_name ) {
        if ( in_array( $template_name, [ 'single-product/product-image.php', 'single-product/product-thumbnails.php', 'single-product/photoswipe.php' ], true ) ) {
            $native = WC()->plugin_path() . '/templates/' . $template_name;
            if ( is_readable( $native ) ) {
                return $native;
            }
        }
        return $located;
    }

    public static function classes( $classes ) {
        $classes[] = 'agneovo-product-gallery';
        return $classes;
    }

    public static function body_class( $classes ) {
        $classes[] = 'agneovo-product-gallery-active';
        return $classes;
    }

    public static function main_image_size() { return 'large'; }
    public static function thumbnail_size() { return 'thumbnail'; }

    public static function carousel_options( $options ) {
        return array_merge( $options, [
            'animation' => 'slide', 'animationSpeed' => 700, 'smoothHeight' => false,
            'slideshow' => false, 'directionNav' => false, 'controlNav' => 'thumbnails',
            // Native PhotoSwipe requires a non-cloned set of slides. Our thumbnail arrows wrap.
            'animationLoop' => false, 'keyboard' => false, 'touch' => true,
        ] );
    }

    public static function assets() {
        if ( ! self::$enabled ) { return; }
        $base = plugin_dir_url( __FILE__ );
        wp_enqueue_style( 'agneovo-product-gallery', $base . 'assets/gallery.css', [], (string) filemtime( __DIR__ . '/assets/gallery.css' ) );
        wp_enqueue_script( 'agneovo-product-gallery', $base . 'assets/gallery.js', [ 'jquery', 'wc-single-product' ], (string) filemtime( __DIR__ . '/assets/gallery.js' ), true );
        wp_localize_script( 'agneovo-product-gallery', 'agneovoGalleryLabels', [
            'previous' => __( 'Previous (arrow left)', 'woocommerce' ),
            'next' => __( 'Next (arrow right)', 'woocommerce' ), 'image' => __( 'Image' ),
        ] );
        // Progressive enhancement: native templates start hidden until their JS initializes.
        // Our scoped CSS keeps the first image visible even if a script is unavailable.
    }
}

Gallery::boot();

