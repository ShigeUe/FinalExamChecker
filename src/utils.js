import { dbggr } from "./debugger.js";
import { States } from "./states.class.js";
import { PANEL } from "./output_panel.js";

// --------------------
// ユーティリティ関数
// --------------------

export function findProperty(properties, needle) {
  return properties.find((el) => {
    return (el.name == needle);
  });
}

export function findNodeById(id, node) {
  if (!node) {
    node = States.ROOT_BODY;
  }
  if (node.children) {
    for (const n of node.children) {
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
}

export function getFirstFontName(fontFamily) {
  return fontFamily.replaceAll('"', "").split(",").at(0).trim();
}

export function wait(t) {
  return new Promise((f) => {
    setTimeout(f, t);
  }, () => { });
}

export function rgb2hex(rgb) {
  const s = rgb.match(/\d+/g);
  if (s.length !== 3) {
    return '#000000';
  }
  return '#' + s.map((e) => ("0" + Number(e).toString(16)).slice(-2)).join('');
}

export function calculateOverlapArea(rect1, rect2) {
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

export function getOutsideBox(quads) {
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

export function inspectedWindowEval(code) {
  return new Promise((f) => {
    chrome.devtools.inspectedWindow.eval(code, (e) => f(e));
  });
}

// リソースを得る
export async function getResource(filename) {
  const reg = new RegExp("\\/" + filename);
  return new Promise((f) => {
    chrome.devtools.inspectedWindow.getResources((resources) => {
      const res = resources.find((r) => r.url.match(reg));
      if (!res) {
        PANEL.add(`${filename}が読み込まれていません。`, 'error');
        f('');
      }
      res.getContent((c) => {
        if (!c) {
          PANEL.add(`${filename}が取得できませんでした。`, 'error');
          f('');
          return;
        }
        f(c);
      });
    });
  });
}

export async function getNodeIdFromCoordinate(x, y) {
  const node = await dbggr("DOM.getNodeForLocation", { x, y });
  if (!node) {
    return null;
  }
  return node.nodeId;
}

export function errorPropertyOutput(type, codeValue, value) {
  let diff = `コード：${codeValue}，カンプ：${value}`;
  PANEL.add(type + `の差異（${diff}）`);
  States.CHECK_ELEMENTS_PROPERTIES_MESSAGE += `${type}の差異<span class="red">（${diff}）</span><br>`;
}
