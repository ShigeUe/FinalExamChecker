import { States } from "./states.class.js";
import { initDebug, startDebugger, finishDebug } from "./debugger.js";
import { checkAppVersion } from "./version_check.js";
import { PANEL } from "./output_panel.js";
import { makeCheckerWindow } from "./make_checker_window.js";
import { wait, getResource } from "./utils.js";
import { DoTheFirstCheck } from "./checkers/text_checker.js";
import { checkElementsProperties } from "./checkers/style_checker.js";
import { findPositionedElements } from "./checkers/position_checker.js";

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

  // ターゲットを初期化
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

  // チェック本体
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

// 一度リロードしないとHTMLが取得できない
chrome.devtools.inspectedWindow.reload();