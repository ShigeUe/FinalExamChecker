let ROOT_BODY;
let debuggee;
let attached = false;

let results;
let result_messages;
let color_messages;

let MODEL_DATA;
let METRICS;

chrome.debugger.onDetach.addListener(() => {
  attached = false;
});

const PANEL = {
  element: document.getElementById("messages"),
  add: function (str, type) {
    const div = document.createElement("div");
    if (str) {
      div.innerText = str;
    } else {
      div.innerHTML = "&nbsp;";
    }

    if (type == "error" || type == "info" || type == "title") {
      div.classList.add(type);
    }
    this.element.append(div);
  },
  table: function (header, body1, body2, emphasises) {
    const table = document.createElement("div");
    table.classList.add('table');
    const thead = document.createElement("div");
    thead.classList.add('head');
    const tbody = document.createElement("div");
    tbody.classList.add('body');
    const h_tr = document.createElement("div");
    h_tr.classList.add('row');
    const b1_tr = document.createElement("div");
    b1_tr.classList.add('row');
    b1_tr.classList.add("model");
    const b2_tr = document.createElement("div");
    b2_tr.classList.add('row');

    for (let i = 0; i < body1.length; i++) {
      const th = document.createElement("div");
      th.classList.add('col');
      const td1 = document.createElement("div");
      td1.classList.add('col');
      const td2 = document.createElement("div");
      td2.classList.add('col');

      // エラーを強調する
      if (emphasises.indexOf(i + 1) >= 0) {
        td2.classList.add('em');
      }

      th.innerText = (header[i]) ?? "";
      td1.innerText = body1[i];
      td2.innerText = body2[i];
      h_tr.append(th);
      b1_tr.append(td1);
      b2_tr.append(td2);
    }
    thead.append(h_tr);
    tbody.append(b1_tr);
    tbody.append(b2_tr);
    table.append(thead, tbody);

    table.addEventListener("mouseenter", async function (e) {
      const col = this.querySelector('.head .row .col:first-child');
      const nodeId = col.innerText.match(/\d+/)?.at(0) - 0;
      if (attached && nodeId) {
        await chrome.debugger.sendCommand(debuggee, "DOM.scrollIntoViewIfNeeded", { nodeId });
        await chrome.debugger.sendCommand(debuggee, "Overlay.highlightNode", { highlightConfig: HIGHLIGHTCONFIG, nodeId });
      }
    });  
    table.addEventListener("mouseleave", async function (e) {
      if (attached) {
        await chrome.debugger.sendCommand(debuggee, "Overlay.hideHighlight");
      }
    });

    this.element.append(table);
  },
  reset: function () {
    this.element.innerHTML = "";
  },
  emptyLine: function () {
    this.add(null);
  },
};

const findProperty = (properties, needle) => {
  return properties.find((el) => {
    return (el.name == needle);
  });
};

const findNodeById = (id, node) => {
  if (!node) {
    node = ROOT_BODY;
  }
  if (node.children) {
    for (n of node.children) {
      if (n.nodeId == id) {
        return n;
      } else {
        const ret = findNodeById(id, n);
        if (ret) {
          return ret;
        }
      }
    }
  }
  return null;
};

const getFirstFontName = (fontFamily) => {
  return fontFamily.replaceAll('"', "").split(",").at(0).trim();
};

const wait = (t) => {
  return new Promise((f) => {
    setTimeout(f, t);
  }, () => {});
};

const rgb2hex = (rgb) => {
  const s = rgb.match(/\d+/g);
  if (s.length !== 3) {
    return '#000000';
  }
  return '#' + s.map((e) => ("0" + (e - 0).toString(16)).substr(-2, 2)).join('');
};


