chrome.devtools.panels.create(
  'FinalExamChecker',
  '',
  'panel.html',
  // function (panel) {
  //   panel.onHidden.addListener(async function () {
  //     const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  //     const debuggee = { tabId: tab.id };
  //     await chrome.debugger.detach(debuggee);
  //   });
  // }
);
