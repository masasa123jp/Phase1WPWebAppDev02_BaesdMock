/*
  login.js – ログイン画面のイベントハンドラ

  ユーザーがログインフォームを送信した際に入力値を検証し、
  ローカルストレージへユーザー情報を保存してマップページへ遷移します。
  ソーシャルログインボタンは本番環境ではOAuthで処理しますが、
  このモックでは即座にログイン扱いとします。
*/

document.addEventListener('DOMContentLoaded', () => {
  /**
   * ローカルユーザー名・パスワードによるログイン
   * 登録済みユーザーの場合は照合し、未登録の場合は即席アカウントとして保存します。
   */
  const form = document.getElementById('login-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('login-email').value.trim();
      const password = document.getElementById('login-password').value.trim();
      if (!email || !password) {
        alert('メールアドレスとパスワードを入力してください');
        return;
      }
      // 登録済みユーザーの確認
      let registered;
      try {
        registered = JSON.parse(localStorage.getItem('registeredUser'));
      } catch (err) {
        registered = null;
      }
      // 登録済みユーザーが存在する場合はメールとパスワードを照合
      if (registered) {
        // メールとパスワードが一致する場合のみログイン
        if (registered.email === email && registered.password === password) {
          const user = { ...registered };
          // セッションストレージに保存して、ブラウザ終了時に破棄されるようにする
          sessionStorage.setItem('user', JSON.stringify(user));
          location.href = 'map.html';
        } else {
          alert('ユーザー情報が一致しません。メールアドレスまたはパスワードが誤っています。');
        }
      } else {
        // 未登録の場合はメールアドレスをユーザー名として仮登録
        const user = { email, name: email.split('@')[0] };
        sessionStorage.setItem('user', JSON.stringify(user));
        location.href = 'map.html';
      }
    });
  }

  /**
   * Meta タグから base64 エンコードされた値を取得してデコードするヘルパー
   * @param {string} name メタタグの name 属性
   */
  function decodeMeta(name) {
    try {
      const meta = document.querySelector('meta[name="' + name + '"]');
      if (meta && meta.getAttribute('content')) {
        const encoded = meta.getAttribute('content');
        try {
          return atob(encoded);
        } catch (err) {
          return encoded;
        }
      }
    } catch (e) {
      /* ignore */
    }
    return '';
  }

  /**
   * Google Identity Services を初期化し、ユーザーからのレスポンスを処理します。
   */
  const googleClientId = decodeMeta('google-oauth-client-id');
  // レスポンスコールバック：ID トークンをデコードしてユーザー情報を取得
  window.handleGoogleCredential = function (response) {
    try {
      const cred = response.credential;
      const parts = cred.split('.');
      if (parts.length === 3) {
        const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const json = JSON.parse(atob(payload));
        const user = {
          email: json.email || '',
          name: json.name || json.email || ''
        };
        sessionStorage.setItem('user', JSON.stringify(user));
        location.href = 'map.html';
      } else {
        alert('Google認証に失敗しました。');
      }
    } catch (err) {
      console.error(err);
      alert('Google認証に失敗しました。');
    }
  };
  // Google API がロードされるのを待って初期化
  function initGoogleLogin() {
    if (googleClientId && window.google && google.accounts && google.accounts.id) {
      google.accounts.id.initialize({
        client_id: googleClientId,
        callback: window.handleGoogleCredential
      });
      return true;
    }
    return false;
  }
  // LINE の初期化はクリック時に行うため、この段階では読み込まない
  const lineLiffId = decodeMeta('line-liff-id');

  /**
   * Google ボタンにイベントを登録
   */
  const googleBtn = document.querySelector('.google-btn');
  if (googleBtn) {
    googleBtn.addEventListener('click', () => {
      // Google Identity の初期化が済んでいなければリトライ
      if (!initGoogleLogin()) {
        // しばらく待って再試行
        let retries = 0;
        const maxRetries = 20;
        const interval = setInterval(() => {
          retries++;
          if (initGoogleLogin() || retries >= maxRetries) {
            clearInterval(interval);
            if (!initGoogleLogin()) {
              alert('Googleログインの初期化に失敗しました');
            } else {
              // 初期化後に prompt を呼び出して One Tap サインインを表示
              google.accounts.id.prompt();
            }
          }
        }, 300);
      } else {
        // 既に初期化されている場合は prompt を呼び出す
        try {
          google.accounts.id.prompt();
        } catch (e) {
          alert('Googleログインを開始できませんでした');
        }
      }
    });
  }

  /**
   * LINE ログインボタンのハンドラー
   */
  const lineBtn = document.querySelector('.line-btn');
  if (lineBtn) {
    lineBtn.addEventListener('click', () => {
      if (!lineLiffId) {
        alert('LINEログインが構成されていません');
        return;
      }
      // LIFF SDK が読み込まれているか確認
      if (window.liff) {
        // LIFF を初期化
        window.liff.init({ liffId: lineLiffId }).then(() => {
          // ログインしていなければログインを開始
          if (!window.liff.isLoggedIn()) {
            window.liff.login();
            return;
          }
          // ログイン済みの場合、ユーザープロフィールを取得
          window.liff.getProfile().then((profile) => {
            const user = {
              email: profile.userId + '@line',
              name: profile.displayName || profile.userId
            };
            sessionStorage.setItem('user', JSON.stringify(user));
            location.href = 'map.html';
          }).catch((err) => {
            console.error(err);
            alert('LINEプロフィールの取得に失敗しました');
          });
        }).catch((err) => {
          console.error(err);
          alert('LINEログインの初期化に失敗しました');
        });
      } else {
        alert('LINEログインSDKが読み込まれていません');
      }
    });
  }
});