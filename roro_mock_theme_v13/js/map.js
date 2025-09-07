/*
  map.js – イベントマップ描画

  CSVから生成したJSONファイルを読み込み、Google Maps上にマーカーを表示します。
  各マーカーにはイベント情報を表示するInfoWindowを紐付け、お気に入り登録
  ボタンでローカルストレージへの保存が行えます。
*/

// グローバル変数
let map;
let infoWindow;
// 全マーカーリストとカテゴリ状態
let markersList = [];
// 選択されたカテゴリを管理する集合。空の場合はすべて表示
const selectedCategories = new Set();
// eventsData は data/events.js で定義されるグローバル変数を参照
// eventsData 変数は data/events.js でグローバルに提供されます。

/**
 * Google Maps の初期化関数。API読み込み時にコールバックされます。
 * 日本語・英語・韓国語のモードでは Google Maps を使用します。
 */
function initGoogleMap() {
  // Google Maps ライブラリが読み込まれているかチェック
  // ネットワークの問題や API キーの未設定により google オブジェクトが存在しない場合、
  // ここで処理を中断してエラーメッセージを出力します。
  if (typeof google === 'undefined' || !google.maps) {
    console.error('Google Maps API is not loaded or google is undefined.');
    return;
  }
  // ログイン状態を確認
  requireLogin();
  // デフォルトの中心（東京駅周辺）
  const defaultCenter = { lat: 35.681236, lng: 139.767125 };
  // マップスタイル：ブランドカラーに合わせて淡い配色に
  const styles = [
    { elementType: 'geometry', stylers: [{ color: '#F5F5F5' }] },
    { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#616161' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#F5F5F5' }] },
    {
      featureType: 'administrative.land_parcel',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#BDBDBD' }]
    },
    {
      featureType: 'poi',
      elementType: 'geometry',
      stylers: [{ color: '#eeeeee' }]
    },
    {
      featureType: 'poi',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#757575' }]
    },
    {
      featureType: 'poi.park',
      elementType: 'geometry',
      stylers: [{ color: '#e5f4e8' }]
    },
    {
      featureType: 'poi.park',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#388e3c' }]
    },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#ffffff' }]
    },
    {
      featureType: 'road.arterial',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#757575' }]
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry',
      stylers: [{ color: '#dadada' }]
    },
    {
      featureType: 'road.highway',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#616161' }]
    },
    {
      featureType: 'transit',
      elementType: 'geometry',
      stylers: [{ color: '#f2f2f2' }]
    },
    {
      featureType: 'transit.station',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#9e9e9e' }]
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#cddffb' }]
    },
    {
      featureType: 'water',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#9e9e9e' }]
    }
  ];
  // マップオプション
  map = new google.maps.Map(document.getElementById('map'), {
    center: defaultCenter,
    zoom: 6,
    styles: styles,
    mapTypeControl: false,
    fullscreenControl: false
  });
  infoWindow = new google.maps.InfoWindow();
  // data/events.js にて定義された eventsData を利用してマーカーを生成
  const localEvents = Array.isArray(window.eventsData) ? window.eventsData.slice() : [];
    // 池袋4丁目付近にダミーの施設を生成し、マーカーとして表示するために配列に追加
    // 200 件のダミー施設を生成する。generateDummyEvents では正規分布に近い乱数を利用
    // し、都心に近いほど密度が高くなるよう調整しています。
    const dummyEvents = generateDummyEvents(200);
  // const 配列は再代入できないが、内容の push は可能
  localEvents.push(...dummyEvents);
  if (localEvents.length === 0) {
    console.warn('イベントデータが空です');
    return;
  }
  const bounds = new google.maps.LatLngBounds();
  // カスタムマーカーの設定：雫型のシンボルを使用してブランドカラーに
  // 雫型パス（上部が丸く、下に尖るデザイン）
  const markerPath = 'M0,0 C8,0 8,-12 0,-20 C-8,-12 -8,0 0,0 Z';
  const markerSymbol = {
    path: markerPath,
    fillColor: '#FFC72C',
    fillOpacity: 0.9,
    strokeColor: '#1F497D',
    strokeWeight: 1,
    scale: 1
  };

  /*
   * カスタムアイコンを生成するためのヘルパー関数。
   * 現在は従来の Marker の icon オプションで利用するため、SVG パスと色を指定します。
   * @param {string} color 塗りつぶし色
   * @returns {Object} google.maps.Symbol 互換のオブジェクト
   */
  function createMarkerIcon(color) {
    return {
      path: markerPath,
      fillColor: color,
      fillOpacity: 0.9,
      strokeColor: '#1F497D',
      strokeWeight: 1,
      scale: 1
    };
  }
    // グローバル変数 "event" との競合を避けるため、コールバックの引数名を
  // eventItem とする。ブラウザによっては window.event が const として
  // 定義されており、再代入しようとすると "Assignment to constant variable"
  // エラーが発生する可能性があるためである。
    localEvents.forEach((eventItem, index) => {
    const position = { lat: eventItem.lat, lng: eventItem.lon };
        // カテゴリを割り当て。既存のイベントには 'event' を設定し、ダミーにはランダムカテゴリを設定
        if (!eventItem.category) {
          if (index < (window.eventsData ? window.eventsData.length : 0)) {
            eventItem.category = 'event';
          } else {
            // ランダムにカテゴリを選択（eventを除外）。
            // 交通機関・薬局・ATM カテゴリは仕様により除外しました。
            const catOptions = ['restaurant','hotel','activity','museum','facility'];
            eventItem.category = catOptions[Math.floor(Math.random() * catOptions.length)];
          }
        }
    // カテゴリ別アイコン色を決定
    const categoryColors = {
      event: '#FFC72C',
      restaurant: '#E74C3C',
      hotel: '#8E44AD',
      activity: '#3498DB',
      museum: '#27AE60',
      // 削除対象カテゴリ（transport, pharmacy, atm）は定義しません
      facility: '#95A5A6'
    };
    const iconColor = categoryColors[eventItem.category] || '#FFC72C';
    // 従来の google.maps.Marker を使用してマーカーを作成します。
    // AdvancedMarkerElement は mapId が必要で setVisible メソッドが無いなど、
    // 本アプリケーションでは適切に動作しないため使用しません。
    const marker = new google.maps.Marker({
      position: position,
      map: map,
      title: eventItem.name,
      icon: createMarkerIcon(iconColor)
    });
    bounds.extend(position);
    // markersList に格納
    markersList.push({ marker, category: eventItem.category });
    // click イベントを登録
    marker.addListener('click', (...args) => {
      // InfoWindowの内容を動的に生成
      const dateStr = eventItem.date && eventItem.date !== 'nan' ? `<p>${eventItem.date}</p>` : '';
      const addressStr = eventItem.address && eventItem.address !== 'nan' ? `<p>${eventItem.address}</p>` : '';
      const linkStr = eventItem.url && eventItem.url !== 'nan' ? `<p><a href="${eventItem.url}" target="_blank" rel="noopener">詳細を見る</a></p>` : '';
      // 保存ボタンとメニュー
      const menuHtml = `
        <div class="save-menu" style="display:none;position:absolute;top:110%;left:0;background:#fff;border:1px solid #ccc;border-radius:6px;padding:0.4rem;box-shadow:0 2px 6px rgba(0,0,0,0.2);width:130px;font-size:0.8rem;">
          <div class="save-option" data-list="favorite" style="cursor:pointer;padding:0.2rem 0.4rem;display:flex;align-items:center;gap:0.3rem;"><span>❤️</span><span>お気に入り</span></div>
          <div class="save-option" data-list="want" style="cursor:pointer;padding:0.2rem 0.4rem;display:flex;align-items:center;gap:0.3rem;"><span>🚩</span><span>行ってみたい</span></div>
          <div class="save-option" data-list="plan" style="cursor:pointer;padding:0.2rem 0.4rem;display:flex;align-items:center;gap:0.3rem;"><span>🧳</span><span>旅行プラン</span></div>
          <div class="save-option" data-list="star" style="cursor:pointer;padding:0.2rem 0.4rem;display:flex;align-items:center;gap:0.3rem;"><span>⭐</span><span>スター付き</span></div>
        </div>`;
      // 翻訳辞書から各テキストを取得
      const lang = typeof getUserLang === 'function' ? getUserLang() : 'ja';
      const t = (window.translations && window.translations[lang]) || {};
      const saveLabel = t.save || '保存';
      const viewDetailsLabel = t.view_details || '詳細を見る';
      const saveFavorite = t.save_favorite || 'お気に入り';
      const saveWant = t.save_want || '行ってみたい';
      const savePlan = t.save_plan || '旅行プラン';
      const saveStar = t.save_star || 'スター付き';
      const menuHtmlTrans = `
        <div class="save-menu" style="display:none;position:absolute;top:110%;left:0;background:#fff;border:1px solid #ccc;border-radius:6px;padding:0.4rem;box-shadow:0 2px 6px rgba(0,0,0,0.2);width:130px;font-size:0.8rem;">
          <div class="save-option" data-list="favorite" style="cursor:pointer;padding:0.2rem 0.4rem;display:flex;align-items:center;gap:0.3rem;"><span>❤️</span><span>${saveFavorite}</span></div>
          <div class="save-option" data-list="want" style="cursor:pointer;padding:0.2rem 0.4rem;display:flex;align-items:center;gap:0.3rem;"><span>🚩</span><span>${saveWant}</span></div>
          <div class="save-option" data-list="plan" style="cursor:pointer;padding:0.2rem 0.4rem;display:flex;align-items:center;gap:0.3rem;"><span>🧳</span><span>${savePlan}</span></div>
          <div class="save-option" data-list="star" style="cursor:pointer;padding:0.2rem 0.4rem;display:flex;align-items:center;gap:0.3rem;"><span>⭐</span><span>${saveStar}</span></div>
        </div>`;
      const linkHtml = linkStr ? `<p><a href="${eventItem.url}" target="_blank" rel="noopener">${viewDetailsLabel}</a></p>` : '';
      const content = `
        <div class="info-content" style="position:relative;">
          <h3 style="margin:0 0 0.2rem 0;">${eventItem.name}</h3>
          ${dateStr}
          ${addressStr}
          ${linkHtml}
          <div class="save-wrapper" style="position:relative;display:inline-block;margin-top:0.5rem;">
            <button class="save-btn" data-index="${index}" style="background-color:transparent;border:none;color:#1F497D;font-size:0.9rem;cursor:pointer;display:flex;align-items:center;gap:0.3rem;">
              <span class="save-icon">🔖</span><span>${saveLabel}</span>
            </button>
            ${menuHtmlTrans}
          </div>
        </div>`;
      infoWindow.setContent(content);
      // InfoWindow を表示
      // 従来の google.maps.Marker を使用しているため、第二引数にマーカーを渡す形式を使用します。
      infoWindow.open(map, marker);
      // InfoWindow内のボタンにイベントを付与するため、DOMReadyで監視
      google.maps.event.addListenerOnce(infoWindow, 'domready', () => {
        // 保存ボタンとメニューの操作
        const saveBtn = document.querySelector('.save-btn');
        const saveMenu = document.querySelector('.save-menu');
        if (saveBtn && saveMenu) {
          saveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            // メニュー表示をトグル
            saveMenu.style.display = saveMenu.style.display === 'none' ? 'block' : 'none';
          });
          saveMenu.querySelectorAll('.save-option').forEach(opt => {
            opt.addEventListener('click', (ev) => {
              const listType = opt.getAttribute('data-list');
              addToFavorites(localEvents[index], listType);
              saveMenu.style.display = 'none';
            });
          });
        }
        // 吹き出し内に動的に挿入した要素にも翻訳を適用する
        if (typeof applyTranslations === 'function') applyTranslations();
      });
    });
  });
  // ユーザー住所によって中心とズームを調整
  let userCenter = null;
  let userZoom = 6;
  try {
    const user = JSON.parse(sessionStorage.getItem('user')) || {};
    if (user.address) {
      // 東京都豊島区池袋4丁目付近の住所を検出。"池袋" または "豊島区" を含むかで判定する。
      if (user.address.includes('池袋') || user.address.includes('豊島区')) {
        // 池袋4丁目付近の概算座標
        userCenter = { lat: 35.7303, lng: 139.7099 };
        userZoom = 11; // 約20kmの範囲を表示
      }
    }
  } catch (e) {
    /* ignore */
  }
  if (userCenter) {
    map.setCenter(userCenter);
    map.setZoom(userZoom);
  } else {
    // ユーザーの住所が無い場合、全マーカーが見えるように調整
    map.fitBounds(bounds);
  }

  // 周辺表示ボタンに機能を追加
  const resetBtn = document.getElementById('reset-view-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      // ユーザー住所に基づいて中心とズームを設定する
      let center = null;
      let zoomLevel = 11;
      try {
        const u = JSON.parse(sessionStorage.getItem('user')) || {};
        if (u.address && (u.address.includes('池袋') || u.address.includes('豊島区'))) {
          center = { lat: 35.7303, lng: 139.7099 };
          zoomLevel = 11;
        }
      } catch (err) {
        /* ignore */
      }
      if (center) {
        map.setCenter(center);
        map.setZoom(zoomLevel);
      } else {
        map.setCenter(defaultCenter);
        map.setZoom(6);
      }
    });
  }

  // カテゴリフィルタバーを初期化
  createCategoryButtons();
  // 初期表示は全てのマーカーを表示
  updateMarkerVisibility();
}

