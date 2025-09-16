/*
  map.js – 地図アプリ（修正版）

  目的:
    - 中国語(zh)切替後に地図UIが二重生成される不具合の解消
  対応:
    1) window.initMap に一度きり実行フラグ（__roroMapInited）
    2) createCategoryButtons() の冪等化（既存ボタンをクリア）
    3) リセットボタンの多重バインド防止

  備考:
    - eventsData は /data/events.js が定義（存在しない場合はダミー200件を追加）
*/

// ===== グローバル状態 =====
let map;
let infoWindow;
let markersList = [];                 // 生成済みマーカー
const selectedCategories = new Set(); // 選択中カテゴリ（空は全表示）

// 中心（池袋小学校付近）と「既定半径」
const DEFAULT_CENTER   = { lat: 35.7379528, lng: 139.7098528 };
const DEFAULT_RADIUS_M = 5000; // 既存実装に合わせ 5km（表記ゆれ防止のため変更せず）

// デフォルト円の再利用用
let defaultCircleGoogle = null;
let defaultCircleHere   = null;

// ===== ユーティリティ =====
function shouldEnforceLogin() {
  const currentFile = (location.pathname.split('/').pop() || '').toLowerCase();
  return currentFile.includes('.html'); // 静的HTMLのみ強制
}

// ---------- Google: 既定ビュー適用 ----------
function applyDefaultViewGoogle(map) {
  if (typeof google === 'undefined' || !google.maps) return;

  // 既存円を除去
  if (defaultCircleGoogle) {
    try { defaultCircleGoogle.setMap(null); } catch(e) {}
    defaultCircleGoogle = null;
  }

  // 円を再作成
  defaultCircleGoogle = new google.maps.Circle({
    center: DEFAULT_CENTER,
    radius: DEFAULT_RADIUS_M,
    strokeColor: '#1F497D',
    strokeOpacity: 0.9,
    strokeWeight: 1,
    fillColor: '#FFC72C',
    fillOpacity: 0.15,
    clickable: false
  });
  defaultCircleGoogle.setMap(map);

  // フィット
  const bounds = defaultCircleGoogle.getBounds();
  if (bounds) {
    map.fitBounds(bounds);
    const maxZoom = 16;
    const once = google.maps.event.addListenerOnce(map, 'idle', () => {
      if (map.getZoom() > maxZoom) map.setZoom(maxZoom);
    });
    setTimeout(() => { try { google.maps.event.removeListener(once); } catch(_){} }, 2000);
  } else {
    map.setCenter(DEFAULT_CENTER);
    map.setZoom(15);
  }
}

// ---------- HERE: 既定ビュー適用 ----------
function applyDefaultViewHere(map, H) {
  if (defaultCircleHere) {
    try { map.removeObject(defaultCircleHere); } catch(_) {}
    defaultCircleHere = null;
  }
  defaultCircleHere = new H.map.Circle(
    { lat: DEFAULT_CENTER.lat, lng: DEFAULT_CENTER.lng },
    DEFAULT_RADIUS_M,
    { style: { lineColor: '#1F497D', lineWidth: 1, strokeColor: '#1F497D', fillColor: 'rgba(255,199,44,0.15)' } }
  );
  map.addObject(defaultCircleHere);

  const bounds = defaultCircleHere.getBoundingBox();
  if (bounds) {
    map.getViewModel().setLookAtData({ bounds });
    const maxZoom = 16;
    if (map.getZoom && map.getZoom() > maxZoom) map.setZoom(maxZoom);
  } else {
    map.setCenter(DEFAULT_CENTER);
    map.setZoom(15);
  }
}

