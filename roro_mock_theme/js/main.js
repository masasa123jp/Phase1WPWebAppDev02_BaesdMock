/*
  main.js – 共通JavaScript処理

  すべてのページで共有される関数や初期化ロジックを集約したスクリプトです。
  ・現在のページに対応するボトムナビゲーションのハイライト
  ・ログイン状態のチェックと必要に応じたリダイレクト
*/

// ページ読み込み時の共通処理
document.addEventListener('DOMContentLoaded', () => {
  highlightNavigation();
  // デフォルトの登録ユーザーが存在しない場合は初期登録ユーザーを作成
  try {
    const registered = localStorage.getItem('registeredUser');
    if (!registered) {
      const defaultUser = {
        name: 'testユーザー',
        email: 'test@test.com',
        password: 'testtest!!test12345@',
        petType: 'dog',
        petAge: 'adult',
        // デフォルト住所を東京都豊島区池袋4丁目に設定
        address: '東京都豊島区池袋4丁目',
        phone: ''
      };
      localStorage.setItem('registeredUser', JSON.stringify(defaultUser));
    }
    // 登録済みユーザーが存在しても住所が未定義の場合は設定
    if (registered) {
      try {
        const regObj = JSON.parse(registered);
        if (!regObj.address || regObj.address.trim() === '') {
          regObj.address = '東京都豊島区池袋4丁目';
          localStorage.setItem('registeredUser', JSON.stringify(regObj));
        }
      } catch (err) {
        /* ignore */
      }
    }
  } catch (e) {
    // localStorage が利用できない場合は何もしない
  }
  // 古い実装で localStorage に保存されていたセッション用 user を削除
  try {
    localStorage.removeItem('user');
  } catch (e) {
    /* ignore */
  }
  // 現在のページ名を取得
  const currentFile = location.pathname.split('/').pop();
  // indexまたはsignupページ以外ではログイン必須
  const unrestrictedPages = ['index.html', 'signup.html', ''];
  if (!unrestrictedPages.includes(currentFile)) {
    requireLogin();
  }
  // すでにログイン済みで index や signup ページを開いた場合はマップへリダイレクト
  if (isLoggedIn()) {
    if (currentFile === 'index.html' || currentFile === '' || currentFile === '/') {
      location.href = 'map.html';
    }
    if (currentFile === 'signup.html') {
      location.href = 'map.html';
    }
  }

  // ヘッダーのロゴクリック時の遷移処理
  // small-logo クラスを持つロゴ画像がクリックされたら、
  // セッションが存在する場合は map.html へ、そうでなければ index.html へ遷移する。
  const logoEl = document.querySelector('.small-logo');
  if (logoEl) {
    logoEl.style.cursor = 'pointer';
    logoEl.addEventListener('click', () => {
      if (isLoggedIn()) {
        location.href = 'map.html';
      } else {
        location.href = 'index.html';
      }
    });
  }
});

/**
 * 現在のURLに基づいてボトムナビのアクティブ状態を設定する。
 */
function highlightNavigation() {
  const navLinks = document.querySelectorAll('.bottom-nav .nav-item');
  if (!navLinks) return;
  const currentPage = location.pathname.split('/').pop();
  navLinks.forEach((link) => {
    const href = link.getAttribute('href');
    if (href === currentPage) {
      link.classList.add('active');
    } else {
      link.classList.remove('active');
    }
  });
}

/**
 * ログイン状態を判定する。ユーザーオブジェクトがlocalStorageに存在すればtrue。
 * @returns {boolean}
 */
function isLoggedIn() {
  // セッションストレージにユーザー情報があればログイン状態とみなす。
  return !!sessionStorage.getItem('user');
}

/**
 * ログインが必要なページでログインしていなければログイン画面にリダイレクトする。
 */
function requireLogin() {
  if (!isLoggedIn()) {
    // ログインしていない場合はトップページにリダイレクト
    location.href = 'index.html';
  }
}