/**
 * カテゴリフィルタバーを生成し、ボタンにクリックイベントを設定します。
 */
function createCategoryButtons() {
  const bar = document.getElementById('category-bar');
  if (!bar) return;
  // 定義したカテゴリリスト
  // 対応カテゴリの一覧。表示文字列は翻訳辞書から取得します。
  const cats = [
    { key: 'event', emoji: '🎪' },
    { key: 'restaurant', emoji: '🍴' },
    { key: 'hotel', emoji: '🏨' },
    { key: 'activity', emoji: '🎠' },
    { key: 'museum', emoji: '🏛️' },
    { key: 'facility', emoji: '🏢' }
  ];
  cats.forEach((cat) => {
    const btn = document.createElement('button');
    btn.className = 'filter-btn';
    btn.setAttribute('data-category', cat.key);
    const emojiSpan = document.createElement('span');
    emojiSpan.textContent = cat.emoji;
    const labelSpan = document.createElement('span');
    // 翻訳キーを設定して applyTranslations で更新できるようにする
    const i18nKey = 'cat_' + cat.key;
    labelSpan.setAttribute('data-i18n-key', i18nKey);
    // 初期表示を設定（ユーザー言語に合わせる）
    try {
      const lang = typeof getUserLang === 'function' ? getUserLang() : 'ja';
      labelSpan.textContent = (window.translations && window.translations[lang] && window.translations[lang][i18nKey]) || cat.key;
    } catch (e) {
      labelSpan.textContent = cat.key;
    }
    btn.appendChild(emojiSpan);
    btn.appendChild(labelSpan);
    btn.addEventListener('click', () => {
      const key = btn.getAttribute('data-category');
      if (btn.classList.contains('active')) {
        btn.classList.remove('active');
        selectedCategories.delete(key);
      } else {
        btn.classList.add('active');
        selectedCategories.add(key);
      }
      updateMarkerVisibility();
    });
    bar.appendChild(btn);
  });
  // 初期化後に翻訳を適用してボタンラベルを更新
  if (typeof applyTranslations === 'function') applyTranslations();
}

