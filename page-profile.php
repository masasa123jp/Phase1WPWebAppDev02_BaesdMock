<?php
/**
 * Template Name: Profile Page
 *
 * Provides a simple profile dashboard for the user including
 * statistics, basic contact details and pet information.  All data is
 * stored in local storage on the client side; the page is a direct
 * translation of profile.html from the original mockup.
 */

get_header();
?>

<header class="app-header">
    <img src="<?php echo esc_url( get_template_directory_uri() ); ?>/images/logo_roro.png" alt="ロゴ" class="small-logo" />
    <h2 data-i18n-key="profile_title">マイページ</h2>
    <button id="lang-toggle-btn" class="lang-toggle" title="Change language">
        <img src="<?php echo esc_url( get_template_directory_uri() ); ?>/images/switch-language.png" alt="Language" />
    </button>
</header>

<main class="profile-container" role="main">
    <div class="profile-card">
        <div class="avatar"></div>
        <h3 id="profile-name"></h3>
        <p id="profile-location"></p>
        <div class="stats">
            <div><strong id="fav-count">0</strong><span data-i18n-key="profile_stat_favorites">お気に入り</span></div>
            <div><strong id="followers">0</strong><span data-i18n-key="profile_stat_followers">フォロワー</span></div>
            <div><strong id="following">0</strong><span data-i18n-key="profile_stat_following">フォロー中</span></div>
        </div>
    </div>
    <form id="profile-form" autocomplete="off">
        <h4 data-i18n-key="profile_edit">プロフィール編集</h4>
        <!-- 名前とふりがなは初期登録時のみ入力され、編集不可にします -->
        <div class="input-group">
            <label for="profile-name-input" data-i18n-key="label_name">お名前</label>
            <input type="text" id="profile-name-input" disabled />
        </div>
        <div class="input-group">
            <label for="profile-furigana-input" data-i18n-key="label_furigana">ふりがな</label>
            <!-- 入力不可だが value は表示される（JSで代入） -->
            <input type="text" id="profile-furigana-input" disabled />
        </div>
        <div class="input-group">
            <label for="profile-email" data-i18n-key="label_email">メールアドレス</label>
            <input type="email" id="profile-email" />
        </div>
        <div class="input-group">
            <label for="profile-phone" data-i18n-key="label_phone">電話番号</label>
            <input type="tel" id="profile-phone" />
        </div>
        <div class="input-group">
            <label for="profile-address" data-i18n-key="label_address">住所</label>
            <input type="text" id="profile-address" />
        </div>

        <!-- 言語選択フォーム -->
        <div class="input-group">
            <label for="profile-language" data-i18n-key="label_language">言語</label>
            <select id="profile-language">
                <option value="ja">日本語</option>
                <option value="en">English</option>
                <option value="zh">中文</option>
                <option value="ko">한국어</option>
            </select>
        </div>
        <h4 data-i18n-key="pet_info">ペット情報</h4>
        <!-- ペット情報を動的に挿入するコンテナ -->
        <div id="pets-container"></div>
        <button type="button" id="add-pet-btn" class="btn secondary-btn" style="margin-bottom: 1rem;" data-i18n-key="add_pet">ペットを追加</button>
        <button type="submit" class="btn primary-btn" data-i18n-key="save">保存</button>
    </form>
    <!-- ログアウトボタン -->
    <button id="logout-btn" class="btn danger-btn" style="margin-top: 1rem;" data-i18n-key="logout">ログアウト</button>
</main>

<?php
// NOTE（機構は変更しません）:
// - 本ページはストレージの既存データを「読むだけ」。生成や上書きは行わない（生成は main.js が担当）。
// - ふりがなは保存時のキー名が異なる可能性があるため（furigana / kana / phonetic / yomi / ruby）、順にフォールバック。
// - 表示抜け対策として、DOMContentLoaded に加え pageshow（bfcache 復帰）でも再反映する。
//   pageshow は bfcache 復帰でも発火します（MDN / web.dev を参照）。 
//   MDN: https://developer.mozilla.org/en-US/docs/Web/API/Window/pageshow_event
//   web.dev: https://web.dev/articles/bfcache
?>
<script>
(function () {
  'use strict';

  const asText = (v) => (typeof v === 'string' ? v.trim() : '');

  const parseOrNull = (storage, key) => {
    try { return JSON.parse(storage.getItem(key) || 'null'); }
    catch (_) { return null; }
  };

  // フィールド単位で: session → local(user) → local(registeredUser) の順にキー候補を探索
  const makeFieldGetter = () => {
    const sUser = parseOrNull(sessionStorage, 'user');         // タブセッション優先
    const lUser = parseOrNull(localStorage,  'user');          // 互換
    const lReg  = parseOrNull(localStorage,  'registeredUser'); // 初期登録時
    const pools = [sUser, lUser, lReg];

    return (keys) => {
      for (const pool of pools) {
        if (!pool || typeof pool !== 'object') continue;
        for (const k of keys) {
          const val = asText(pool[k]);
          if (val) return val;
        }
      }
      return '';
    };
  };

  const setVal = (id, val) => {
    const el = document.getElementById(id);
    const text = asText(val);
    if (el && text) el.value = text; // disabledでもvalueは表示される（編集不可・送信対象外）
  };

  const init = () => {
    const get = makeFieldGetter();

    // 基本プロフィール
    setVal('profile-name-input', get(['name']));

    // ふりがな: 別名 → 最後は name を表示（値が無いままにしない）
    const furi = get(['furigana', 'kana', 'phonetic', 'yomi', 'ruby']) || get(['name']);
    setVal('profile-furigana-input', furi);

    // 連絡先
    setVal('profile-email',   get(['email']));
    setVal('profile-phone',   get(['phone']));
    setVal('profile-address', get(['address']));

    // カード側テキスト
    const nameEl = document.getElementById('profile-name');
    const locEl  = document.getElementById('profile-location');
    const name   = get(['name']);
    const addr   = get(['address']);
    if (nameEl && name) nameEl.textContent = name;
    if (locEl  && addr) locEl.textContent  = addr;
  };

  document.addEventListener('DOMContentLoaded', init);
  window.addEventListener('pageshow', init); // bfcache復帰対策
})();
</script>

<?php get_footer(); ?>