const calculateOverlapArea = (rect1, rect2) => {
  // 1つ目の矩形の座標を取得
  const [x1_1, y1_1, x2_1, y2_1] = rect1;

  // 2つ目の矩形の座標を取得
  const [x1_2, y1_2, x2_2, y2_2] = rect2;

  // 重なっている領域の左上隅の座標を計算
  const x1_overlap = Math.max(x1_1, x1_2);
  const y1_overlap = Math.max(y1_1, y1_2);

  // 重なっている領域の右下隅の座標を計算
  const x2_overlap = Math.min(x2_1, x2_2);
  const y2_overlap = Math.min(y2_1, y2_2);

  // 重なっている面積を計算
  const width_overlap = x2_overlap - x1_overlap;
  const height_overlap = y2_overlap - y1_overlap;

  // 重なっている面積が正の値であれば、重なっている領域が存在します
  if (width_overlap > 0 && height_overlap > 0) {
    return width_overlap * height_overlap;
  } else {
    return 0; // 重なっている領域が存在しない場合
  }
};

const getOutsideBox = (quads) => {
  if (quads.length == 1) {
    return [quads[0][0], quads[0][1], quads[0][4], quads[0][5]];
  }
  let left = Number.MAX_SAFE_INTEGER, top = Number.MAX_SAFE_INTEGER, right = 0, bottom = 0;
  for (q of quads) {
    left = (q[0] < left) ? q[0] : left;
    top = (q[1] < top) ? q[1] : top;
    right = (q[4] > right) ? q[4] : right;
    bottom = (q[5] > bottom) ? q[5] : bottom;
  }
  return [left, top, right, bottom];
};


const startDebugger = async () => {
  debuggee = { tabId: chrome.devtools.inspectedWindow.tabId };

  try {
    await chrome.debugger.attach(debuggee, "1.3");
  } catch (e) {
    PANEL.add(
      "Debuggerを開始できません。\n一度リロードし、デベロッパーツールを再表示してください。",
      "error",
    );
    return false;
  }

  await chrome.debugger.sendCommand(debuggee, "DOM.enable");
  await chrome.debugger.sendCommand(debuggee, "CSS.enable");
  await chrome.debugger.sendCommand(debuggee, "Page.enable");
  await chrome.debugger.sendCommand(debuggee, "Overlay.enable");

  const { root } = await chrome.debugger.sendCommand(
    debuggee,
    "DOM.getDocument",
    { depth: -1 },
  );
  ROOT_BODY = root.children[1].children[1];

  // metricsを取得する
  METRICS = await chrome.debugger.sendCommand(debuggee, "Page.getLayoutMetrics");

  if (METRICS.contentSize.width != 1536 && METRICS.contentSize.width != 390) {
    PANEL.add("ウィンドウサイズは390pxか1536pxにしてください。（検出サイズ：" + METRICS.contentSize.width +"）", "error");
    return false;
  }
  if (METRICS.contentSize.width == 1536) {
    MODEL_DATA = MODEL_DATA_PC;
  }
  if (METRICS.contentSize.width == 390) {
    MODEL_DATA = MODEL_DATA_SP;
  }
  return true;
};

