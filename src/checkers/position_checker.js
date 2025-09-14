import { States } from "../states.class.js";
import { dbggr } from "../debugger.js";
import { PANEL } from "../output_panel.js";
import { findProperty } from "../utils.js";

/**
 * HTML文字列をエスケープ
 * @param {string} convertString エスケープ元のHTML文字列
 * @returns {string} エスケープされたHTML文字列を返す
 */
function escapeHtml(convertString) {
	if (typeof convertString !== 'string') return convertString;

	const patterns = {
		'<'  : '&lt;',
		'>'  : '&gt;',
		'&'  : '&amp;',
		'"'  : '&quot;',
		'\'' : '&#x27;',
		'`'  : '&#x60;'
	};

	return convertString.replace(/[<>&"'`]/g, match => patterns[match]);
};

export async function findPositionedElements() {
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
          attrs += ` ${nodeToDescribe.attributes[i]}='${nodeToDescribe.attributes[i + 1]}'`;
        }
      }
      const tagDescription = `<${nodeToDescribe.nodeName.toLowerCase()}${attrs}>`;
      let message;
      if (isPseudo) {
        message = `疑似要素: ${tagDescription}::${targetNode.pseudoType} (nodeId: ${targetNode.nodeId})`;
      } else {
        message = `要素: ${tagDescription} (nodeId: ${targetNode.nodeId})`;
      }
      PANEL.addHighlightNodeText(message, targetNode.nodeId);
      States.POSITION_RELATIVE_CHECK += escapeHtml(message) + "<br>\n";
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