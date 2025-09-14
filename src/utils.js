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

export function wait(t) {
  return new Promise((f) => {
    setTimeout(f, t);
  }, () => { });
}

export function inspectedWindowEval(code) {
  return new Promise((f) => {
    chrome.devtools.inspectedWindow.eval(code, (e) => f(e));
  });
}