const DEBUG_SCRIPT = async () => {
  results = [];
  result_messages = '';

  const allFonts = {};
  const findNodesThatContainText = async (nodeOrg) => {
    const node = { ...nodeOrg }; // コピー
    if (!node.nodeValue && !node.childNodeCount && !node.pseudoType) {
      return;
    }
    if ((node.nodeValue && node.nodeName != "#comment") || node.pseudoType) {
      // 親要素を取得して、タグ名や属性値でスキップする
      let parentNode;
      if (node.pseudoType) {
        parentNode = { ...node }; // コピー
      } else {
        parentNode = findNodeById(node.parentId);
      }
      if (parentNode) {
        if (
          parentNode.nodeName === "SCRIPT" ||
          parentNode.nodeName === "NOSCRIPT" ||
          parentNode.nodeName === "STYLE" ||
          parentNode.attributes && parentNode.attributes.find((a) => a.match(/^slick-slide-control/))
        ) {
          return;
        }
      }

      const { quads } = await chrome.debugger.sendCommand(
        debuggee,
        "DOM.getContentQuads",
        { nodeId: node.nodeId },
      );
      // 見えていない（quadsが無い）要素は飛ばす
      if (!quads.length) {
        return;
      }

      // 左上、右下のboxを定義
      const box = getOutsideBox(quads);
      // 適用されているFontを取得
      const { fonts } = await chrome.debugger.sendCommand(
        debuggee,
        "CSS.getPlatformFontsForNode",
        { nodeId: node.nodeId },
      );
      // 計算済スタイルを取得
      const { computedStyle } = await chrome.debugger.sendCommand(
        debuggee,
        "CSS.getComputedStyleForNode",
        { nodeId: node.parentId ?? node.nodeId },
      );
      // 疑似要素の場合、contentをnodeValueにする
      if (node.pseudoType) {
        node.nodeValue = findProperty(computedStyle, "content").value;
      }
      const property = {
        color: findProperty(computedStyle, "color").value,
        fontSize: findProperty(computedStyle, "font-size").value,
        fontWeight: findProperty(computedStyle, "font-weight").value,
        fontStyle: findProperty(computedStyle, "font-style").value,
        fontFamily: findProperty(computedStyle, "font-family").value,
        isWebFont: true,
      };
      if (fonts.length) {
        for (let font of fonts) {
          if (font.isCustomFont) {
            allFonts[font.familyName + " - Webフォント"] = font.isCustomFont;
          } else {
            // await chrome.debugger.sendCommand(debuggee, 'DOM.setAttributeValue', {
            //   nodeId: node.parentId,
            //   name: 'style',
            //   value: 'background-color: rgba(255,0,0,0.5)'
            // });
            allFonts[font.familyName + " - ローカルフォント"] = font.isCustomFont;
            property.isWebFont = false;
          }
        }
      }
      // console.log(node.nodeId, parentNode,node.nodeValue, property);
      const nodeValue = node.nodeValue.trim();
      results.push({ nodeId: node.nodeId, nodeValue, box, property});
    }
    if (node.childNodeCount) {
      for (let i = 0; i < node.childNodeCount; i++) {
        await findNodesThatContainText(node.children[i]);
      }
    }
    if (node.pseudoElements) {
      for (let i = 0; i < node.pseudoElements.length; i++) {
        await findNodesThatContainText(node.pseudoElements[i]);
      }
    }
  };

  for (let node of ROOT_BODY.children) {
    await findNodesThatContainText(node);
  }

  // console.log(JSON.stringify(results));

  PANEL.add("適用フォント一覧", "title");

  for (let key in allFonts) {
    if (key.match(/ローカルフォント/)) {
      PANEL.add(key, "error");
    } else {
      PANEL.add(key);
    }
  }

  PANEL.emptyLine();
  PANEL.add("slickのオプションチェック", "title");

  let slick = false;
  await (async () => {
    return new Promise((resolve) => {
      chrome.devtools.inspectedWindow.eval(
        `$('.slick-list').parent().slick('slickGetOption', 'autoplay')`,
        (result) => {
          if (result) {
            PANEL.add('autoplayにtrueが設定されています。');
            slick = true;
          }
          else {
            PANEL.add('autoplayにtrueが設定されていません。', 'error');
          }
          resolve();
        }
      );  
    });
  })();

  PANEL.emptyLine();
  PANEL.add("テキスト要素比較", "title");
  PANEL.add('どこかに差異があるテキスト要素を一覧します。');
  PANEL.add('各ボックスにホバーすると、その要素にフォーカスします。');
  for (const datum of MODEL_DATA) {
    let found = null;

    for (const el of results) {
      const { nodeValue, box, property } = el;
      const overlapArea = calculateOverlapArea(datum.box, box);
      // 重なり合っているかつ相互に文字が含まれている場合
      if (overlapArea > 0 && (nodeValue.match(datum.nodeValue.trim()) || datum.nodeValue.match(nodeValue.trim()))) {
        // 対象文字が1文字の場合は、完全一致以外は次へ
        if (nodeValue.trim().length == 1 && datum.nodeValue.trim() != nodeValue.trim()) {
          continue;
        }
        found = el;
        const emphasises = [];

        let element_messages = '';
        if (property.color != datum.property.color) {
          emphasises.push(2);
          element_messages += '文字色が違います（コードは' + rgb2hex(property.color) + 'ですがカンプは' + rgb2hex(datum.property.color) + '）<br>';
        }
        if (property.fontSize != datum.property.fontSize) {
          emphasises.push(3);
          element_messages += '文字の大きさが違います（コードは' + property.fontSize + 'ですがカンプは' + datum.property.fontSize + '）<br>';
        }
        if (property.fontWeight != datum.property.fontWeight) {
          emphasises.push(4);
          element_messages += '文字の太さが違います（コードは' + property.fontWeight + 'ですがカンプは' + datum.property.fontWeight + '）<br>';
        }
        if (property.fontStyle != datum.property.fontStyle) {
          emphasises.push(5);
          element_messages += '文字のスタイルが違います（コードは' + property.fontStyle + 'ですがカンプは' + datum.property.fontStyle + '）<br>';
        }
        if (getFirstFontName(property.fontFamily)?.toLowerCase() != datum.property.fontFamily.toLowerCase()) {
          emphasises.push(6);
          element_messages += 'フォントが違います（コードは' + getFirstFontName(property.fontFamily) + 'ですがカンプは' + datum.property.fontFamily + '）<br>';
        }
        if (!property.isWebFont) {
          emphasises.push(7);
          element_messages += 'Webフォントではありません<br>';
        }
        if ( emphasises.length > 0 ) {
          // 要素のキャプチャを取得
          const captureParam = {
            "format": "png", "quality": 100, "fromSurface": true, "captureBeyondViewport": true,
            "clip": {
              "x": (box[0] - 20), "y": (box[1] - 20),
              "width": (box[2] - box[0]) + 40, "height": (box[3] - box[1]) + 40,
              "scale": 1
            }
          }
          const capture = await chrome.debugger.sendCommand(debuggee, 'Page.captureScreenshot', captureParam);
          if (capture) {
            element_messages = '<img src="data:image/png;base64,' + capture.data + '"><br>' + element_messages;
            // デバッグ用Box情報
            // element_messages += box.toString() + '<br>';
          }
          result_messages += '<div class="datum"><p>「' + nodeValue + '」</p>\n<p>' + element_messages + '</p></div>\n';

          PANEL.table(
            [
              `内容 (${el.nodeId})`, "color", "font-size", "font-weight", "font-style", "font-family", "Webフォントか",
            ],
            [
              datum.nodeValue, rgb2hex(datum.property.color), datum.property.fontSize, datum.property.fontWeight,
              datum.property.fontStyle, datum.property.fontFamily, "",
            ],
            [
              nodeValue, rgb2hex(property.color), property.fontSize, property.fontWeight, property.fontStyle,
              getFirstFontName(property.fontFamily), property.isWebFont ? 'はい' : 'いいえ',
            ],
            emphasises
          );
        }
        break;
      }
    }
    if (!found) {
      result_messages += '<div class="datum"><p>「' + datum.nodeValue + '」</p>\n<p>要素が取得できません。</p></div>\n';
      PANEL.table(
        [
          "内容", "color", "font-size", "font-weight", "font-style", "font-family", "Webフォントか",
        ],
        [
          datum.nodeValue, datum.property.color, datum.property.fontSize, datum.property.fontWeight,
          datum.property.fontStyle, datum.property.fontFamily, "",
        ],
        [ '要素が取得できません', '', '', '', '', '', '', ],
        []
      );
    }
  }

  return slick;
  // await chrome.debugger.detach(debuggee);
};