/**
 * 選択されたカテゴリに基づいてマーカーの表示・非表示を更新します。
 */
function updateMarkerVisibility() {
  // selectedCategories が空の場合は全て表示
  markersList.forEach((item) => {
    // true の場合は表示、false の場合は非表示
    const visible = selectedCategories.size === 0 || selectedCategories.has(item.category);
    // Google Maps Marker には setVisible、HERE Marker には setVisibility が存在します
    if (item.marker && typeof item.marker.setVisible === 'function') {
      item.marker.setVisible(visible);
    } else if (item.marker && typeof item.marker.setVisibility === 'function') {
      item.marker.setVisibility(visible);
    } else {
      // それ以外の場合は単純にマップへの追加・削除で対応
      try {
        if (visible) {
          if (typeof map.addObject === 'function') {
            map.addObject(item.marker);
          } else if (typeof item.marker.setMap === 'function') {
            item.marker.setMap(map);
          }
        } else {
          if (typeof map.removeObject === 'function') {
            map.removeObject(item.marker);
          } else if (typeof item.marker.setMap === 'function') {
            item.marker.setMap(null);
          }
        }
      } catch (e) {
        /* ignore */
      }
    }
  });
}

/**
 * 指定されたイベントをお気に入りに追加する。
 * @param {Object} event イベントオブジェクト
 */
