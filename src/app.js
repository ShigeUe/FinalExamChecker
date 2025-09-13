import { States } from "./states.class.js";
import { dbggr, initDebug, startDebugger, finishDebug } from "./debugger.js";
import { checkAppVersion } from "./version_check.js";
import { PANEL } from "./output_panel.js";
import { makeCheckerWindow } from "./make_checker_window.js";
import {
  findProperty, findNodeById, getFirstFontName, wait, rgb2hex,
  calculateOverlapArea, getOutsideBox, inspectedWindowEval,
  getResource, getNodeIdFromCoordinate, errorPropertyOutput
} from "./utils.js";




async function DoTheFirstCheck() {
  States.RESULTS = [];
  States.RESULT_MESSAGES = '';

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

      const { quads } = (await dbggr("DOM.getContentQuads", { nodeId: node.nodeId })) ?? { quads: [] };
      // 見えていない（quadsが無い）要素は飛ばす
      if (!quads.length) {
        return;
      }

      // 左上、右下のboxを定義
      const box = getOutsideBox(quads);
      // 適用されているFontを取得
      const { fonts } = (await dbggr("CSS.getPlatformFontsForNode", { nodeId: node.nodeId })) ?? { fonts: [] };
      // 計算済スタイルを取得
      const { computedStyle } = (await dbggr("CSS.getComputedStyleForNode", { nodeId: node.parentId ?? node.nodeId })) ?? { computedStyle: {} };
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
            allFonts[font.familyName + " - ローカルフォント"] = font.isCustomFont;
            property.isWebFont = false;
          }
        }
      }
      const nodeValue = node.nodeValue.trim();
      States.RESULTS.push({ nodeId: node.nodeId, nodeValue, box, property });
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

  for (let node of States.ROOT_BODY.children) {
    await findNodesThatContainText(node);
  }

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
  for (const datum of States.MODEL_DATA) {
    let found = null;

    for (const el of States.RESULTS) {
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

        let elementMessages = '';
        if (property.color != datum.property.color) {
          emphasises.push(2);
          elementMessages += '文字色が違います（コードは' + rgb2hex(property.color) + 'ですがカンプは' + rgb2hex(datum.property.color) + '）<br>';
        }
        if (property.fontSize != datum.property.fontSize) {
          emphasises.push(3);
          elementMessages += '文字の大きさが違います（コードは' + property.fontSize + 'ですがカンプは' + datum.property.fontSize + '）<br>';
        }
        if (property.fontWeight != datum.property.fontWeight) {
          emphasises.push(4);
          elementMessages += '文字の太さが違います（コードは' + property.fontWeight + 'ですがカンプは' + datum.property.fontWeight + '）<br>';
        }
        if (property.fontStyle != datum.property.fontStyle) {
          emphasises.push(5);
          elementMessages += '文字のスタイルが違います（コードは' + property.fontStyle + 'ですがカンプは' + datum.property.fontStyle + '）<br>';
        }
        if (getFirstFontName(property.fontFamily)?.toLowerCase() != datum.property.fontFamily.toLowerCase()) {
          emphasises.push(6);
          elementMessages += 'フォントが違います（コードは' + getFirstFontName(property.fontFamily) + 'ですがカンプは' + datum.property.fontFamily + '）<br>';
        }
        if (!property.isWebFont) {
          emphasises.push(7);
          elementMessages += 'Webフォントではありません<br>';
        }
        if (emphasises.length > 0) {
          // 要素のキャプチャを取得
          const captureParam = {
            "format": "png", "quality": 100, "fromSurface": true, "captureBeyondViewport": true,
            "clip": {
              "x": (box[0] - 20), "y": (box[1] - 20),
              "width": (box[2] - box[0]) + 40, "height": (box[3] - box[1]) + 40,
              "scale": 1
            }
          }
          const capture = await dbggr('Page.captureScreenshot', captureParam);
          if (capture) {
            elementMessages = '<div><img src="data:image/png;base64,' + capture.data + '"></div><p class="detail-text" contenteditable>' + elementMessages + "</p>";
            // デバッグ用Box情報
            // elementMessages += box.toString() + '<br>';
          }
          States.RESULT_MESSAGES += '<div class="datum"><p class="detail-title">「' + datum.nodeValue + '」</p>' + elementMessages + '</div>\n';

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
      console.log("文字要素が見つからない。" + datum.nodeValue);
      States.RESULT_MESSAGES += '<div class="datum"><p class="detail-title">「' + datum.nodeValue + '」</p>\n<p class="detail-text" contenteditable>要素が取得できません。打ち間違いをチェックしてください。</p></div>\n';
      PANEL.table(
        [
          "内容", "color", "font-size", "font-weight", "font-style", "font-family", "Webフォントか",
        ],
        [
          datum.nodeValue, rgb2hex(datum.property.color), datum.property.fontSize, datum.property.fontWeight,
          datum.property.fontStyle, datum.property.fontFamily, "",
        ],
        ['要素が取得できません。打ち間違いをチェックしてください。', '', '', '', '', '', '',],
        []
      );
    }
  }

  return slick;
}

