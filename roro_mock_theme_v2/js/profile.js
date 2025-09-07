/*
  profile.js – マイページの表示・編集処理

  ローカルストレージからユーザー情報を読み込み、プロフィールカードに表示します。
  また、お気に入りの数をカウントして表示します。フォーム送信時には入力内容
  をローカルストレージへ反映させます。
*/

document.addEventListener('DOMContentLoaded', () => {
  // ログインしていない場合はリダイレクト
  requireLogin();
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
      // 種類セレクト
      const typeSelect = document.createElement('select');
      typeSelect.innerHTML = `
        <option value="dog">犬</option>
        <option value="cat">猫</option>
        <option value="other">その他</option>
      `;
      typeSelect.value = pet.type || 'dog';
      typeSelect.style.flex = '1 1 20%';
      // 犬種セレクト（犬の場合のみ有効）
      const breedSelect = document.createElement('select');
      // 犬種リストの定義
      const dogBreeds = [
        '',
        'トイ・プードル',
        'チワワ',
        '混血犬（体重10kg未満）',
        '柴',
        'ミニチュア・ダックスフンド',
        'ポメラニアン',
        'ミニチュア・シュナウザー',
        'ヨークシャー・テリア',
        'フレンチ・ブルドッグ',
        'マルチーズ',
        'シー・ズー',
        'カニーンヘン・ダックスフンド',
        'パピヨン',
        'ゴールデン・レトリーバー',
        'ウェルシュ・コーギー・ペンブローク',
        'ジャック・ラッセル・テリア',
        'ラブラドール・レトリーバー',
        'パグ',
        'キャバリア・キング・チャールズ・スパニエル',
        'ミニチュア・ピンシャー',
        '混血犬（体重10kg以上20kg未満）',
        'ペキニーズ',
        'イタリアン・グレーハウンド',
        'ボーダー・コーリー',
        'ビーグル',
        'ビション・フリーゼ',
        'シェットランド・シープドッグ',
        'ボストン・テリア',
        'アメリカン・コッカー・スパニエル',
        '日本スピッツ'
      ];
      dogBreeds.forEach((breed) => {
        const opt = document.createElement('option');
        opt.value = breed;
        opt.textContent = breed || '犬種を選択';
        breedSelect.appendChild(opt);
      });
      breedSelect.value = pet.breed || '';
      breedSelect.style.flex = '1 1 20%';
      breedSelect.disabled = (pet.type !== 'dog');

      // 名前入力
      const nameInputEl = document.createElement('input');
      nameInputEl.type = 'text';
      nameInputEl.value = pet.name || '';
      nameInputEl.placeholder = '名前';
      nameInputEl.style.flex = '1 1 20%';
      // 年齢セレクト
      const ageSelect = document.createElement('select');
      ageSelect.innerHTML = `
        <option value="puppy">子犬/子猫 (1歳未満)</option>
        <option value="adult">成犬/成猫 (1〜7歳)</option>
        <option value="senior">シニア犬/シニア猫 (7歳以上)</option>
      `;
      ageSelect.value = pet.age || 'puppy';
      ageSelect.style.flex = '1 1 20%';
      // 削除ボタン
      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.textContent = '削除';
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
      location.href = 'index.html';
    });
  }
});