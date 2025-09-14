import { States } from "../states.class.js";
import { dbggr } from "../debugger.js";
import { PANEL } from "../output_panel.js";
import { findProperty, findNodeById, inspectedWindowEval, wait } from "../utils.js";
import { ELEMENT_PROPERTIES_PC } from "../data/element_properties_pc.js";

async function getNodeIdFromCoordinate(x, y) {
  const node = await dbggr("DOM.getNodeForLocation", { x, y });
  if (!node) {
    return null;
  }
  return node.nodeId;
}

function errorPropertyOutput(type, codeValue, value) {
  let diff = `コード：${codeValue}，カンプ：${value}`;
  PANEL.add(type + `の差異（${diff}）`);
  States.CHECK_ELEMENTS_PROPERTIES_MESSAGE += `${type}の差異<span class="red">（${diff}）</span><br>`;
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
    const style = findProperty(styles, property.type);
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

export async function checkElementsProperties() {
  if (States.METRICS.contentSize.width != 1536) {
    PANEL.emptyLine();
    PANEL.add("要素のプロパティチェック", "title");
    PANEL.add('チェックはPC版だけです');
    States.CHECK_ELEMENTS_PROPERTIES_MESSAGE = 'チェックはPC版だけです';
    return;
  }

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