function addToFavorites(eventItem, listType = 'favorite') {
  let favorites;
  try {
    favorites = JSON.parse(localStorage.getItem('favorites')) || [];
  } catch (e) {
    favorites = [];
  }
  // 重複チェック（名称と座標で判定）
  const exists = favorites.some((f) => f.name === eventItem.name && f.lat === eventItem.lat && f.lon === eventItem.lon && f.listType === listType);
  if (!exists) {
    const itemToSave = { ...eventItem, listType };
    favorites.push(itemToSave);
    localStorage.setItem('favorites', JSON.stringify(favorites));
    // 翻訳されたメッセージを表示
    try {
      const lang = typeof getUserLang === 'function' ? getUserLang() : 'ja';
      const t = (window.translations && window.translations[lang]) || {};
      alert(t.saved_msg || 'リストに保存しました');
    } catch (e) {
      alert('リストに保存しました');
    }
  } else {
    try {
      const lang2 = typeof getUserLang === 'function' ? getUserLang() : 'ja';
      const t2 = (window.translations && window.translations[lang2]) || {};
      alert(t2.already_saved_msg || '既にこのリストに登録済みです');
    } catch (e) {
      alert('既にこのリストに登録済みです');
    }
  }
}

/**
 * 池袋4丁目付近を中心にランダムなダミーイベントを生成します。
 * @param {number} count 生成するイベント数
 * @returns {Array<Object>} ダミーイベントの配列
 */
