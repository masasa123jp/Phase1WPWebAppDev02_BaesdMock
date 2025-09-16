<?php
/**
 * Template Name: Magazine Page
 *
 * テーマ内の js/magazine.js と連動する雑誌ビューのマークアップ。
 * クリック対象のカードは .magazine-card として2枚用意（増やしてOK）。
 */

get_header();
?>

<header class="app-header">
  <img src="<?php echo esc_url( get_template_directory_uri() ); ?>/images/logo_roro.png" alt="ロゴ" class="small-logo" />
  <h2 data-i18n-key="mag_title">雑誌</h2>
  <button id="lang-toggle-btn" class="lang-toggle" title="Change language">
    <img src="<?php echo esc_url( get_template_directory_uri() ); ?>/images/switch-language.png" alt="Language" />
  </button>
</header>

<main class="magazine-grid">
  <div class="magazine-card" data-mag-index="0">
    <img src="<?php echo esc_url( get_template_directory_uri() ); ?>/images/magazine_cover1.png" alt="2025年6月号" />
    <div class="magazine-info">
      <h3 data-i18n-key="mag_issue_june">2025年6月号</h3>
      <p data-i18n-key="mag_desc_june">雨の日でも犬と楽しく過ごせる特集</p>
    </div>
  </div>
  <div class="magazine-card" data-mag-index="1">
    <img src="<?php echo esc_url( get_template_directory_uri() ); ?>/images/magazine_cover2.png" alt="2025年7月号" />
    <div class="magazine-info">
      <h3 data-i18n-key="mag_issue_july">2025年7月号</h3>
      <p data-i18n-key="mag_desc_july">紫外線対策とワンちゃんのおでかけ特集</p>
    </div>
  </div>
</main>

<!-- 雑誌閲覧用オーバーレイ（js/magazine.js が操作） -->
<div id="magazine-viewer" class="magazine-viewer" style="display:none;">
  <div class="book"></div>
</div>

<?php get_footer(); ?>