/*
  favorites.js – お気に入りページの表示ロジック

  マップや他の機能から追加されたイベントをローカルストレージから読み込み、
  一覧表示します。各アイテムには削除ボタンを付け、不要になったお気に入りを
  簡単に削除できるようにしています。
*/

document.addEventListener('DOMContentLoaded', () => {
  // ログインしていない場合はリダイレクト
  requireLogin();
  const listEl = document.getElementById('favorites-list');
  const noFavEl = document.getElementById('no-favorites');
  let favorites;
  try {
    favorites = JSON.parse(localStorage.getItem('favorites')) || [];
  } catch (e) {
    favorites = [];
  }
  if (!favorites || favorites.length === 0) {
    noFavEl.style.display = 'block';
    // ページ全体の翻訳を適用
    if (typeof applyTranslations === 'function') applyTranslations();
    return;
  }
  // お気に入りをDOMにレンダリング
  favorites.forEach((ev, index) => {
    const li = document.createElement('li');
    li.className = 'favorite-item';
    const detailsDiv = document.createElement('div');
    detailsDiv.className = 'details';
    const title = document.createElement('a');
    title.textContent = ev.name;
    title.href = ev.url || '#';
    title.target = '_blank';
    title.rel = 'noopener';
    const date = document.createElement('p');
    date.textContent = ev.date || '';
    date.style.margin = '0.2rem 0';
    const address = document.createElement('p');
    address.textContent = ev.address || '';
    address.style.margin = '0';
    // 分類を表示するバッジ
    if (ev.listType) {
      const badge = document.createElement('span');
      badge.style.marginRight = '0.4rem';
      badge.style.fontSize = '0.9rem';
      // 翻訳辞書を用いてラベルを設定
      try {
        const lang = typeof getUserLang === 'function' ? getUserLang() : 'ja';
        const t = (window.translations && window.translations[lang]) || {};
        const key = 'list_' + ev.listType;
        const baseLabel = t[key] || '';
        if (baseLabel) {
          // アイコンを選択
          let icon = '';
          switch (ev.listType) {
            case 'favorite': icon = '❤️'; break;
            case 'want': icon = '🚩'; break;
            case 'plan': icon = '🧳'; break;
            case 'star': icon = '⭐'; break;
            default: icon = '';
          }
          badge.textContent = `${icon} ${baseLabel}`;
        }
      } catch (e) {
        // フォールバック: 日本語で表示
        switch (ev.listType) {
          case 'favorite': badge.textContent = '❤️ お気に入り'; break;
          case 'want': badge.textContent = '🚩 行ってみたい'; break;
          case 'plan': badge.textContent = '🧳 旅行プラン'; break;
          case 'star': badge.textContent = '⭐ スター付き'; break;
          default: badge.textContent = '';
        }
      }
      if (badge.textContent) detailsDiv.appendChild(badge);
    }
    detailsDiv.appendChild(title);
    if (ev.date) detailsDiv.appendChild(date);
    if (ev.address) detailsDiv.appendChild(address);
    const removeBtn = document.createElement('button');
    removeBtn.className = 'remove-btn';
    // 翻訳された削除ラベルを設定
    try {
      const lang = typeof getUserLang === 'function' ? getUserLang() : 'ja';
      removeBtn.textContent = (translations && translations[lang] && translations[lang].delete) || '削除';
    } catch (err) {
      removeBtn.textContent = '削除';
    }
    removeBtn.addEventListener('click', () => {
      removeFavorite(index);
    });
    li.appendChild(detailsDiv);
    li.appendChild(removeBtn);
    listEl.appendChild(li);
  });
});

/**
 * お気に入りを指定インデックスで削除し、DOMを更新する。
 * @param {number} index
 */
function removeFavorite(index) {
  let favorites;
  try {
    favorites = JSON.parse(localStorage.getItem('favorites')) || [];
  } catch (e) {
    favorites = [];
  }
  favorites.splice(index, 1);
  localStorage.setItem('favorites', JSON.stringify(favorites));
  // 再読み込みしてリストを更新
  location.reload();
}