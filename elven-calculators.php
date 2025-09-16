<?php
/**
 * Plugin Name: Elven Calculators
 * Description: Provides calculator shortcodes for Elven.dk
 * Version: 1.0.0
 * Author: Thomas Løwe Hansen
 * License: GPL-2.0-or-later
 * Text Domain: elven-calculators
 */

if (!defined('ABSPATH')) { exit; }

define('ELVEN_CALC_VERSION', '2.0.0');
define('ELVEN_CALC_URL', plugins_url('', __FILE__));
define('ELVEN_CALC_PATH', plugin_dir_path(__FILE__));

/**
 * Shortcode for KWH Calculator
 * [elven_kwh_calc price="2,50" watt="100"]
 */
add_shortcode('elven_kwh_calc', function($atts){
    $atts = shortcode_atts([
        'price' => '', // Default KWH price, e.g. "2.50"
        'watt'  => '', // Default watt, e.g. "100"
    ], $atts, 'elven_kwh_calc');

    static $i = 0; $i++;
    $id = 'elven-kwh-calculator-' . $i;

    ob_start(); ?>
    <div id="<?php echo esc_attr($id); ?>"
         class="elven-kwh-calculator"
         data-default-price="<?php echo esc_attr($atts['price']); ?>"
         data-default-watt="<?php echo esc_attr($atts['watt']); ?>"></div>
    <?php
    return ob_get_clean();
});

/**
 * Shortcode for EV Calculator
 * [elven_ev_calc price="2.50" fuel_price="14.00"]
 */
add_shortcode('elven_ev_calc', function($atts){
    $atts = shortcode_atts([
        'price'      => '', // Default EV price, e.g. "2.50"
        'fuel_price' => '', // Default fuel price, e.g. "14"
    ], $atts, 'elven_ev_calc');

    static $j = 0; $j++;
    $id = 'elven-ev-calculator-' . $j;

    ob_start(); ?>
    <div id="<?php echo esc_attr($id); ?>"
         class="elven-ev-calculator"
         data-default-price="<?php echo esc_attr($atts['price']); ?>"
         data-default-fuel-price="<?php echo esc_attr($atts['fuel_price']); ?>"></div>
    <?php
    return ob_get_clean();
});

/**
 * Enqueue assets only when shortcodes are present
 */
add_action('wp_enqueue_scripts', function(){
    if (!is_singular()) return;
    global $post;
    if (!($post instanceof WP_Post)) return;

    $has_kwh = has_shortcode($post->post_content, 'elven_kwh_calc');
    $has_ev  = has_shortcode($post->post_content, 'elven_ev_calc');

    // Enqueue shared CSS if either shortcode is present
    if ($has_kwh || $has_ev) {
        wp_register_style('elven-shared-css', ELVEN_CALC_URL . '/assets/elven-shared.css', [], ELVEN_CALC_VERSION);
        wp_enqueue_style('elven-shared-css');
    }

    // Enqueue KWH script if KWH shortcode is present
    if ($has_kwh) {
        wp_register_script('elven-kwh-js', ELVEN_CALC_URL . '/assets/elven-kwh.js', [], ELVEN_CALC_VERSION, true);
        wp_enqueue_script('elven-kwh-js');
    }

    // Enqueue EV script if EV shortcode is present
    if ($has_ev) {
        wp_register_script('elven-ev-js', ELVEN_CALC_URL . '/assets/elven-ev.js', [], ELVEN_CALC_VERSION, true);
        wp_enqueue_script('elven-ev-js');
    }
});

/**
 * Add defer attribute to scripts for better performance
 */
add_filter('script_loader_tag', function($tag, $handle, $src){
    if ($handle === 'elven-kwh-js' || $handle === 'elven-ev-js') {
        $tag = str_replace(' src=', ' defer src=', $tag);
    }
    return $tag;
}, 10, 3);