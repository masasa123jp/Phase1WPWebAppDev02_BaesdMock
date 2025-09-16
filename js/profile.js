/*
  profile.js – マイページの表示・編集処理

  ローカルストレージからユーザー情報を読み込み、プロフィールカードに表示します。
  また、お気に入りの数をカウントして表示します。フォーム送信時には入力内容
  をローカルストレージへ反映させます。
*/

document.addEventListener('DOMContentLoaded', () => {
  // ログインしていない場合はリダイレクト
  requireLogin();

  // Translation helper functions for dynamic elements.  The
  // translations object is defined in lang.js.  If a key is not
  // found for the current language, the fallback or the key name
  // itself is returned.
  const getLang = () => localStorage.getItem('userLang') || 'ja';
  const t = (k, fb) => {
    const lang = getLang();
    return (window.translations && translations[lang] && translations[lang][k]) || fb || k;
  };
  // ユーザーデータの取得
  const userData = JSON.parse(sessionStorage.getItem('user')) || {};
  // プロフィールカードへの表示要素
  const nameEl = document.getElementById('profile-name');
  const locationEl = document.getElementById('profile-location');
  const favCountEl = document.getElementById('fav-count');
  // フォームの入力要素
  const nameInput = document.getElementById('profile-name-input');
  const furiganaInput = document.getElementById('profile-furigana-input');
  const emailInput = document.getElementById('profile-email');
  const phoneInput = document.getElementById('profile-phone');
  const addressInput = document.getElementById('profile-address');
  const petsContainer = document.getElementById('pets-container');
  const addPetBtn = document.getElementById('add-pet-btn');
  const languageSelect = document.getElementById('profile-language');
  // お気に入り数の読み込み
  let favorites;
  try {
    favorites = JSON.parse(localStorage.getItem('favorites')) || [];
  } catch (e) {
    favorites = [];
  }
  favCountEl.textContent = favorites.length;
  // フォロワー・フォロー数（現状は0固定）
  document.getElementById('followers').textContent = 0;
  document.getElementById('following').textContent = 0;
  // 名前・ふりがなは表示のみ
  nameEl.textContent = userData.name || 'ゲストユーザー';
  if (userData.address && userData.address.trim()) {
    locationEl.textContent = userData.address;
  } else {
    locationEl.textContent = '';
  }
  // フォームに初期値を設定
  nameInput.value = userData.name || '';
  furiganaInput.value = userData.furigana || '';
  emailInput.value = userData.email || '';
  phoneInput.value = userData.phone || '';
  addressInput.value = userData.address || '';
  // 言語セレクトの初期値
  if (languageSelect) {
    // sessionStorage または userData.language から読み取る
    const lang = userData.language || (typeof getUserLang === 'function' ? getUserLang() : 'ja');
    languageSelect.value = lang;
  }
  // ペット情報を初期化
  let pets = [];
  if (Array.isArray(userData.pets)) {
    pets = userData.pets;
  } else if (userData.petType) {
    // 単一ペット情報から変換
    pets.push({ type: userData.petType || '', name: userData.petName || '', age: userData.petAge || '' });
  }
  // ペット情報のフォームを描画
  function renderPets() {
    // いったんクリア
    petsContainer.innerHTML = '';
    pets.forEach((pet, index) => {
      const petDiv = document.createElement('div');
      petDiv.className = 'pet-item';
      petDiv.style.marginBottom = '0.5rem';
      const wrapper = document.createElement('div');
      wrapper.style.display = 'flex';
      wrapper.style.gap = '0.5rem';
      wrapper.style.flexWrap = 'wrap';
      wrapper.style.alignItems = 'flex-end';
      // 種類セレクト: 翻訳に対応したオプションを生成
      const typeSelect = document.createElement('select');
      [
        { value: 'dog', key: 'pet_dog' },
        { value: 'cat', key: 'pet_cat' },
        { value: 'other', key: 'pet_other' }
      ].forEach((optData) => {
        const opt = document.createElement('option');
        opt.value = optData.value;
        opt.textContent = (typeof t === 'function' ? t(optData.key, optData.value) : optData.value);
        typeSelect.appendChild(opt);
      });
      typeSelect.value = pet.type || 'dog';
      typeSelect.style.flex = '1 1 20%';
      // 犬種セレクト（犬の場合のみ有効）
      const breedSelect = document.createElement('select');
      // 犬種キーの定義（プロフィール用）
      const breedKeys = [
        '',
        'toy_poodle','chihuahua','mix_small','shiba','miniature_dachshund','pomeranian',
        'miniature_schnauzer','yorkshire_terrier','french_bulldog','maltese','shih_tzu',
        'kaninchen_dachshund','papillon','golden_retriever','welsh_corgi','jack_russell',
        'labrador_retriever','pug','cavalier_king_charles','miniature_pinscher',
        'mix_medium','pekingese','italian_greyhound','border_collie','beagle','bichon_frise',
        'shetland_sheepdog','boston_terrier','american_cocker_spaniel','japanese_spitz'
      ];
      breedKeys.forEach((key) => {
        const opt = document.createElement('option');
        if (!key) {
          opt.value = '';
          opt.textContent = (typeof t === 'function' ? t('breed_blank', '犬種を選択') : '犬種を選択');
        } else {
          opt.value = key;
          opt.textContent = (typeof t === 'function' ? t('breed_' + key, key) : key);
        }
        breedSelect.appendChild(opt);
      });
      breedSelect.value = pet.breed || '';
      breedSelect.style.flex = '1 1 20%';
      breedSelect.disabled = (pet.type !== 'dog');

      // 名前入力
      const nameInputEl = document.createElement('input');
      nameInputEl.type = 'text';
      nameInputEl.value = pet.name || '';
      // Placeholder uses translation for 'Name'
      nameInputEl.placeholder = (typeof t === 'function' ? t('label_name', '名前') : '名前');
      nameInputEl.style.flex = '1 1 20%';
      // 年齢セレクト: translated options
      const ageSelect = document.createElement('select');
      [
        { value: 'puppy', key: 'pet_age_puppy' },
        { value: 'adult', key: 'pet_age_adult' },
        { value: 'senior', key: 'pet_age_senior' }
      ].forEach((item) => {
        const opt = document.createElement('option');
        opt.value = item.value;
        opt.textContent = (typeof t === 'function' ? t(item.key, item.value) : item.value);
        ageSelect.appendChild(opt);
      });
      ageSelect.value = pet.age || 'puppy';
      ageSelect.style.flex = '1 1 20%';
      // 削除ボタン
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      // Button label uses translation for 'delete'
      removeBtn.textContent = (typeof t === 'function' ? t('delete', '削除') : '削除');
      // 危険操作用のボタンスタイルを適用
      removeBtn.className = 'btn danger-btn';
      removeBtn.addEventListener('click', () => {
        pets.splice(index, 1);
        renderPets();
      });
      // 種類変更に応じて犬種セレクトの有効/無効を切り替え
      typeSelect.addEventListener('change', () => {
        if (typeSelect.value === 'dog') {
          breedSelect.disabled = false;
        } else {
          breedSelect.disabled = true;
          breedSelect.value = '';
        }
      });
      // 要素を追加（犬種セレクトを種類の次に配置）
      wrapper.appendChild(typeSelect);
      wrapper.appendChild(breedSelect);
      wrapper.appendChild(nameInputEl);
      wrapper.appendChild(ageSelect);
      wrapper.appendChild(removeBtn);
      petDiv.appendChild(wrapper);
      petsContainer.appendChild(petDiv);
    });
  }
  renderPets();
  // ペット追加ボタン
  if (addPetBtn) {
    addPetBtn.addEventListener('click', () => {
      pets.push({ type: 'dog', breed: '', name: '', age: 'puppy' });
      renderPets();
    });
  }
  // 保存処理
  const form = document.getElementById('profile-form');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    // 更新可能な項目を反映
    userData.email = emailInput.value.trim();
    userData.phone = phoneInput.value.trim();
    userData.address = addressInput.value.trim();
    // 言語設定
    if (languageSelect) {
      userData.language = languageSelect.value;
      // 言語設定をローカルストレージにも保存
      if (typeof setUserLang === 'function') setUserLang(languageSelect.value);
    }
    // ペット情報の取得
    const newPets = [];
    const petWrappers = petsContainer.querySelectorAll('.pet-item');
    // However, we maintain pets array separately; we'll iterate pets array and update values from DOM
    const wrappers = petsContainer.querySelectorAll('.pet-item');
    wrappers.forEach((div, idx) => {
      const selects = div.querySelectorAll('select');
      const inputs = div.querySelectorAll('input');
      // select[0]: type, select[1]: breed, select[2]: age
      const typeVal = selects[0].value;
      const breedVal = selects.length > 2 ? selects[1].value : '';
      const ageVal = selects.length > 2 ? selects[2].value : selects[1].value;
      const nameVal = inputs[0].value.trim();
      newPets.push({ type: typeVal, breed: breedVal, name: nameVal, age: ageVal });
    });
    userData.pets = newPets;
    // 古いpetType/petAge/petNameフィールドは削除
    delete userData.petType;
    delete userData.petAge;
    delete userData.petName;
    // セッションストレージに保存
    sessionStorage.setItem('user', JSON.stringify(userData));
    // 登録済みユーザーにも保存（emailで一致する場合）
    try {
      let registered = JSON.parse(localStorage.getItem('registeredUser'));
      if (registered) {
        // 以前の形式の場合、pets配列に変換
        registered = { ...registered, ...userData };
        localStorage.setItem('registeredUser', JSON.stringify(registered));
      }
    } catch (err) {
      /* ignore */
    }
    // 保存後にページを更新して反映
    location.reload();
  });
  // ログアウト処理
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      sessionStorage.removeItem('user');
      if (typeof RORO_ROUTES !== 'undefined' && RORO_ROUTES.login) {
        location.href = RORO_ROUTES.login;
      } else {
        location.href = 'index.html';
      }
    });
  }

  // Expose a global updater so that language switches can re-render pet forms
  window.updateProfilePets = function() {
    renderPets();
  };
});