function generateDummyEvents(count) {
  const results = [];
  // 基準点：東京都豊島区池袋4丁目付近の概算座標
  const baseLat = 35.7303;
  const baseLng = 139.7099;
  // 国道16号線内の緯度経度境界（東京周辺）
  const latLowerBound = 35.5;
  const latUpperBound = 35.9;
  const lngLowerBound = 139.2;
  const lngUpperBound = 139.9;
  // 正規分布に近い乱数を生成する関数（ボックス＝ミュラー法）
  function gaussianRandom() {
    let u = 0, v = 0;
    while (u === 0) u = Math.random(); // 0 にならないように
    while (v === 0) v = Math.random();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }
  for (let i = 0; i < count; i++) {
    // ガウシアン分布を用いて中心から緩やかに散布
    let lat = baseLat + gaussianRandom() * 0.05; // 約5km程度の分散
    let lng = baseLng + gaussianRandom() * 0.06; // 経度方向の分散をやや広げる
    // 国道16号線内に収まるよう境界チェックを行い、外れた場合は境界内にクランプする
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
      lat: lat,
      lon: lng,
      source: 'Dummy',
      url: '#'
    });
  }
  return results;
}

/**
 * 多言語に対応したマップ初期化ラッパー。
 * userLang が 'zh' の場合は HERE Maps、それ以外は Google Maps を初期化します。
 * この関数は map.html の API スクリプトにおける callback として登録されます。
 */
function initMap() {
  // 多言語に対応してマップを初期化します。ここではユーザーの言語に応じて
  // 使用するマップライブラリを切り替えます。ここで try/catch を使うのは、
  // 外部ライブラリが読み込めない場合にフォールバック処理を行うためです。
  try {
    const lang = typeof getUserLang === 'function' ? getUserLang() : 'ja';
    // 中国語モードでも Google Maps を使用します。HERE Maps は利用しません。
    if (lang === 'zh') {
      if (typeof initGoogleMap === 'function') {
        initGoogleMap();
      }
    } else if (typeof initHereMap === 'function' && lang === 'here') {
      // 現在は使用していませんが、将来的に別の条件で HERE を使いたい場合に備えて残してあります
      initHereMap();
    } else if (typeof initGoogleMap === 'function') {
      initGoogleMap();
    }
  } catch (e) {
    // 例外が発生した場合は、言語設定に応じて適切な初期化関数を呼び出します。
    const fallbackLang = typeof getUserLang === 'function' ? getUserLang() : 'ja';
    // フォールバック時も中国語は Google Maps を利用
    if (fallbackLang === 'zh') {
      if (typeof initGoogleMap === 'function') {
        initGoogleMap();
      }
    } else if (typeof initHereMap === 'function' && fallbackLang === 'here') {
      initHereMap();
    } else if (typeof initGoogleMap === 'function') {
      initGoogleMap();
    }
  }
}

// グローバルに公開
window.initMap = initMap;

/**
 * HERE Maps の初期化関数。
 * 中国語モードで呼び出され、HERE Maps API を用いてマップを描画します。
 */
