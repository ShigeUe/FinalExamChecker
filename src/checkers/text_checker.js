import { States } from "../states.class.js";
import { dbggr } from "../debugger.js";
import { PANEL } from "../output_panel.js";
import { findNodeById, findProperty } from "../utils.js";

function getFirstFontName(fontFamily) {
  return fontFamily.replaceAll('"', '').split(",").at(0).trim();
}

function rgb2hex(rgb) {
  const s = rgb.match(/\d+/g);
  if (s.length !== 3) {
    return '#000000';
  }
  return '#' + s.map((e) => ("0" + Number(e).toString(16)).slice(-2)).join('');
}

function calculateOverlapArea(rect1, rect2) {
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
}

function getOutsideBox(quads) {
  if (quads.length == 1) {
    return [quads[0][0], quads[0][1], quads[0][4], quads[0][5]];
  }
  let left = Number.MAX_SAFE_INTEGER, top = Number.MAX_SAFE_INTEGER, right = 0, bottom = 0;
  for (const q of quads) {
    left = (q[0] < left) ? q[0] : left;
    top = (q[1] < top) ? q[1] : top;
    right = (q[4] > right) ? q[4] : right;
    bottom = (q[5] > bottom) ? q[5] : bottom;
  }
  return [left, top, right, bottom];
}

export async function DoTheFirstCheck() {
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
