import { States } from "./states.class.js";
import { PANEL } from "./output_panel.js";
import { inspectedWindowEval, wait } from "./utils.js";
import { MODEL_DATA_PC } from "./data/model_data_pc.js";
import { MODEL_DATA_SP } from "./data/model_data_sp.js";

export async function dbggr(command, option) {
  if (!States.ATTACHED) {
    return;
  }
  let result = null;
  try {
    if (typeof option === 'undefined') {
      result = await chrome.debugger.sendCommand(States.DEBUGGEE, command);
    }
    else {
      result = await chrome.debugger.sendCommand(States.DEBUGGEE, command, option);
    }
  }
  catch (e) {
    console.log(e);
  }
  return result;
}

export async function startDebugger() {
  States.DEBUGGEE = { tabId: chrome.devtools.inspectedWindow.tabId };

  try {
    await chrome.debugger.attach(States.DEBUGGEE, "1.3");

  } catch (e) {
    PANEL.add(
      "Debuggerを開始できません。\n一度リロードし、デベロッパーツールを再表示してください。",
      "error",
    );
    return false;
  }
  States.ATTACHED = true;

  await dbggr("DOM.enable");
  await dbggr("CSS.enable");
  await dbggr("Page.enable");
  await dbggr("Overlay.enable");

  const { root } = await dbggr("DOM.getDocument", { depth: -1 });
  States.ROOT_BODY = root.children[1].children[1];

  // metricsを取得する
  States.METRICS = await dbggr("Page.getLayoutMetrics");

  if (States.METRICS.contentSize.width != 1536 && States.METRICS.contentSize.width != 390) {
    PANEL.add("ウィンドウサイズは390pxか1536pxにしてください。（検出サイズ：" + States.METRICS.contentSize.width + "）", "error");
    return false;
  }
  if (States.METRICS.contentSize.width == 1536) {
    States.MODEL_DATA = MODEL_DATA_PC;
  }
  if (States.METRICS.contentSize.width == 390) {
    States.MODEL_DATA = MODEL_DATA_SP;
  }
  return true;
}

export async function initDebug() {
  States.PROCESSING = true;

  const sDate = new Date();
  PANEL.add(
    "<<< 開始 " + sDate.toLocaleTimeString() + "." + sDate.getMilliseconds(),
    "info",
  );

  // コース案内をカンプの状態にする
  await inspectedWindowEval(`$('main a:contains(6歳まで)').click();`);
  await wait(500);
  // アコーディオンを開く
  if (!await inspectedWindowEval(`$(':contains(初めに受講者様と保護者様と面談を行い)').last().is(':visible')`)) {
    await inspectedWindowEval(`$(':contains(オンラインの英会話教室は初めてで)').last().click();`);
  }
  if (!await inspectedWindowEval(`$(':contains(パソコンやスマートフォンだけでなく、)').last().is(':visible')`)) {
    await inspectedWindowEval(`$(':contains(外出先でも受講)').last().click();`);
  }
  if (!await inspectedWindowEval(`$(':contains(授業料はコースによって異なります。)').last().is(':visible')`)) {
    await inspectedWindowEval(`$(':contains(授業料はどのようになって)').last().click();`);
  }
  if (!await inspectedWindowEval(`$(':contains(兄弟だけでなく家族割引プランや)').last().is(':visible')`)) {
    await inspectedWindowEval(`$(':contains(兄弟だけでの受講を検討)').last().click();`);
  }
  await wait(1000);
  // 一番下にスクロール
  await inspectedWindowEval("window.scrollTo(0,100000)");
  await wait(1000);
  // slickの自動再生を止め最初のスライドに戻す
  await inspectedWindowEval(`$('.slick-list').parent().slick('slickPause')`);
  await wait(1000);
  await inspectedWindowEval(`$('.slick-list').parent().slick('slickGoTo', 0)`);
  // 一番上にスクロール
  await inspectedWindowEval("window.scrollTo(0,0)");
  await wait(500);
}

export function finishDebug() {
  States.PROCESSING = false;

  PANEL.emptyLine();
  const eDate = new Date();
  PANEL.add(
    ">>> 終了 " + eDate.toLocaleTimeString() + "." + eDate.getMilliseconds(),
    "info",
  );
  PANEL.emptyLine();
}