const num2hex = (num) => {
  const hex = num.toString(16);
  return (hex.length == 1) ? "0" + hex : hex;
};

const getImageFromScreen = async () => {
  // 画面を最大化する
  await chrome.debugger.sendCommand(debuggee, "Emulation.setDeviceMetricsOverride",
    {
      width: METRICS.contentSize.width,
      height: METRICS.contentSize.height,
      deviceScaleFactor: 1,
      mobile: true,
      screenHeight: METRICS.contentSize.height
    });

  // キャプチャ
  const capture = await chrome.debugger.sendCommand(debuggee, "Page.captureScreenshot");

  // 画面を戻す
  await chrome.debugger.sendCommand(debuggee, "Emulation.setDeviceMetricsOverride",
    {
      width: METRICS.cssLayoutViewport.clientWidth,
      height: METRICS.cssLayoutViewport.clientHeight,
      deviceScaleFactor: 1,
      mobile: true,
      screenHeight: METRICS.cssLayoutViewport.clientHeight
    });

  const img = document.createElement("img");
  img.src = "data:image/png;base64," + capture.data;
  
  return new Promise((resolve) => {
    img.onload = () => {
      resolve(img);
    };
  });
}


const colorCheck = async () => {
  const colorTable = [
    { title:"ヘッダー",              x: 430,y:  50,color:"0079f2" },
    { title:"ボタン背景色",          x: 660,y: 965,color:"f11f8d" },
    { title:"キャンペーン",          x: 160,y:1200,color:"f2f8fe" },
    { title:"コース案内ボタン選択色",x: 300,y:1630,color:"f2a118" },
    { title:"コース案内ボタン",      x: 650,y:1630,color:"f0f0f0" },
    { title:"コース案内ボタン",      x:1000,y:1630,color:"f0f0f0" },
    { title:"コース案内枠",          x: 300,y:1685,color:"ffedcc" },
    { title:"コース下の水色",        x: 160,y:2200,color:"f2f8fe" },
    { title:"3つの特色下の水色",     x: 160,y:4000,color:"f2f8fe" },
    { title:"講師紹介ケント",        x: 450,y:4440,color:"ffeee5" },
    { title:"講師紹介ナンシー",      x: 850,y:4440,color:"fff6e5" },
    { title:"講師紹介下の水色",      x: 160,y:5000,color:"f2f8fe" },
    { title:"料金プラン表の見出し",  x: 435,y:5360,color:"f5f5f5" },
    { title:"料金プラン表の見出し",  x: 435,y:5810,color:"f5f5f5" },
    { title:"料金プラン下の水色",    x: 450,y:6400,color:"f2f8fe" },
    { title:"よくあるご質問のA部分", x: 360,y:6890,color:"ffeee5" },
    { title:"よくあるご質問下の水色",x: 150,y:7850,color:"f2f8fe" },
    { title:"フッターの帯",          x: 150,y:8050,color:"222222" },
  ];

  const canvas = document.createElement("canvas");
  canvas.width = METRICS.contentSize.width;
  canvas.height = METRICS.contentSize.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });

  const img = await getImageFromScreen();
  context.drawImage(img, 0, 0);

  
  color_messages = '';

  PANEL.emptyLine();
  PANEL.add("背景色のチェック", "title");

  let error = false;
  for (let item of colorTable) {
    const c = context.getImageData(item.x, item.y, 1, 1);
    const hex = num2hex(c.data[0]) + num2hex(c.data[1]) + num2hex(c.data[2]);
    if (hex != item.color) {
      PANEL.add(item.title + `の色が違います（${item.color}が${hex}）`, "error");
      color_messages += '<li class="red">' + item.title + `の色が違います（${item.color}が${hex}）</li>`;
      error = true;
    }
  }
  if (!error) {
    PANEL.add('背景色の差異は確認できませんでした。');
    color_messages = '<li>背景色の差異は確認できませんでした。</li>'
  }
};