function initHereMap() {
  // ログイン状態を確認
  if (typeof requireLogin === 'function') requireLogin();
  // デフォルト中心（東京駅周辺）
  const defaultCenter = { lat: 35.681236, lng: 139.767125 };
  // イベントデータの取得
  const localEvents = Array.isArray(window.eventsData) ? window.eventsData.slice() : [];
  const dummyEvents = generateDummyEvents(200);
  localEvents.push(...dummyEvents);
  if (localEvents.length === 0) {
    console.warn('イベントデータが空です');
    return;
  }
  // HERE Platform の初期化
  // meta タグから base64 エンコードされた HERE API キーを取得してデコード
  let apikey = '';
  try {
    const metaHere = document.querySelector('meta[name="here-api-key"]');
    if (metaHere && metaHere.getAttribute('content')) {
      const encoded = metaHere.getAttribute('content');
      try {
        apikey = atob(encoded);
      } catch (err) {
        apikey = encoded;
      }
    }
  } catch (e) {
    apikey = '';
  }
  const platform = new H.service.Platform({ apikey: apikey });
  const defaultLayers = platform.createDefaultLayers();
  // マップインスタンス生成
  map = new H.Map(document.getElementById('map'), defaultLayers.vector.normal.map, {
    center: defaultCenter,
    zoom: 6,
    pixelRatio: window.devicePixelRatio || 1
  });
  // インタラクションを有効化
  const behavior = new H.mapevents.Behavior(new H.mapevents.MapEvents(map));
  // UI を生成
  const ui = H.ui.UI.createDefault(map, defaultLayers);
  // マーカーリスト初期化
  markersList = [];
  // カテゴリ別の色定義
  const categoryColors = {
    event: '#FFC72C',
    restaurant: '#E74C3C',
    hotel: '#8E44AD',
    activity: '#3498DB',
    museum: '#27AE60',
    facility: '#95A5A6'
  };
  // イベントを処理してマーカーを作成
  localEvents.forEach((eventItem, index) => {
    // カテゴリ付与
    if (!eventItem.category) {
      if (index < (window.eventsData ? window.eventsData.length : 0)) {
        eventItem.category = 'event';
      } else {
        const catOptions = ['restaurant','hotel','activity','museum','facility'];
        eventItem.category = catOptions[Math.floor(Math.random() * catOptions.length)];
      }
    }
    const iconColor = categoryColors[eventItem.category] || '#FFC72C';
    // SVG マーカーアイコン。HERE Maps では SVG 文字列をそのまま渡すと URL と解釈され
    // 不正なリクエストが発生するため、data URI としてエンコードして渡します。
    const svgMarkup = `<?xml version="1.0" encoding="UTF-8"?>\
<svg width="24" height="32" viewBox="-8 -20 16 20" xmlns="http://www.w3.org/2000/svg">\
  <path d="M0,0 C8,0 8,-12 0,-20 C-8,-12 -8,0 0,0 Z" fill="${iconColor}" stroke="#1F497D" stroke-width="1"/>\
</svg>`;
    const dataUri = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svgMarkup);
    const icon = new H.map.Icon(dataUri);
    const marker = new H.map.Marker({ lat: eventItem.lat, lng: eventItem.lon }, { icon: icon });
    marker.setData(index);
    map.addObject(marker);
    markersList.push({ marker, category: eventItem.category });
    marker.addEventListener('tap', function(evt) {
      const idx = marker.getData();
      const eItem = localEvents[idx];
      const dateStr = eItem.date && eItem.date !== 'nan' ? `<p>${eItem.date}</p>` : '';
      const addressStr = eItem.address && eItem.address !== 'nan' ? `<p>${eItem.address}</p>` : '';
      const lang = typeof getUserLang === 'function' ? getUserLang() : 'ja';
      const t = (window.translations && window.translations[lang]) || {};
      const linkHtml = eItem.url && eItem.url !== 'nan' ? `<p><a href="${eItem.url}" target="_blank" rel="noopener">${t.view_details || '詳細を見る'}</a></p>` : '';
      const saveLabel = t.save || '保存';
      const saveFavorite = t.save_favorite || 'お気に入り';
      const saveWant = t.save_want || '行ってみたい';
      const savePlan = t.save_plan || '旅行プラン';
      const saveStar = t.save_star || 'スター付き';
      const contentHtml = `
        <div class="info-content" style="position:relative;">
          <h3 style="margin:0 0 0.2rem 0;">${eItem.name}</h3>
          ${dateStr}
          ${addressStr}
          ${linkHtml}
          <div class="save-wrapper" style="position:relative;display:inline-block;margin-top:0.5rem;">
            <button class="save-btn" data-index="${idx}" style="background-color:transparent;border:none;color:#1F497D;font-size:0.9rem;cursor:pointer;display:flex;align-items:center;gap:0.3rem;">
              <span class="save-icon">🔖</span><span>${saveLabel}</span>
            </button>
            <div class="save-menu" style="display:none;position:absolute;top:110%;left:0;background:#fff;border:1px solid #ccc;border-radius:6px;padding:0.4rem;box-shadow:0 2px 6px rgba(0,0,0,0.2);width:130px;font-size:0.8rem;">
              <div class="save-option" data-list="favorite" style="cursor:pointer;padding:0.2rem 0.4rem;display:flex;align-items:center;gap:0.3rem;"><span>❤️</span><span>${saveFavorite}</span></div>
              <div class="save-option" data-list="want" style="cursor:pointer;padding:0.2rem 0.4rem;display:flex;align-items:center;gap:0.3rem;"><span>🚩</span><span>${saveWant}</span></div>
              <div class="save-option" data-list="plan" style="cursor:pointer;padding:0.2rem 0.4rem;display:flex;align-items:center;gap:0.3rem;"><span>🧳</span><span>${savePlan}</span></div>
              <div class="save-option" data-list="star" style="cursor:pointer;padding:0.2rem 0.4rem;display:flex;align-items:center;gap:0.3rem;"><span>⭐</span><span>${saveStar}</span></div>
            </div>
          </div>
        </div>`;
      // 既存のバブルを削除
      ui.getBubbles().forEach(function(b) { ui.removeBubble(b); });
      const bubble = new H.ui.InfoBubble(evt.target.getGeometry(), { content: contentHtml });
      ui.addBubble(bubble);
      // 翻訳とイベント設定を遅延で実行
      setTimeout(() => {
        const saveBtn = document.querySelector('.save-btn');
        const saveMenu = document.querySelector('.save-menu');
        if (saveBtn && saveMenu) {
          saveBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            saveMenu.style.display = saveMenu.style.display === 'none' ? 'block' : 'none';
          });
          saveMenu.querySelectorAll('.save-option').forEach(opt => {
            opt.addEventListener('click', (ev) => {
              const listType = opt.getAttribute('data-list');
              addToFavorites(eItem, listType);
              saveMenu.style.display = 'none';
            });
          });
        }
        if (typeof applyTranslations === 'function') applyTranslations();
      }, 0);
    });
  });

  // すべてのマーカー追加後にビューを調整します。
  // Google Maps と同様に、全マーカーが収まる矩形を計算して地図をフィットさせます。
  try {
    const lats = localEvents.map(e => parseFloat(e.lat));
    const lngs = localEvents.map(e => parseFloat(e.lon));
    if (lats.length > 0 && lngs.length > 0) {
      const minLat = Math.min.apply(null, lats);
      const maxLat = Math.max.apply(null, lats);
      const minLng = Math.min.apply(null, lngs);
      const maxLng = Math.max.apply(null, lngs);
      // H.geo.Rect のコンストラクタは (top, left, bottom, right) の順です
      const boundsRect = new H.geo.Rect(maxLat, minLng, minLat, maxLng);
      map.getViewModel().setLookAtData({ bounds: boundsRect });
      // 必要に応じてズーム制限をかけます
      const maxZoom = 14;
      if (map.getZoom() > maxZoom) {
        map.setZoom(maxZoom);
      }
    }
  } catch (err) {
    // ビュー調整は失敗しても致命的でないため、ログに出力するだけとします
    console.warn('Failed to fit map bounds:', err);
  }
  // カテゴリボタンを生成
  createCategoryButtons();
  // マーカー表示更新
  updateMarkerVisibility();
  // 周辺表示ボタンの処理
  const resetBtn = document.getElementById('reset-view-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      let center = null;
      let zoomLevel = 11;
      try {
        const u = JSON.parse(sessionStorage.getItem('user')) || {};
        if (u.address && (u.address.includes('池袋') || u.address.includes('豊島区'))) {
          center = { lat: 35.7303, lng: 139.7099 };
          zoomLevel = 11;
        }
      } catch (err) { /* ignore */ }
      if (center) {
        map.setCenter(center);
        map.setZoom(zoomLevel);
      } else {
        map.setCenter(defaultCenter);
        map.setZoom(6);
      }
    });
  }
}