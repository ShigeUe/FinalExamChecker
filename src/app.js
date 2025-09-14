import { States } from "./states.class.js";
import { initDebug, startDebugger, finishDebug } from "./debugger.js";
import { checkAppVersion } from "./version_check.js";
import { PANEL } from "./output_panel.js";
import { makeCheckerWindow } from "./make_checker_window.js";
import { wait } from "./utils.js";
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
  await checkElementsProperties();
  // チェック本体
  States.SLICK = await DoTheFirstCheck();
  await findPositionedElements();
  await wait(100);
  PANEL.makeToc();

  // チェッカー用ウィンドウ表示
  await makeCheckerWindow();
  finishDebug();

  await wait(100);
  window.scrollTo(0, 0);
});

chrome.debugger.onDetach.addListener(() => {
  States.ATTACHED = false;
});

// ロード時にリソースを取得する
chrome.devtools.network.onRequestFinished.addListener((req) => {
  if (req.request.url.match(/\/index.html/)) {
    req.getContent((content) => States.SOURCE_HTML = content);
  }
  if (req.request.url.match(/\/style.css/)) {
    req.getContent((content) => States.SOURCE_CSS = content);
  }
  if (req.request.url.match(/\/main.js/)) {
    req.getContent((content) => States.SOURCE_JS = content);
  }
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

// 一度リロードしてリソースを取得させる
chrome.devtools.inspectedWindow.reload();