// ---------- Google 初期化 ----------
function initGoogleMap() {
  if (typeof google === 'undefined' || !google.maps) {
    console.error('Google Maps API is not loaded.');
    return;
  }

  if (typeof requireLogin === 'function' && shouldEnforceLogin()) requireLogin();

  const styles = [
    { elementType: 'geometry', stylers: [{ color: '#F5F5F5' }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#F5F5F5' }] },
    { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#BDBDBD' }] },
    { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#eeeeee' }] },
    { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#e5f4e8' }] },
    { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#388e3c' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
    { featureType: 'road.arterial', elementType: 'labels.text.fill', stylers: [{ color: '#757575' }] },
    { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#dadada' }] },
    { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
    { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#f2f2f2' }] },
    { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#cddffb' }] },
    { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#9e9e9e' }] }
  ];

  map = new google.maps.Map(document.getElementById('map'), {
    center: DEFAULT_CENTER,
    zoom: 14,
    styles,
    mapTypeControl: false,
    fullscreenControl: false
  });

  infoWindow = new google.maps.InfoWindow();

  // イベントデータ（無ければダミーを追加）
  const localEvents = Array.isArray(window.eventsData) ? window.eventsData.slice() : [];
  localEvents.push(...generateDummyEvents(200));
  if (localEvents.length === 0) {
    console.warn('イベントデータが空です');
    return;
  }

  // マーカー生成
  const bounds = new google.maps.LatLngBounds();
  const markerPath = 'M0,0 C8,0 8,-12 0,-20 C-8,-12 -8,0 0,0 Z';

  function createMarkerIcon(color) {
    return { path: markerPath, fillColor: color, fillOpacity: 0.9, strokeColor: '#1F497D', strokeWeight: 1, scale: 1 };
  }

  localEvents.forEach((eventItem, index) => {
    const position = { lat: eventItem.lat, lng: eventItem.lon };

    // カテゴリを補完
    if (!eventItem.category) {
      if (index < (window.eventsData ? window.eventsData.length : 0)) {
        eventItem.category = 'event';
      } else {
        const catOptions = ['restaurant','hotel','activity','museum','facility'];
        eventItem.category = catOptions[Math.floor(Math.random() * catOptions.length)];
      }
    }

    const categoryColors = {
      event: '#FFC72C', restaurant: '#E74C3C', hotel: '#8E44AD',
      activity: '#3498DB', museum: '#27AE60', facility: '#95A5A6'
    };
    const iconColor = categoryColors[eventItem.category] || '#FFC72C';

    const marker = new google.maps.Marker({
      position, map, title: eventItem.name, icon: createMarkerIcon(iconColor)
    });

    bounds.extend(position);
    markersList.push({ marker, category: eventItem.category });

    marker.addListener('click', () => {
      const dateStr    = eventItem.date    && eventItem.date    !== 'nan' ? `<p>${eventItem.date}</p>`       : '';
      const addressStr = eventItem.address && eventItem.address !== 'nan' ? `<p>${eventItem.address}</p>`    : '';
      const lang = typeof getUserLang === 'function' ? getUserLang() : 'ja';
      const t    = (window.translations && window.translations[lang]) || {};
      const linkHtml = eventItem.url && eventItem.url !== 'nan' ? `<p><a href="${eventItem.url}" target="_blank" rel="noopener">${t.view_details || '詳細を見る'}</a></p>` : '';
      const saveLabel   = t.save || '保存';
      const saveFavorite= t.save_favorite || 'お気に入り';
      const saveWant    = t.save_want || '行ってみたい';
      const savePlan    = t.save_plan || '旅行プラン';
      const saveStar    = t.save_star || 'スター付き';

      const menuHtml = `
        <div class="save-menu" style="display:none;position:absolute;top:110%;left:0;background:#fff;border:1px solid #ccc;border-radius:6px;padding:0.4rem;box-shadow:0 2px 6px rgba(0,0,0,0.2);width:130px;font-size:0.8rem;">
          <div class="save-option" data-list="favorite"><span>❤️</span><span>${saveFavorite}</span></div>
          <div class="save-option" data-list="want"><span>🚩</span><span>${saveWant}</span></div>
          <div class="save-option" data-list="plan"><span>🧳</span><span>${savePlan}</span></div>
          <div class="save-option" data-list="star"><span>⭐</span><span>${saveStar}</span></div>
        </div>`;

      const content = `
        <div class="info-content" style="position:relative;">
          <h3 style="margin:0 0 0.2rem 0;">${eventItem.name}</h3>
          ${dateStr}${addressStr}${linkHtml}
          <div class="save-wrapper" style="position:relative;display:inline-block;margin-top:0.5rem;">
            <button class="save-btn" data-index="${index}" style="background:transparent;border:none;color:#1F497D;font-size:0.9rem;cursor:pointer;display:flex;align-items:center;gap:0.3rem;">
              <span class="save-icon">🔖</span><span>${saveLabel}</span>
            </button>
            ${menuHtml}
          </div>
        </div>`;

      infoWindow.setContent(content);
      infoWindow.open(map, marker);

      google.maps.event.addListenerOnce(infoWindow, 'domready', () => {
        const saveBtn  = document.querySelector('.save-btn');
        const saveMenu = document.querySelector('.save-menu');
        if (saveBtn && saveMenu) {
          saveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            saveMenu.style.display = saveMenu.style.display === 'none' ? 'block' : 'none';
          });
          saveMenu.querySelectorAll('.save-option').forEach(opt => {
            opt.addEventListener('click', () => {
              const listType = opt.getAttribute('data-list');
              addToFavorites(localEvents[index], listType);
              saveMenu.style.display = 'none';
            });
          });
        }
        if (typeof applyTranslations === 'function') applyTranslations();
      });
    });
  });

  // ユーザー住所による調整（任意）
  let userCenter = null, userZoom = 6;
  try {
    const user = JSON.parse(sessionStorage.getItem('user')) || {};
    if (user.address && (user.address.includes('池袋') || user.address.includes('豊島区'))) {
      userCenter = { lat: DEFAULT_CENTER.lat, lng: DEFAULT_CENTER.lng };
      userZoom   = 11;
    }
  } catch(_) {}

  if (userCenter) {
    map.setCenter(userCenter); map.setZoom(userZoom);
  } else {
    map.fitBounds(bounds);
  }

  // 既定ビュー（円とフィット）
  applyDefaultViewGoogle(map);

  // 「周辺表示」に多重バインド防止
  const resetBtn = document.getElementById('reset-view-btn');
  if (resetBtn && !resetBtn.dataset.bound) {
    resetBtn.addEventListener('click', () => applyDefaultViewGoogle(map));
    resetBtn.dataset.bound = '1';
  }

  // カテゴリバー初期化 & 表示更新
  createCategoryButtons();
  updateMarkerVisibility();
}

// ---------- カテゴリバー生成（冪等） ----------
function createCategoryButtons() {
  const bar = document.getElementById('category-bar');
  if (!bar) return;

  // ★冪等化：既存子要素をクリア
  if (typeof bar.replaceChildren === 'function') bar.replaceChildren();
  else while (bar.firstChild) bar.removeChild(bar.firstChild);

  const cats = [
    { key: 'event',      emoji: '🎪' },
    { key: 'restaurant', emoji: '🍴' },
    { key: 'hotel',      emoji: '🏨' },
    { key: 'activity',   emoji: '🎠' },
    { key: 'museum',     emoji: '🏛️' },
    { key: 'facility',   emoji: '🏢' }
  ];

  const lang = typeof getUserLang === 'function' ? getUserLang() : 'ja';
  const dict = (window.translations && window.translations[lang]) || {};

  cats.forEach((cat) => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.setAttribute('data-category', cat.key);

    const emojiSpan = document.createElement('span');
    emojiSpan.textContent = cat.emoji;

    const labelSpan = document.createElement('span');
    const i18nKey = 'cat_' + cat.key;
    labelSpan.setAttribute('data-i18n-key', i18nKey);
    labelSpan.textContent = dict[i18nKey] || cat.key;

    btn.appendChild(emojiSpan);
    btn.appendChild(labelSpan);

    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-category');
      if (btn.classList.contains('active')) {
        btn.classList.remove('active'); selectedCategories.delete(key);
      } else {
        btn.classList.add('active');     selectedCategories.add(key);
      }
      updateMarkerVisibility();
    });

    bar.appendChild(btn);
  });

  if (typeof applyTranslations === 'function') applyTranslations();
}

// ---------- 可視状態更新 ----------
function updateMarkerVisibility() {
  markersList.forEach((item) => {
    const visible = selectedCategories.size === 0 || selectedCategories.has(item.category);
    if (item.marker && typeof item.marker.setVisible === 'function') {
      item.marker.setVisible(visible);
    } else if (item.marker && typeof item.marker.setVisibility === 'function') {
      item.marker.setVisibility(visible);
    } else {
      try {
        if (visible) {
          if (typeof map.addObject === 'function') map.addObject(item.marker);
          else if (typeof item.marker.setMap === 'function') item.marker.setMap(map);
        } else {
          if (typeof map.removeObject === 'function') map.removeObject(item.marker);
          else if (typeof item.marker.setMap === 'function') item.marker.setMap(null);
        }
      } catch(_) {}
    }
  });
}

// ---------- 保存 ----------
function addToFavorites(eventItem, listType = 'favorite') {
  let favorites;
  try { favorites = JSON.parse(localStorage.getItem('favorites')) || []; }
  catch(_) { favorites = []; }

  const exists = favorites.some((f) =>
    f.name === eventItem.name && f.lat === eventItem.lat && f.lon === eventItem.lon && f.listType === listType
  );

  const lang = typeof getUserLang === 'function' ? getUserLang() : 'ja';
  const t    = (window.translations && window.translations[lang]) || {};

  if (!exists) {
    favorites.push({ ...eventItem, listType });
    localStorage.setItem('favorites', JSON.stringify(favorites));
    alert(t.saved_msg || 'リストに保存しました');
  } else {
    alert(t.already_saved_msg || '既にこのリストに登録済みです');
  }
}

// ---------- ダミーデータ ----------
function generateDummyEvents(count) {
  const results = [];
  const baseLat = DEFAULT_CENTER.lat;
  const baseLng = DEFAULT_CENTER.lng;

  const latLowerBound = 35.5, latUpperBound = 35.9;
  const lngLowerBound = 139.2, lngUpperBound = 139.9;

  function gaussianRandom() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random();
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  for (let i = 0; i < count; i++) {
    let lat = baseLat + gaussianRandom() * 0.05;
    let lng = baseLng + gaussianRandom() * 0.06;

    if (lat < latLowerBound) lat = latLowerBound + Math.random() * 0.05;
    if (lat > latUpperBound) lat = latUpperBound - Math.random() * 0.05;
    if (lng < lngLowerBound) lng = lngLowerBound + Math.random() * 0.05;
    if (lng > lngUpperBound) lng = lngUpperBound - Math.random() * 0.05;

    results.push({
      name: `ペット関連施設 ${i + 1}`,
      date: '',
      location: 'dummy',
      venue: 'dummy',
      address: '東京都近郊のペット施設',
      prefecture: '東京都',
      city: '',
      lat, lon: lng,
      source: 'Dummy',
      url: '#'
    });
  }
  return results;
}

// ---------- HERE 初期化（将来用。現状 zh でも Google を使用） ----------
function initHereMap() {
  if (typeof requireLogin === 'function' && shouldEnforceLogin()) requireLogin();
  // 実運用で HERE を使うときに実装を有効化
}

// ---------- Google API の callback エントリ（★一度きりガード） ----------
window.initMap = function () {
  if (window.__roroMapInited) return;
  window.__roroMapInited = true;

  try {
    const lang = typeof getUserLang === 'function' ? getUserLang() : 'ja';
    // 現行方針：言語に関係なく Google を使用（zh でも同じ）
    if (lang === 'here') initHereMap(); else initGoogleMap();
  } catch (e) {
    // 失敗時も Google を試す
    try { initGoogleMap(); } catch (_) {}
  }
};
