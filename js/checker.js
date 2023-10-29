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

  document.querySelectorAll('.perform').forEach((button) => {
    button.addEventListener('click', async (e) => {
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
        write(`<button type="button" class="validator" onclick="document.forms['html-check-form'].submit();return false;">Validatorを開く</button>`, true);
      }
      else {
        write(`<span class="blue">エラーはありません</span>`, true);
      }

      comment('■CSSエラーチェック');
      errorMessage = await css_error_check();
      if (errorMessage) {
        write(`<span class="red">${errorMessage}</span>`, true);
        write(`<button type="button" class="validator" onclick="document.forms['css-check-form'].submit();return false;">Validatorを開く</button>`, true);
      }
      else {
        write(`<span class="blue">エラーはありません</span>`, true);
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
      const content = doc.querySelector('meta[name="description"')?.content;
      if (meta_description === content) {
        write('description...<span class="blue">OK</span>', true);
      }
      else {
        write('description...<span class="red">NG</span>', true);
        write(content);
      }

      comment('■title', '完全一致が求められています。');
      const title = doc.querySelector('title')?.innerText;
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
      if (results[0].tagName != 'H1') {
        write('<span class="blue">最初がh1ではありません。</span>', true);
      }
      let h1count = 0;
      let savedLevel = 0;
      results.forEach((ele) => {
        const level = ele.tagName.slice(-1) - 0;
        if (level === 1) h1count++;

        const re = ele.outerHTML
          .replaceAll('<', '&lt;').replaceAll('>', '&gt;')
          .replace(/&lt;h[1-6].*?&gt;/i, '<span class="red">$&</span>')
          .replace(/&lt;\/h[1-6]&gt;/i, '<span class="red">$&</span>');
        const added = (savedLevel < level && ((level - savedLevel) !== 1)) ? '　<span class="blue">（飛んでいます）</span>' : '';
        write(re + added, true);

        savedLevel = level;
      });
      if (h1count > 1) {
        write('<span class="blue">h1が1つではありません。</span>', true);
      }
      comment('■改行チェック', '文中の強制改行はNGです。');
      results = doc.querySelectorAll('br');
      results.forEach((ele) => {
        const re = ele.parentElement.outerHTML
          .replaceAll('<', '&lt;').replaceAll('>', '&gt;')
          .replace(/&lt;br.*?&gt;/i, '<span class="red">$&</span>');
        write(re, true);
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

      comment('■チェック終了');
      result.style.display = 'block';
    });
  });

  document.getElementById('CHECK_LIST_DOWNLOAD').addEventListener('click', (e) => {
    e.preventDefault();

    html2canvas(document.querySelector('#messages .tables')).then((canvas) => {
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = "CHECK_LIST_" + (new Date).toLocaleString().replaceAll(/[\/: ]/g,'_') + ".png";
      link.click();
    });

  });
  document.getElementById('CHECK_DETAILS_DOWNLOAD').addEventListener('click', (e) => {
    e.preventDefault();

    html2canvas(document.querySelector('#messages .details')).then((canvas) => {
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = "CHECK_DETAILS_" + (new Date).toLocaleString().replaceAll(/[\/: ]/g,'_') + ".png";
      link.click();
    });    
  });
})();