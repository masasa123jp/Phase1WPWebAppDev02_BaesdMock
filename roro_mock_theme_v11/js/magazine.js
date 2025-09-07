/*
  magazine.js – 月間雑誌閲覧機能

  magazine.html のカードをクリックすると、ページめくりアニメーションとともに
  雑誌コンテンツを表示するためのスクリプトです。各号のページ構成を
  magazineData 配列に定義し、CSS で立体的なフリップ効果を実現しています。

  ページめくりは左右の矢印ボタンで行います。左側は前のページ、右側は次の
  ページを表示します。閲覧を終了するときは×ボタンを押してください。
*/

document.addEventListener('DOMContentLoaded', () => {
  const viewer = document.getElementById('magazine-viewer');
  const book = viewer ? viewer.querySelector('.book') : null;
  if (!viewer || !book) return;
  // クリックした位置に応じてページをめくる処理を追加
  // ページの右半分をクリックしたときは次のページへ、左半分は前のページへ戻る
  book.addEventListener('click', (e) => {
    // ナビゲーションや閉じるボタンのクリックは無視する
    // event.stopPropagation() を使っているため基本的にここには届かないが、念のため判定する
    if (e.target.classList.contains('nav-arrow') || e.target.classList.contains('close-btn')) {
      return;
    }
    const rect = book.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    // 右側クリック: 次へ。それ以外: 前へ。
    // 最終ページ（背表紙）では右側クリックしても次へ進まないようにする
    const total = currentIssuePages.length;
    if (clickX > rect.width / 2) {
      if (currentPageIndex < total - 1) {
        flipNext();
      }
    } else {
      if (currentPageIndex > 0) {
        flipBack();
      }
    }
  });
  // 雑誌カードのクリックハンドラを設定
  const cards = document.querySelectorAll('.magazine-card');
  cards.forEach((card, idx) => {
    card.addEventListener('click', () => {
      openMagazine(idx);
    });
  });
  // 雑誌データ定義
  const magazineData = [
    {
      id: '2025-06',
      title: '2025年6月号',
      pages: [
        {
          html: `
            <div style="display:flex;flex-direction:column;height:100%;">
              <!-- 新しい雑誌表紙：添付デザインを使用 -->
              <img src="images/magazine_cover1.png" alt="cover" style="width:100%;height:65%;object-fit:cover;border-radius:8px;">
              <div style="padding:0.3rem;text-align:center;">
                <h2 style="margin:0;color:#1F497D;" data-i18n-key="mag_issue_june">2025年6月号</h2>
                <h3 style="margin:0.2rem 0;color:#e67a8a;font-size:1.3rem;" data-i18n-key="mag_theme_june">犬と梅雨のおうち時間</h3>
                <p style="font-size:1.0rem;" data-i18n-key="mag_desc_june">雨の日でも犬と楽しく過ごせる特集</p>
              </div>
            </div>
          `
        },
        {
          html: `
            <h3 style="color:#1F497D;" data-i18n-key="mag_event_title">今月のイベント</h3>
            <ul style="list-style-type:disc;padding-left:1.2rem;font-size:0.9rem;">
              <li>6/12 オンラインヨガ with ワンちゃん</li>
              <li>6/26 室内ドッグラン・オフ会</li>
              <li>6/30 レインコートファッションショー</li>
            </ul>
            <p style="margin-top:0.5rem;font-size:0.85rem;">梅雨でもワンちゃんと楽しめるイベントが盛りだくさん！</p>
          `
        },
        {
          html: `
            <h3 style="color:#1F497D;" data-i18n-key="mag_cafe_title">おすすめカフェ</h3>
            <p style="font-size:0.9rem;">池袋にある室内ドッグカフェ「Rainy&nbsp;Days」。ガラス張りの店内は明るく、ワンちゃん用メニューも充実しています。雨の日でも一緒にゆったりカフェタイムが楽しめます。</p>
          `
        },
        {
          html: `
            <h3 style="color:#1F497D;" data-i18n-key="mag_column_june">プチコラム：梅雨の運動不足解消法</h3>
            <p style="font-size:0.9rem;">梅雨の時期はお外に出られず犬も運動不足になりがち。室内で楽しめるおもちゃやトリック練習でストレス発散しましょう。簡単な隠れんぼや知育玩具もおすすめです。</p>
          `
        },
        {
          html: `
            <h3 style="color:#1F497D;" data-i18n-key="mag_recommend_title">ちぃまめのおすすめ</h3>
            <p style="font-size:0.9rem;">雨の日のお出かけには防水グッズが必須！</p>
            <div style="display:flex;gap:0.5rem;align-items:flex-start;margin-bottom:0.5rem;">
              <img src="images/product_raincoat_boots.png" alt="レインコート" style="width:40%;max-height:120px;object-fit:contain;border-radius:8px;">
              <div style="flex:1;">
                <strong>防水レインコート</strong><br>
                ¥3,500<br>
                雨の日もワンちゃんをおしゃれに防水！
              </div>
            </div>
            <div style="display:flex;gap:0.5rem;align-items:flex-start;">
              <img src="images/product_raincoat_boots.png" alt="レインブーツ" style="width:40%;max-height:120px;object-fit:contain;border-radius:8px;">
              <div style="flex:1;">
                <strong>レインブーツ</strong><br>
                ¥1,200<br>
                足元をしっかり守るかわいいブーツ。
              </div>
            </div>
          `
        },
        {
          html: `
            <h3 style="color:#1F497D;" data-i18n-key="mag_disaster_title">ちぃまめの防災アドバイス</h3>
            <img src="images/chiamame_disaster.png" alt="防災" style="width:100%;max-height:250px;object-fit:contain;margin-bottom:0.5rem;">
            <p style="font-size:0.9rem;">ちぃまめから、小さな命を守るための防災アドバイス！避難用のバッグにはフード・水・トイレ用品を忘れずに。</p>
          `
        },
        {
          html: `
            <h3 style="color:#1F497D;" data-i18n-key="mag_advice_title">ワンポイントアドバイス</h3>
            <div style="display:flex;gap:0.5rem;align-items:flex-start;">
              <img src="images/chiamame_mascot.png" alt="ちぃまめ" style="width:35%;max-height:150px;object-fit:contain;">
              <div style="flex:1;font-size:0.9rem;">
                <ul style="padding-left:1rem;list-style-type:disc;margin:0;">
                  <li>日常のニュースから「犬を飼う責任」を考える</li>
                  <li>「低気圧」がペットにもたらす身体の変化</li>
                  <li>犬も早めの熱中症対策を</li>
                </ul>
                <p style="font-size:0.8rem;margin-top:0.5rem;">詳しくはWeb記事へ♪</p>
              </div>
            </div>
          `
        },
        {
          html: `
            <h3 style="color:#1F497D;">ちぃまめの占い</h3>
            <img src="images/fortune_advice.png" alt="占い" style="width:100%;max-height:300px;object-fit:contain;margin-bottom:0.5rem;border-radius:8px;">
            <p style="font-size:0.85rem;">牡羊座: 新しい冒険があなたを待っています！<br>
            牡牛座: 家族との時間を大切にしましょう。<br>
            双子座: 新しい出会いがあるかも？<br>
            蟹座: 自分の直感に正直に従いましょう。<br>
            獅子座: 周りからの注目を浴びる予感！<br>
            乙女座: 健康に気をつけて、休を心がけて。</p>
          `
        },
        // 背表紙
        {
          html: `
            <div style="background:#F9E9F3;display:flex;align-items:center;justify-content:center;height:100%;padding:1rem;">
              <div style="writing-mode:vertical-rl; transform: rotate(180deg); font-size:1.4rem; color:#1F497D; text-align:center;">
                PROJECT RORO<br>2025年6月号
              </div>
            </div>
          `
        }
      ]
    },
    {
      id: '2025-07',
      title: '2025年7月号',
      pages: [
        {
          html: `
            <div style="display:flex;flex-direction:column;height:100%;">
              <!-- 7月号表紙は添付のかわいい犬のビーチ写真を使用し、夏のおでかけをイメージ -->
              <img src="images/magazine_cover2.png" alt="cover" style="width:100%;height:65%;object-fit:cover;border-radius:8px;">
              <div style="padding:0.4rem;text-align:center;">
                <h2 style="margin:0;color:#1F497D;" data-i18n-key="mag_issue_july">2025年7月号</h2>
                <h3 style="margin:0.3rem 0;color:#e67a8a;font-size:1.3rem;" data-i18n-key="mag_theme_july">犬と夏のおでかけ × UVケア</h3>
                <p style="font-size:1.0rem;" data-i18n-key="mag_desc_july">紫外線対策とワンちゃんとのおでかけスポットをご紹介♪</p>
              </div>
            </div>
          `
        },
        {
          html: `
            <h3 style="color:#1F497D;" data-i18n-key="mag_event_title">今月のイベント</h3>
            <ul style="list-style-type:disc;padding-left:1.2rem;font-size:0.9rem;">
              <li>7/12 代々木公園「サマーフェス」</li>
              <li>7/20 ワンちゃんOKビーチクリーン</li>
              <li>7/28 室内ドッグヨガ体験会</li>
            </ul>
            <p style="margin-top:0.5rem;font-size:0.85rem;">暑い季節でもワンちゃんと楽しめるイベントが盛りだくさん！</p>
          `
        },
        {
          html: `
            <h3 style="color:#1F497D;" data-i18n-key="mag_cafe_title">おすすめカフェ</h3>
            <p style="font-size:0.9rem;">代官山にあるドッグカフェ「Cafe&nbsp;Lily」。木漏れ日のテラス席はワンちゃん同伴OK。ヘルシーなランチと特製スイーツでリラックスしたひとときを過ごせます。</p>
          `
        },
        {
          html: `
            <h3 style="color:#1F497D;" data-i18n-key="mag_column_july">プチコラム：夏のUV対策</h3>
            <p style="font-size:0.9rem;">夏は紫外線が強く、ワンちゃんも日焼けします。散歩は朝夕の涼しい時間帯に。帽子やウェアでしっかりガードして、肉球の火傷にも注意しましょう。</p>
          `
        },
        {
          html: `
            <h3 style="color:#1F497D;" data-i18n-key="mag_recommend_title">ちぃまめのおすすめ</h3>
            <p style="font-size:0.9rem;">夏のおでかけには涼感グッズが必須！</p>
            <div style="display:flex;gap:0.5rem;align-items:flex-start;margin-bottom:0.5rem;">
              <img src="images/product_uv_clothes.png" alt="UVカット服" style="width:40%;max-height:120px;object-fit:contain;border-radius:8px;">
              <div style="flex:1;">
                <strong>UVカット冷感犬服</strong><br>
                ¥2,980<br>
                暑い日でもひんやり快適！
              </div>
            </div>
            <div style="display:flex;gap:0.5rem;align-items:flex-start;">
              <img src="images/product_cooling_mat.png" alt="アルミマット" style="width:40%;max-height:120px;object-fit:contain;border-radius:8px;">
              <div style="flex:1;">
                <strong>ひんやりアルミマット</strong><br>
                ¥1,980<br>
                おうちでも外出先でも使える冷却マット。
              </div>
            </div>
          `
        },
        {
          html: `
            <h3 style="color:#1F497D;" data-i18n-key="mag_relax_cafe_title">ワンちゃんとくつろげるカフェ</h3>
            <img src="images/pet_cafe.png" alt="カフェ" style="width:100%;max-height:250px;object-fit:cover;border-radius:8px;margin-bottom:0.5rem;">
            <p style="font-size:0.9rem;">涼しいカフェで犬と一緒に過ごすなら、落ち着いたインテリアと犬用メニューが揃ったお店がおすすめ。</p>
          `
        },
        {
          html: `
            <h3 style="color:#1F497D;" data-i18n-key="mag_advice_title">ワンポイントアドバイス</h3>
            <div style="display:flex;gap:0.5rem;align-items:flex-start;">
              <img src="images/chiamame_mascot.png" alt="ちぃまめ" style="width:35%;max-height:150px;object-fit:contain;">
              <div style="flex:1;font-size:0.9rem;">
                <ul style="padding-left:1rem;list-style-type:disc;margin:0;">
                  <li>夏本番！ワンちゃんの紫外線対策を忘れずに</li>
                  <li>水分補給をしっかりとさせて熱中症予防</li>
                  <li>暑い日は夕方や早朝にお散歩を</li>
                </ul>
                <p style="font-size:0.8rem;margin-top:0.5rem;">詳しくはWeb記事へ♪</p>
              </div>
            </div>
          `
        },
        {
          html: `
            <h3 style="color:#1F497D;">ちぃまめの占い</h3>
            <img src="images/fortune_advice.png" alt="占い" style="width:100%;max-height:300px;object-fit:contain;margin-bottom:0.5rem;border-radius:8px;">
            <p style="font-size:0.85rem;">牡羊座: 新しい冒険があなたを待っています！<br>
            牡牛座: 家族との時間を大切にしましょう。<br>
            双子座: 新しい出会いがあるかも？<br>
            蟹座: 自分の直感に正直に従いましょう。<br>
            獅子座: 周りからの注目を浴びる予感！<br>
            乙女座: 健康に気をつけて、休を心がけて。</p>
          `
        },
        // 背表紙
        {
          html: `
            <div style="background:#F9E9F3;display:flex;align-items:center;justify-content:center;height:100%;padding:1rem;">
              <div style="writing-mode:vertical-rl; transform: rotate(180deg); font-size:1.4rem; color:#1F497D; text-align:center;">
                PROJECT RORO<br>2025年7月号
              </div>
            </div>
          `
        }
      ]
    }
  ];
  let currentIssuePages = [];
  let currentPageIndex = 0;
  let prevArrow, nextArrow, closeBtn;
  /**
   * 雑誌を開く
   * @param {number} idx 雑誌番号
   */
  function openMagazine(idx) {
    const issue = magazineData[idx];
    if (!issue) return;
    currentIssuePages = issue.pages;
    currentPageIndex = 0;
    // ビューワーを表示
    viewer.style.display = 'flex';
    renderPages();
  }
  /**
   * ページを描画し、ナビゲーションを設定
   */
  function renderPages() {
    book.innerHTML = '';
    // ナビゲーション要素を作成
    prevArrow = document.createElement('div');
    prevArrow.className = 'nav-arrow prev';
    prevArrow.innerHTML = '&#9664;';
    prevArrow.addEventListener('click', (e) => {
      e.stopPropagation();
      flipBack();
    });
    nextArrow = document.createElement('div');
    nextArrow.className = 'nav-arrow next';
    nextArrow.innerHTML = '&#9654;';
    nextArrow.addEventListener('click', (e) => {
      e.stopPropagation();
      flipNext();
    });
    closeBtn = document.createElement('div');
    closeBtn.className = 'close-btn';
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeViewer();
    });
    book.appendChild(closeBtn);
    book.appendChild(prevArrow);
    book.appendChild(nextArrow);
    // ページ要素を逆順で追加し、重ね順を設定
    const total = currentIssuePages.length;
    // ページは末尾から追加することで DOM の順序を保持しますが、
    // 各ページの重なり順 (z-index) は逆順に設定します。
    // 最初のページ (インデックス 0) が一番上に表示され、後のページが下になります。
    for (let i = total - 1; i >= 0; i--) {
      const data = currentIssuePages[i];
      const page = document.createElement('div');
      page.className = 'page';
      page.dataset.index = i;
      // 背表紙（最後のページ）はクリックを無効化するためクラスを追加
      if (i === total - 1) {
        page.classList.add('back-cover');
      }
      // 最初のページを一番上に、最後のページを一番下にする
      // 例: total=5 の場合、i=4→zIndex=1, i=3→2, ..., i=0→5
      page.style.zIndex = (total - i);
      const content = document.createElement('div');
      content.className = 'page-content';
      content.innerHTML = data.html;
      page.appendChild(content);
      book.appendChild(page);
    }
    updateNav();
    // ページを描画した後に翻訳を適用（表紙などに翻訳が含まれる場合）
    if (typeof applyTranslations === 'function') {
      applyTranslations();
    }
  }
  /**
   * 次のページにめくる
   */
  function flipNext() {
    const total = currentIssuePages.length;
    if (currentPageIndex >= total) return;
    const pages = book.querySelectorAll('.page');
    // ページは逆順で配置されているため、対象ページは下から currentPageIndex 番目
    const target = pages[pages.length - 1 - currentPageIndex];
    target.classList.add('flipped');
    currentPageIndex++;
    updateNav();
  }
  /**
   * 前のページに戻る
   */
  function flipBack() {
    if (currentPageIndex <= 0) return;
    currentPageIndex--;
    const pages = book.querySelectorAll('.page');
    const target = pages[pages.length - 1 - currentPageIndex];
    target.classList.remove('flipped');
    updateNav();
  }
  /**
   * ナビゲーション矢印の表示状態を更新
   */
  function updateNav() {
    if (!prevArrow || !nextArrow) return;
    prevArrow.style.display = currentPageIndex === 0 ? 'none' : 'block';
    // 最後のページ（裏表紙）に到達したら次ボタンを非表示にする
    const total = currentIssuePages.length;
    nextArrow.style.display = currentPageIndex >= total - 1 ? 'none' : 'block';
  }
  /**
   * ビューワーを閉じる
   */
  function closeViewer() {
    // クラス状態をリセットしてから非表示にする
    const pages = book.querySelectorAll('.page');
    pages.forEach((p) => p.classList.remove('flipped'));
    viewer.style.display = 'none';
  }
});