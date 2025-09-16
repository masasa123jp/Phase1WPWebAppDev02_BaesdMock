/*
  signup.js – 新規登録画面のイベントハンドラ

  登録フォームの送信時に入力値をチェックし、ユーザー情報とペット情報を
  ローカルストレージへ保存します。実際の環境ではここからサーバーへ
  リクエストを送信してユーザー登録を完了させますが、本モックでは
  完了後に直接マップページへ遷移します。
*/

// ▼ 追加：i18n ヘルパ（常に最新の言語設定を参照）
const getLang = () => localStorage.getItem('userLang') || 'ja';
const t = (k, fb) => {
  const lang = getLang();
  return (window.translations && translations[lang] && translations[lang][k]) || fb || k;
};

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('signup-form');
  // Dog breeds definition. Each entry uses a key for translation.
  const dogBreeds = [
    '',
    'toy_poodle',
    'chihuahua',
    'mix_small',
    'shiba',
    'miniature_dachshund',
    'pomeranian',
    'miniature_schnauzer',
    'yorkshire_terrier',
    'french_bulldog',
    'maltese',
    'shih_tzu',
    'kaninchen_dachshund',
    'papillon',
    'golden_retriever',
    'welsh_corgi',
    'jack_russell',
    'labrador_retriever',
    'pug',
    'cavalier_king_charles',
    'miniature_pinscher',
    'mix_medium',
    'pekingese',
    'italian_greyhound',
    'border_collie',
    'beagle',
    'bichon_frise',
    'shetland_sheepdog',
    'boston_terrier',
    'american_cocker_spaniel',
    'japanese_spitz'
  ];

  // Populate breed select with options based on current language
  const breedGroup = document.getElementById('breed-group');
  const breedSelect = document.getElementById('petBreed');
  function populateBreeds() {
    if (!breedSelect) return;
    breedSelect.innerHTML = '';
    dogBreeds.forEach((key) => {
      const opt = document.createElement('option');
      if (!key) {
        // placeholder option
        opt.value = '';
        opt.textContent = t('breed_blank', '犬種を選択');
      } else {
        opt.value = key;
        opt.textContent = t('breed_' + key, key);
      }
      breedSelect.appendChild(opt);
    });
  }

  populateBreeds();

  // Handle pet type change to show/hide breed select
  const petTypeSelect = document.getElementById('petType');
  function updateBreedVisibility() {
    const type = petTypeSelect.value;
    if (type === 'dog') {
      if (breedGroup) breedGroup.style.display = '';
      if (breedSelect) breedSelect.disabled = false;
    } else {
      if (breedGroup) breedGroup.style.display = 'none';
      if (breedSelect) {
        breedSelect.disabled = true;
        breedSelect.value = '';
      }
    }
  }
  if (petTypeSelect) {
    petTypeSelect.addEventListener('change', () => {
      updateBreedVisibility();
    });
    // initialise on load
    updateBreedVisibility();
  }

  // Expose a global updater so that language switches can refresh breed labels
  window.updateBreedOptions = function() {
    populateBreeds();
    updateBreedVisibility();
  };
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      // 必須項目を取得
      const name = document.getElementById('name').value.trim();
      const furigana = document.getElementById('furigana').value.trim();
      const email = document.getElementById('email').value.trim();
      const password = document.getElementById('password').value.trim();
      const petType = document.getElementById('petType').value;
      const petName = document.getElementById('petName') ? document.getElementById('petName').value.trim() : '';
      const petAge = document.getElementById('petAge').value;
      const address = document.getElementById('address').value.trim();
      const phone = document.getElementById('phone').value.trim();

      if (!name || !email || !password) {
        // ▼ 置換：多言語対応の必須チェックメッセージ
        alert(t('signup_required_fields', '名前、メールアドレス、パスワードは必須です'));
        return;
      }

      // 新しいデータ構造では pets 配列にペット情報を格納する
      const pets = [];
      if (petType) {
        // ペットの犬種（犬のみ）を取得
        const breedVal = (petType === 'dog' && breedSelect) ? breedSelect.value : '';
        pets.push({ type: petType, breed: breedVal, name: petName, age: petAge });
      }

      const user = {
        name,
        furigana,
        email,
        password,
        address,
        phone,
        pets
      };

      // 新規登録ユーザーを保存
      localStorage.setItem('registeredUser', JSON.stringify(user));
      // 現在のログインユーザーとしても保存
      localStorage.setItem('user', JSON.stringify(user));

      if (typeof RORO_ROUTES !== 'undefined' && RORO_ROUTES.map) {
        location.href = RORO_ROUTES.map;
      } else {
        location.href = 'map.html';
      }
    });
  }

  // Google登録
  const googleBtn = document.querySelector('.google-btn');
  if (googleBtn) {
    googleBtn.addEventListener('click', () => {
      const user = { email: 'google@example.com', name: 'Googleユーザー' };
      localStorage.setItem('user', JSON.stringify(user));
      if (typeof RORO_ROUTES !== 'undefined' && RORO_ROUTES.map) {
        location.href = RORO_ROUTES.map;
      } else {
        location.href = 'map.html';
      }
    });
  }

  // LINE登録
  const lineBtn = document.querySelector('.line-btn');
  if (lineBtn) {
    lineBtn.addEventListener('click', () => {
      const user = { email: 'line@example.com', name: 'LINEユーザー' };
      localStorage.setItem('user', JSON.stringify(user));
      if (typeof RORO_ROUTES !== 'undefined' && RORO_ROUTES.map) {
        location.href = RORO_ROUTES.map;
      } else {
        location.href = 'map.html';
      }
    });
  }
});
