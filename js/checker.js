"use strict";

(() => {

  const meta_description = 'Kira-Kira English(キラキライングリッシュ)は、お子様向けのオンライン英会話教室です。0歳から15歳までのお子様向けに楽しく学べて“使える英語力”が身につき幅広いレッスンが受講でき、家族割やきょうだい割も大好評！ご希望に合わせて英語検定受験コース、高校受験向けコースも開講しています。';
  const head_title = 'Kira-Kira English｜キラキライングリッシュ キッズオンライン英会話教室';

  const createElementFromHTML = (html) => {
    const tempEl = document.createElement('div');
    tempEl.innerHTML = html;
    return tempEl.firstElementChild;
  };

  const comment = (s, t) => {
    const span = document.createElement('span');
    span.classList.add('comment');
    span.append(s);
    result.append(span);

    if (t) {
      const ss = document.createElement('span');
      ss.classList.add('desc');
      result.append('\n');
      ss.append(t);
      result.append(ss);
    }

    result.append('\n\n');
  };

  const write = (s, f) => {
    if (f) {
      const tempel = createElementFromHTML('<span>' + s + '<span>');
      result.append(tempel);
      result.append('\n\n');
    }
    else {
      result.append(s + '\n\n');
    }
  };

  const numbering = (source) => {
    let t = '';
    let c = 0;
    source.forEach((row) => {
      c++;
      t = t + (('00000' + c).slice(-6)) + ':' + row + '\n';
    });
    return t;
  };

  const html_error_check = async () => {
    const source = document.getElementById('html').value;
    const headers = {
      'Content-Type': 'text/html'
    };

    let res;
    try {
      res = await fetch('https://validator.w3.org/nu/?out=json', {
        method: 'POST',
        headers,
        body: source,
      });
    }
    catch (ex) {
      console.error(ex);
      return 'エラーチェックが失敗しました';
    }

    const data = await res.json();
    if (data?.messages && data.messages.length == 0) {
      return null;
    }
    else if (data?.messages) {
      let isError = false;
      data.messages.forEach((mes) => {
        if (mes.type == 'error') {
          isError = true;
        }
      });
      if (isError) {
        return 'エラーがあります';
      }
    }
    else {
      return 'なんか正しくないです';
    }
  };


  const css_error_check = async () => {
    const source = document.getElementById('css').value;
    const body = new FormData;
    body.append('profile', 'css3svg');
    body.append('lang', 'ja');
    body.append('output', 'json');
    body.append('text', source);

    let res;
    try {
      res = await fetch('https://jigsaw.w3.org/css-validator/validator', {
        method: 'POST',
        body
      });
    }
    catch (ex) {
      console.error(ex);
      return 'エラーチェックが失敗しました';
    }

    const data = await res.json();
    if (data?.cssvalidation?.result?.hasOwnProperty('errorcount')) {
      if (data.cssvalidation.result.errorcount === 0) {
        return null;
      }
      return 'エラーがあります';
    }
    else {
      return 'なんか正しくないです';
    }
  };

  const result = document.getElementById('result');

  const buttonOnClick = async () => {
    const row_html = document.getElementById('html').value;
    const html = numbering(row_html.split(/\n/));
    const css = numbering(document.getElementById('css').value.split(/\n/));
    const js = numbering(document.getElementById('js').value.split(/\n/));

    result.innerHTML = '';

    const doc = document.implementation.createHTMLDocument("").documentElement;
    doc.innerHTML = row_html;

    let results;
    let errorMessage = '';

    comment('■HTMLエラーチェック');
    errorMessage = await html_error_check();
    if (errorMessage) {
      write(`<span class="red">${errorMessage}</span>`, true);
      // write(`<button type="button" class="validator" onclick="document.forms['html-check-form'].submit();return false;">Validatorを開く</button>`, true);
    }
    else {
      write(`<span class="blue">エラーはありません</span>`, true);
    }

    comment('■CSSエラーチェック');
    errorMessage = await css_error_check();
    if (errorMessage) {
      write(`<span class="red">${errorMessage}</span>`, true);
      // write(`<button type="button" class="validator" onclick="document.forms['css-check-form'].submit();return false;">Validatorを開く</button>`, true);
    }
    else {
      write(`<span class="blue">エラーはありません</span>`, true);
    }

    comment('■Googleフォントチェック', 'Noto Sans JPの400,700または100..900、Poppinsの通常700,800,斜体700,800または通常・斜体の全てが必要です。');
    const googleFonts = doc.querySelectorAll('link[href^="https://fonts.googleapis.com/"]');
    let fontFamilyError = false;
    if (googleFonts.length === 0) {
      write(`<span class="red">linkタグがありません</span>`, true);
      fontFamilyError = true;
    }
    if (googleFonts.length > 1) {
      write(`<span class="red">linkタグが複数あります</span>`, true);
      fontFamilyError = true;
    }
    let googleFontNotoSansOK = false;
    let googleFontPoppinsOK = false;
    googleFonts.forEach((ele) => {
      const url = new URL(ele.href);
      const families = url.searchParams.getAll('family');
      for (let f of families) {
        if (f.match('Noto Sans JP')) {
          googleFontNotoSansOK = (f == 'Noto Sans JP:wght@400;700' || f == 'Noto Sans JP:wght@100..900');
        }
        if (f.match('Poppins')) {
          googleFontPoppinsOK = (
            f == 'Poppins:ital,wght@0,700;0,800;1,700;1,800' ||
            f == 'Poppins:ital,wght@0,100;0,200;0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,100;1,200;1,300;1,400;1,500;1,600;1,700;1,800;1,900'
          );
        }
      }
    });
    if (!googleFontNotoSansOK) {
      write(`<span class="red">Noto Sans JPの読み込みが正しくありません</span>`, true);
      fontFamilyError = true;
    }
    if (!googleFontPoppinsOK) {
      write(`<span class="red">Poppinsの読み込みが正しくありません</span>`, true);
      fontFamilyError = true;
    }
    if (fontFamilyError) {
      let linkTag = '';
      googleFonts.forEach((ele) => {
        linkTag += ele.outerHTML + '\n';
      });
      write(linkTag);
    }
    else {
      write('<span class="blue">Googleフォント...OK</span>', true);
    }

    comment('■HTMLのコメント');
    results = [...html.matchAll(/.*<!--[\s\S]+?-->/g)];
    results.forEach((ele) => {
      write(ele[0]);
    });

    comment('■CSSのコメント');
    results = [...css.matchAll(/.*\/\*[\s\S]+?\*\//g)];
    results.forEach((ele) => {
      write(ele[0]);
    });

    comment('■JavaScriptのコメント');
    results = [...js.matchAll(/.*\/\*[\s\S]+?\*\//g), ...js.matchAll(/.*\/\/.+/g)];
    results.forEach((ele) => {
      write(ele[0]);
    });

    comment('■meta description', '完全一致が求められています。');
    const content = doc.querySelector('meta[name="description"]')?.content?.trim();
    if (meta_description === content) {
      write('description...<span class="blue">OK</span>', true);
    }
    else {
      write('description...<span class="red">NG</span>', true);
      write(content);
    }

    comment('■title', '完全一致が求められています。');
    const title = doc.querySelector('title')?.innerText?.trim();
    if (head_title === title) {
      write('title...<span class="blue">OK</span>', true);
    }
    else {
      write('title...<span class="red">NG</span>', true);
      write(title);
    }

    comment('■必須タグ');
    if (doc.querySelectorAll('header').length) {
      write('header...<span class="blue">OK</span>', true);
    }
    else {
      write('header...<span class="red">NG</span>', true);
    }
    if (doc.querySelectorAll('nav').length) {
      write('nav...<span class="blue">OK</span>', true);
    }
    else {
      write('nav...<span class="red">NG</span>', true);
    }
    if (doc.querySelectorAll('main').length) {
      write('main...<span class="blue">OK</span>', true);
    }
    else {
      write('main...<span class="red">NG</span>', true);
    }
    if (doc.querySelectorAll('section').length) {
      write('section...<span class="blue">OK</span>', true);
    }
    else {
      write('section...<span class="red">NG</span>', true);
    }
    if (doc.querySelectorAll('footer').length) {
      write('footer...<span class="blue">OK</span>', true);
    }
    else {
      write('footer...<span class="red">NG</span>', true);
    }

    comment('■見出しタグ', 'h1から始まり、順序を飛ばさずh2→h3の順で使用します。');
    results = doc.querySelectorAll('h1,h2,h3,h4,h5,h6');
    let h1count = doc.querySelectorAll('h1').length;
    if (h1count === 0) {
      write('<span class="blue">h1がありません。</span>', true);
    }
    else {
      if (h1count > 1) {
        write('<span class="blue">h1が1つではありません。</span>', true);
      }
      if (results[0].tagName != 'H1') {
        write('<span class="blue">最初がh1ではありません。</span>', true);
      }
    }
    let savedLevel = 0;
    results.forEach((ele) => {
      const level = ele.tagName.slice(-1) - 0;
      const re = ele.outerHTML
        .replaceAll('<', '&lt;').replaceAll('>', '&gt;').replace(/\n +/g, '\n')
        .replace(/&lt;h[1-6].*?&gt;/i, '<span class="red">$&</span>')
        .replace(/&lt;\/h[1-6]&gt;/i, '<span class="red">$&</span>');
      const added = (savedLevel < level && ((level - savedLevel) !== 1)) ? '　<span class="blue">（飛んでいます）</span>' : '';
      write(re + added, true);

      savedLevel = level;
    });
    comment('■改行チェック', '文中の強制改行はNGです。');
    results = doc.querySelectorAll('br');
    let parentElements = [];
    results.forEach((ele) => {
      const pa = ele.parentElement;
      if (parentElements.indexOf(pa) < 0) {
        parentElements.push(pa);
        const re = pa.outerHTML
          .replaceAll('<', '&lt;').replaceAll('>', '&gt;').replace(/\n +/g, '\n')
          .replace(/&lt;br.*?&gt;/ig, '<span class="red">$&</span>');
        write(re, true);
      }
    });

    comment('■alt属性チェック', 'スクリーンリーダーで読ませた時に違和感が出ないようにします。文字が画像化されている時は、変更せずにaltに適用します。');
    results = doc.querySelectorAll('img');
    results.forEach((ele) => {
      const re = ele.outerHTML
        .replaceAll('<', '&lt;').replaceAll('>', '&gt;')
        .replace(/&lt;img .+?&gt;/i, '<span class="blue">$&</span>')
        .replace(/alt="[^"]*?"/i, '<span class="red">$&</span>');
      write(re, true);
    });

    comment('■id属性チェック');
    results = doc.querySelectorAll('[id]');
    results.forEach((ele) => {
      const re = ele.outerHTML.split('\n')[0]
        .replaceAll('<', '&lt;').replaceAll('>', '&gt;')
        .replace(/ id="[^"]*?"/i, '<span class="red">$&</span>');
      write(re, true);
    });

    comment('■リンクチェック');
    results = doc.querySelectorAll('a');
    results.forEach((ele) => {
      const re = ele.outerHTML
        .replaceAll('<', '&lt;').replaceAll('>', '&gt;')
        .replace(/&lt;a\s[\s\S]*?&gt;/i, '<span class="blue">$&</span>')
        .replace(/ href="[^"]*"/i, '<span class="red">$&</span>');
      write(re, true);
    });

    comment('■hoverチェック');
    results = [...css.matchAll(/.*:hover.*/g)];
    results.forEach((ele) => {
      write(ele[0]);
    });

    comment('■positionプロパティチェック');
    results = [...css.matchAll(/.*\sposition\s*:.*/g)];
    results.forEach((ele) => {
      write(ele[0]);
    });

    comment('■ネガティブマージンチェック', 'ネガティブマージンは極力使わないようにします。');
    results = [...css.matchAll(/.*\s*margin[^:]*\s*:\s*-[.\d]+.*/g)];
    results.forEach((ele) => {
      write(ele[0]);
    });

    comment('■transformプロパティチェック', '過度のtransformプロパティの利用がないかチェックしてください。');
    results = [...css.matchAll(/.*\stransform\s*:.*/g)];
    results.forEach((ele) => {
      write(ele[0]);
    });

    comment('■slickチェック', 'autoplayにtrueが設定されているか？');
    if (document.getElementById('slick').value == 1) {
      write('<span class="blue">OK</span>', true);
    }
    else {
      write('<span class="red">NG</span>', true);
    }

    comment('■チェック終了');
    result.style.display = 'block';
  };

  document.querySelectorAll('.perform').forEach((button) => {
    button.addEventListener('click', buttonOnClick);
  });

  document.getElementById('CHECK_LIST_DOWNLOAD').addEventListener('click', (e) => {
    e.preventDefault();

    html2canvas(document.querySelector('#messages .tables')).then((canvas) => {
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = "CHECK_LIST_" + (new Date).toLocaleString().replaceAll(/[\/: ]/g, '_') + ".png";
      link.click();
    });

  });
  document.getElementById('CHECK_DETAILS_DOWNLOAD').addEventListener('click', (e) => {
    e.preventDefault();

    html2canvas(document.querySelector('#messages .details')).then((canvas) => {
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = "CHECK_DETAILS_" + (new Date).toLocaleString().replaceAll(/[\/: ]/g, '_') + ".png";
      link.click();
    });
  });

  // アンドゥ機能とインタラクティブ要素管理
  const UndoManager = {
    history: [],
    maxHistorySize: 50,

    pushState(element, action) {
      this.history.push({
        element,
        action,
        timestamp: Date.now()
      });

      if (this.history.length > this.maxHistorySize) {
        this.history.shift();
      }
    },

    undo() {
      if (this.history.length === 0) {
        showToast('元に戻せる操作がありません', 'info');
        return false;
      }

      const lastState = this.history.pop();
      if (lastState.action === 'delete') {
        lastState.element.classList.remove('deleted');
        showToast('削除を元に戻しました', 'info');
      }
      return false;
    }
  };

  // トーストメッセージ表示
  function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    toastContainer.appendChild(toast);

    // アニメーション開始
    setTimeout(() => {
      toast.classList.add('show');
    }, 10);

    // 3秒後に削除
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentElement) {
          toast.parentElement.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }

  // 削除アニメーション
  function deleteElementWithAnimation(element, actionType = '要素') {
    if (element.classList.contains('deleting')) {
      return; // 既に削除中の場合は何もしない
    }

    // アンドゥ用の状態を保存
    UndoManager.pushState(element, 'delete');

    element.classList.add('deleting');

    setTimeout(() => {
      if (element.parentElement) {
        // element.remove();
        element.classList.add('deleted');
        element.classList.remove('deleting');
        showToast(`${actionType}を削除しました`);
      }
    }, 500);
  }

  // 連続削除防止

  let lastDeleteTime = 0;
  const DELETE_COOLDOWN = 700; // 700ms

  function canDelete() {
    const now = Date.now();
    if (now - lastDeleteTime < DELETE_COOLDOWN) {
      showToast('削除操作が早すぎます。少し待ってから再度お試しください。', 'error');
      return false;
    }
    lastDeleteTime = now;
    return true;
  }

  // 要素にイベントリスナーを追加
  function processEventListener(event) {
    const element = event.target;
    const type = event.type;

    if (type == "dblclick" && element.closest('.head')) {
      if (canDelete()) {
        deleteElementWithAnimation(element.closest('.table'), 'テーブル行');
      }
      return;
    }
    // if (type == "click" && element.closest('.body')) {
    //   if (canDelete()) {
    //     deleteElementWithAnimation(element.closest('.row'), '行');
    //   }
    //   return;
    // }
    if (type == "dblclick" && element.classList.contains('datum')) {
      if (canDelete()) {
        deleteElementWithAnimation(element, '詳細ブロック');
      }
      return;
    }
    if (type == "dblclick" && element.children[0]?.tagName === 'IMG') {
      if (canDelete()) {
        const tmpElement = element.closest('.datum');
        deleteElementWithAnimation(tmpElement, '詳細ブロック');
      }
      return;
    }
    // if (element.classList.contains('detail-text') && type == 'click') {
    //   if (canDelete()) {
    //     deleteElementWithAnimation(element, '詳細要素');
    //   }
    //   return;
    // }
    if (element.tagName === 'IMG' && type == 'click') {
      if (canDelete()) {
        deleteElementWithAnimation(element.closest('div'), '詳細要素');
      }
      return;
    }
  }

  // キーボードショートカット（Command/Ctrl + Z）
  document.addEventListener('keydown', (e) => {
    console.log(e);
    if ((e.metaKey || e.ctrlKey) && e.key === 'Z' && e.shiftKey) {
      e.preventDefault();
      UndoManager.undo();
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('#messages').addEventListener('click', processEventListener);
    document.querySelector('#messages').addEventListener('dblclick', processEventListener);
  });

})();