// background-colorかborder-*-widthを持っている要素のnodeIdを返す
// それ以外は引数のnodeIdをそのまま返す
async function changeTheNodeIdFromProperty(nodeId, properties) {
  const property = properties.find((p) => p.type === 'background-color' || p.type.match(/^border-.*-width$/));
  if (!property) {
    return nodeId;
  }

  // 最大4階層親に戻る
  let tempId = nodeId;
  for (let i = 0; i < 4; i++) {
    let styles;
    try {
      styles = (await dbggr("CSS.getComputedStyleForNode", { nodeId: tempId })).computedStyle;
    }
    catch (e) {
      // エラー時はもとのnodeId
      return nodeId;
    }
    const style = styles.find((p) => p.name === property.type);
    if (
      style.name === 'background-color' && style.value !== 'rgba(0, 0, 0, 0)' ||
      style.name.match(/^border-.*-width$/) && style.value !== '0px'
    ) {
      // 見つかったらそのnodeId
      return tempId;
    }
    else {
      // 見つからなかったら親要素のnodeId
      if (!findNodeById(tempId).parentId) {
        return nodeId;
      }
      tempId = findNodeById(tempId).parentId;
    }
  }
  // 見つからなかったらもとのnodeId
  return nodeId;
}


async function checkElementsProperties() {
  PANEL.emptyLine();
  PANEL.add("要素のプロパティチェック（背景色、境界線幅・色、境界角丸、高さ・幅）", "title");
  const noticeMessage = `<p class="property-notice">【注意】<br>
  ・差異があると報告されても鵜呑みにせずコードを確認してください<br>
  ・border-radius系は上下がくっつく場合カンプより大きいと正常に見えます<br>
  ・CTAの色はRGBとRGBA（透明度あり＝カンプ通り）の両方で比較しています<br>
  ・高さや幅に小数点が含まれると、環境によって差異が出ます<br>
  ・色はrgbやrgba関数として出力されますが、デベロッパーツールの仕様です</p>`;

  PANEL.add(noticeMessage, 'html');
  PANEL.emptyLine();
  States.CHECK_ELEMENTS_PROPERTIES_MESSAGE = noticeMessage + "<br>";

  for (let element of ELEMENT_PROPERTIES_PC) {
    PANEL.add('◆' + element.name, 'emphasis');
    States.CHECK_ELEMENTS_PROPERTIES_MESSAGE += '<strong>◆' + element.name + "</strong><br>";

    // 比較要素が画面外なら移動する
    const { cssLayoutViewport } = (await dbggr("Page.getLayoutMetrics")) ?? { cssLayoutViewport: null };
    if (cssLayoutViewport && (cssLayoutViewport.pageY > element.y || (cssLayoutViewport.pageY + cssLayoutViewport.clientHeight) <= element.y)) {
      // 比較要素を画面中央にする
      await inspectedWindowEval("window.scrollTo(0," + (element.y - cssLayoutViewport.clientHeight / 2) + ")");
      await wait(100);
    }

    let nodeId = await getNodeIdFromCoordinate(element.x, element.y);
    if (!nodeId) {
      console.log("要素が見つからない。" + element.name);
      PANEL.add(element.name + "が見つかりません。");
      States.CHECK_ELEMENTS_PROPERTIES_MESSAGE += element.name + "が見つかりません。<br>";
      continue;
    }

    try {
      nodeId = await changeTheNodeIdFromProperty(nodeId, element.properties);
      let error = false;
      const { computedStyle } = await dbggr("CSS.getComputedStyleForNode", { nodeId });
      for (let property of element.properties) {
        const value = findProperty(computedStyle, property.type).value;
        if (value != property.value) {
          if (property.orValue && value == property.orValue) {
            continue;
          }
          errorPropertyOutput(property.type, value, property.value);
          error = true;
        }
      }

      if (!error) {
        PANEL.add("差異はありません。");
        States.CHECK_ELEMENTS_PROPERTIES_MESSAGE += "差異はありません<br>";
      }
    }
    catch (e) {
      console.log(e);
    }
  }
  await inspectedWindowEval("window.scrollTo(0,0)");
  await wait(200);
}

