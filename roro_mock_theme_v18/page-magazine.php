<?php
/**
 * Template Name: Magazine Page
 *
 * Displays a grid of magazine issues as defined in the original
 * magazine.html mockup.  The images used here are placeholders; you
 * can replace them in the images directory with your own covers.
 */

get_header();
?>

<header class="app-header">
    <img src="<?php echo esc_url( get_template_directory_uri() ); ?>/images/logo_roro.png" alt="ロゴ" class="small-logo" />
    <h2 data-i18n-key="magazine_title">月間雑誌</h2>
    <button id="lang-toggle-btn" class="lang-toggle" title="Change language">
        <img src="<?php echo esc_url( get_template_directory_uri() ); ?>/images/switch-language.png" alt="Language" />
    </button>
</header>

<main class="magazine-grid">
    <!-- 6月号カード -->
    <div class="magazine-card">
        <img src="<?php echo esc_url( get_template_directory_uri() ); ?>/images/magazine_cover1.png" alt="2025年6月号" />
        <div class="magazine-info">
            <h3 data-i18n-key="mag_issue_june">2025年6月号</h3>
            <p data-i18n-key="mag_desc_june">雨の日でも犬と楽しく過ごせる特集</p>
        </div>
    </div>
    <!-- 7月号カード -->
    <div class="magazine-card">
        <!-- ビーチで帽子をかぶった犬を表紙にした夏号 -->
        <img src="<?php echo esc_url( get_template_directory_uri() ); ?>/images/magazine_cover2.png" alt="2025年7月号" />
        <div class="magazine-info">
            <h3 data-i18n-key="mag_issue_july">2025年7月号</h3>
            <p data-i18n-key="mag_desc_july">紫外線対策とワンちゃんとのおでかけスポットをご紹介♪</p>
        </div>
    </div>
    <!-- 新しい号を追加したい場合は、このカードをコピーして編集してください -->
</main>

<!-- 雑誌閲覧用オーバーレイ -->
<div id="magazine-viewer" class="magazine-viewer" style="display:none;">
    <div class="book"></div>
</div>

<?php get_footer(); ?>