const initDebug = async () => {
  const sDate = new Date();
  PANEL.add(
    "<<< 開始 " + sDate.toLocaleTimeString() + "." + sDate.getMilliseconds(),
    "info",
  );

  // コース案内をカンプの状態にする
  chrome.devtools.inspectedWindow.eval(`$('main a:contains(6歳まで)').click();`);
  await wait(500);
  // アコーディオンを開く
  chrome.devtools.inspectedWindow.eval(`$('main :contains(よくあるご質問)').eq(0).find('*:not(:visible)').show();`);
  await wait(500);
  // 一番下にスクロール
  chrome.devtools.inspectedWindow.eval("window.scrollTo(0,100000)");
  await wait(1000);
  // slickの自動再生を止め最初のスライドに戻す
  chrome.devtools.inspectedWindow.eval(`$('.slick-list').parent().slick('slickPause')`);
  await wait(1000);
  chrome.devtools.inspectedWindow.eval(`$('.slick-list').parent().slick('slickGoTo', 0)`);
  // 一番上にスクロール
  chrome.devtools.inspectedWindow.eval("window.scrollTo(0,0)");
  await wait(500);
};

const finishDebug = () => {
  PANEL.emptyLine();
  const eDate = new Date();
  PANEL.add(
    ">>> 終了 " + eDate.toLocaleTimeString() + "." + eDate.getMilliseconds(),
    "info",
  );
  PANEL.emptyLine();
};