async function findPositionedElements() {
  PANEL.add("position: relative と top/left/right/bottom が指定されている要素のチェック", "title");
  PANEL.add("デバッグモードをONのまま結果の行にホバーするとどの要素か分かります。", "emphasis");
  let foundCount = 0;
  States.POSITION_RELATIVE_CHECK = '';

  // 要素のスタイルをチェックして結果を出力する共通関数
  const checkAndReport = async (targetNode, parentNode, isPseudo = false) => {
    // slick-track, slick-slide クラスを持つ要素はスキップ
    if (parentNode && parentNode.attributes) {
      for (let i = 0; i < parentNode.attributes.length; i += 2) {
        if (parentNode.attributes[i] === 'class') {
          const classList = parentNode.attributes[i + 1].split(' ');
          if (classList.includes('slick-track') || classList.includes('slick-slide')) {
            return;
          }
          break;
        }
      }
    }

    // 1. 計算後のスタイルで position: relative かどうかをチェック
    const { computedStyle } = (await dbggr("CSS.getComputedStyleForNode", { nodeId: targetNode.nodeId })) ?? { computedStyle: [] };
    if (!computedStyle || !computedStyle.length) return;
 
    const position = findProperty(computedStyle, "position")?.value;
    if (position !== 'relative') {
      return; // relativeでなければチェック対象外
    }
 
    // 2. 一致したスタイルルールを取得して、top/left/right/bottomが明示的に指定されているかチェック
    const { matchedCSSRules, inlineStyle } = (await dbggr("CSS.getMatchedStylesForNode", { nodeId: targetNode.nodeId })) ?? { matchedCSSRules: [], inlineStyle: null };
 
    let isPositioned = false;
    let isInline = false;
    const positionProps = ['top', 'left', 'right', 'bottom'];
 
    // プロパティが 'auto', 'initial', 'unset' 以外の値で指定されているかチェックする関数
    const hasExplicitPositionProp = (properties) => {
      if (!properties) return false;
      return properties.some(prop =>
        positionProps.includes(prop.name) &&
        prop.value.trim() !== '' &&
        prop.value.trim() !== 'auto' &&
        prop.value.trim() !== 'initial' &&
        prop.value.trim() !== 'unset'
      );
    };
 
    // インラインスタイルのチェック
    if (inlineStyle && hasExplicitPositionProp(inlineStyle.cssProperties)) {
      isPositioned = true;
      isInline = true;
    }
 
    // マッチしたCSSルールのチェック
    if (!isPositioned && matchedCSSRules) {
      for (const { rule } of matchedCSSRules) {
        if (rule && rule.style && hasExplicitPositionProp(rule.style.cssProperties)) {
          isPositioned = true;
          break; // 一つでも見つかればOK
        }
      }
    }
 
    if (isPositioned) {
      foundCount++;
      const nodeToDescribe = isPseudo ? parentNode : targetNode;
      let attrs = '';
      if (nodeToDescribe.attributes) {
        for (let i = 0; i < nodeToDescribe.attributes.length; i += 2) {
          attrs += ` ${nodeToDescribe.attributes[i]}="${nodeToDescribe.attributes[i + 1]}"`;
        }
      }
      const tagDescription = `&lt;${nodeToDescribe.nodeName.toLowerCase()}${attrs}&gt;`;
      let message;
      if (isPseudo) {
        message = `疑似要素: ${tagDescription}::${targetNode.pseudoType} (nodeId: ${targetNode.nodeId})`;
      } else {
        message = `要素: ${tagDescription} (nodeId: ${targetNode.nodeId})`;
      }
      PANEL.addHighlightNodeText(message, targetNode.nodeId);
      States.POSITION_RELATIVE_CHECK += message + "<br>\n";
    }
  };
 
  const traverseNodes = async (node) => {
    if (!node) return;
 
    // 通常要素のチェック (テキストノードやコメントノードは除外)
    if (node.nodeType === 1) { // ELEMENT_NODE
      await checkAndReport(node, node, false);
    }
 
    // 疑似要素のチェック
    if (node.pseudoElements) {
      for (const pseudo of node.pseudoElements) {
        await checkAndReport(pseudo, node, true);
      }
    }
 
    // 子要素を再帰的に探索
    if (node.children) {
      for (const child of node.children) {
        await traverseNodes(child);
      }
    }
  };
 
  if (States.ROOT_BODY) {
    await traverseNodes(States.ROOT_BODY);
    if (foundCount === 0) {
      PANEL.add("該当する要素は見つかりませんでした。");
      States.POSITION_RELATIVE_CHECK += "該当する要素は見つかりませんでした。<br>\n";
    }
  } else {
    PANEL.add("DOMルート要素が見つかりません。デバッガを再起動してください。", "error");
  }
}


