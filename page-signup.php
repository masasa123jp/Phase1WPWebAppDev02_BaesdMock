<?php
/**
 * Template Name: Sign Up Page
 */
if (!defined('ABSPATH')) exit;
get_header();
?>

<header class="app-header">
  <img src="<?php echo esc_url( get_template_directory_uri() ); ?>/images/logo_roro.png" alt="ロゴ" class="small-logo" />
  <h2 data-i18n-key="signup_title">新規登録</h2>
  <button id="lang-toggle-btn" class="lang-toggle" title="Change language">
    <img src="<?php echo esc_url( get_template_directory_uri() ); ?>/images/switch-language.png" alt="Language" />
  </button>
</header>

<main class="signup-container" role="main">
  <form id="signup-form" autocomplete="off">
    <div class="input-group">
      <label for="name" data-i18n-key="signup_name">お名前</label>
      <input type="text" id="name" required
             placeholder="山田太郎" data-i18n-placeholder="ph_name" />
    </div>

    <div class="input-group">
      <label for="furigana" data-i18n-key="signup_furigana">ふりがな</label>
      <input type="text" id="furigana"
             placeholder="やまだたろう" data-i18n-placeholder="ph_furigana" />
    </div>

    <div class="input-group">
      <label for="email" data-i18n-key="signup_email">メールアドレス</label>
      <input type="email" id="email" required
             placeholder="sample@example.com" data-i18n-placeholder="ph_email" />
    </div>

    <div class="input-group">
      <label for="password" data-i18n-key="signup_password">パスワード</label>
      <input type="password" id="password" required
             placeholder="半角英数6文字以上" data-i18n-placeholder="ph_password" />
    </div>

    <div class="input-group">
      <label for="petType" data-i18n-key="signup_pet_type">ペットの種類</label>
      <select id="petType">
        <option value="dog" data-i18n-key="pet_dog">犬</option>
        <option value="cat" data-i18n-key="pet_cat">猫</option>
      </select>
    </div>

    <div class="input-group">
      <label for="petName" data-i18n-key="signup_pet_name">ペットのお名前</label>
      <input type="text" id="petName"
             placeholder="ぽち" data-i18n-placeholder="ph_pet_name" />
    </div>

    <div class="input-group">
      <label for="petAge" data-i18n-key="signup_pet_age">ペットの年齢</label>
      <select id="petAge">
        <option value="puppy" data-i18n-key="pet_age_puppy">子犬/子猫 (1歳未満)</option>
        <option value="adult" data-i18n-key="pet_age_adult">成犬/成猫 (1〜7歳)</option>
        <option value="senior" data-i18n-key="pet_age_senior">シニア犬/シニア猫 (7歳以上)</option>
      </select>
    </div>

    <div class="input-group">
      <label for="address" data-i18n-key="signup_address">住所</label>
      <input type="text" id="address"
             placeholder="東京都港区…" data-i18n-placeholder="ph_address" />
    </div>

    <div class="input-group">
      <label for="phone" data-i18n-key="signup_phone">電話番号</label>
      <input type="tel" id="phone"
             placeholder="09012345678" data-i18n-placeholder="ph_phone" />
    </div>

    <button type="submit" class="btn primary-btn" data-i18n-key="signup_submit">新規登録</button>
  </form>

  <div class="social-login">
    <button type="button" class="btn google-btn" data-i18n-key="signup_google">Googleで登録</button>
    <button type="button" class="btn line-btn" data-i18n-key="signup_line">LINEで登録</button>
  </div>

  <p>
    <span data-i18n-key="signup_already_have">すでにアカウントをお持ちの方は</span>
    <a href="<?php echo esc_url( home_url( '/' ) ); ?>" data-i18n-key="signup_login_link">こちらからログイン</a>
  </p>
</main>

<?php get_footer(); ?>