document.getElementById("detach").addEventListener("click", async (e) => {
  e.preventDefault();
  await chrome.debugger.detach(debuggee);
  PANEL.reset();
});

document.getElementById("notice-close").addEventListener("click", (e) => {
  e.preventDefault();
  document.querySelector('header .notice').style.display = 'none';
});

  

document.getElementById("checker").addEventListener("click", async (e) => {
  e.preventDefault();

  document.getElementById("messages").innerHTML = '';

  // デバッガを開始
  if (!(await startDebugger())) {
    // 条件に適合しなければ終了
    await chrome.debugger.detach(debuggee);
    return false;
  }

  await initDebug();
  const slick = await DEBUG_SCRIPT();
  if (METRICS.contentSize.width == 1536) {
    await colorCheck();
  }
  else {
    PANEL.emptyLine();
    PANEL.add("背景色のチェック", "title");
    PANEL.add('チェックはPC版だけです');
    color_messages = '<li>チェックはPC版だけです</li>';
  }
  finishDebug();

  const { frameTree } = await chrome.debugger.sendCommand(debuggee, 'Page.getResourceTree');
  const frameId = frameTree.frame.id;
  let content;

  // HTMLの取得
  try {
    content = await chrome.debugger.sendCommand(debuggee, 'Page.getResourceContent', { frameId, url: frameTree.frame.url });
  }
  catch (e) {
    PANEL.add('htmlが取得できませんでした。', 'error');
    return;
  }
  const html = content.content;


  // style.cssの取得
  const cssFile = frameTree.resources.find((r) => r.url.match(/\/style.css/));
  if (!cssFile) {
    PANEL.add('style.cssが読み込まれていません。', 'error');
    return;
  }
  try {
    content = await chrome.debugger.sendCommand(debuggee, 'Page.getResourceContent', { frameId, url: cssFile.url });
  }
  catch (e) {
    PANEL.add('style.cssが取得できませんでした。', 'error');
    return;
  }
  const css = content.content;

  // main.jsの取得
  const jsFile = frameTree.resources.find((r) => r.url.match(/\/main.js/));
  if (!jsFile) {
    PANEL.add('main.jsが読み込まれていません。', 'error');
    return;
  }
  try {
    content = await chrome.debugger.sendCommand(debuggee, 'Page.getResourceContent', { frameId, url: jsFile.url });
  }
  catch (e) {
    PANEL.add('main.jsが取得できませんでした。', 'error');
    return;
  }
  const js = content.content;


  // チェッカー用ウィンドウ表示
  const win = window.open('checker.html');
  win.addEventListener('load', async function () {
    this.document.querySelector('#html').value = html;
    this.document.querySelector('#css').value = css;
    this.document.querySelector('#js').value = js;
    this.document.querySelector('#slick').value = slick ? 1 : 0;
    this.document.querySelector('.perform').click();
    // this.document.querySelector('#FINAL-EXAM-CHECKER').submit();

    let tables = '';
    document.getElementById('messages').querySelectorAll('.table').forEach((el) => {
      tables = tables + el.outerHTML;
    });
    this.document.querySelector('#messages .tables').innerHTML = tables;
    this.document.querySelector('#messages .details').innerHTML = result_messages;
    this.document.querySelector('#messages .color_check').innerHTML = color_messages;
    // await chrome.debugger.detach(debuggee);
  });

});