// --------------------
// イベントリスナー
// --------------------

document.getElementById("detach").addEventListener("click", async (e) => {
  e.preventDefault();
  await chrome.debugger.detach(States.DEBUGGEE);
  PANEL.reset();
});

document.getElementById("notice-close").addEventListener("click", (e) => {
  e.preventDefault();
  document.querySelector('header .notice').style.display = 'none';
});

// 事実上の main()
document.getElementById("checker").addEventListener("click", async (e) => {
  e.preventDefault();

  document.getElementById("messages").innerHTML = '';

  // デバッガを開始
  if (!(await startDebugger())) {
    // 条件に適合しなければ終了
    await chrome.debugger.detach(States.DEBUGGEE);
    return false;
  }

  await initDebug();
  if (States.METRICS.contentSize.width == 1536) {
    await checkElementsProperties();
  }
  else {
    PANEL.emptyLine();
    PANEL.add("要素のプロパティチェック", "title");
    PANEL.add('チェックはPC版だけです');
    States.CHECK_ELEMENTS_PROPERTIES_MESSAGE = 'チェックはPC版だけです';
  }
  const slick = await DoTheFirstCheck();
  await findPositionedElements();
  await wait(100);
  PANEL.makeToc();

  // HTMLの取得
  const html = await getResource('index.html');
  // style.cssの取得
  const css = await getResource('style.css');
  // main.jsの取得
  const js = await getResource('main.js');


  // チェッカー用ウィンドウ表示
  await makeCheckerWindow(html, css, js, slick);
  finishDebug();

  await wait(100);
  window.scrollTo(0, 0);
});

chrome.debugger.onDetach.addListener(() => {
  States.ATTACHED = false;
});

// --------------------
// バージョンチェック
// --------------------

(async () => {
  if (await checkAppVersion()) {
    PANEL.add("新しいバージョンがあります。", "error");
  }
  else {
    PANEL.add("Version:" + chrome.runtime.getManifest().version);
  }
})();

chrome.devtools.inspectedWindow.reload();
