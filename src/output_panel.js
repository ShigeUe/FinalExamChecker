import { States } from "./states.class.js";
import { dbggr } from "./debugger.js";
import { HIGHLIGHTCONFIG } from "./data/highlight_config.js";

function makeHash(text) {
  const uint8 = new TextEncoder().encode(text)
  return Array.from(new Uint8Array(uint8)).map(v => v.toString(16).padStart(2, '0')).join('').slice(0, 8);
}

export const PANEL = {
  element: document.getElementById("messages"),
  add: function (str, type) {
    const div = document.createElement("div");
    if (str) {
      if (type == 'html') {
        div.innerHTML = str;
      } else {
        div.innerText = str;
      }
    } else {
      div.innerHTML = "&nbsp;";
    }

    const classTypes = ["error", "info", "title", "emphasis", "notice"];
    if (classTypes.includes(type)) {
      div.classList.add(type);
      if (type == 'title') {
        const hash = "ID" + makeHash(str);
        div.id = hash;
        div.addEventListener('click', () => window.scrollTo(0, 0));
      }
    }
    this.element.append(div);
    window.scrollTo(0, document.body.scrollHeight);
  },
  addHighlightNodeText: function (str, nodeId) {
    const div = document.createElement("div");
    div.addEventListener('mouseenter', async () => {
      if (!States.PROCESSING) {
        await dbggr("DOM.scrollIntoViewIfNeeded", { nodeId });
        await dbggr("Overlay.highlightNode", { highlightConfig: HIGHLIGHTCONFIG, nodeId });
      }
    });
    div.addEventListener('mouseleave', async () => {
      if (!States.PROCESSING) {
        await dbggr("Overlay.hideHighlight");
      }
    });
    div.innerText = str;
    div.classList.add('position-relative')
    this.element.append(div);
    window.scrollTo(0, document.body.scrollHeight);
  },
  table: function (header, body1, body2, emphasises) {
    const table = document.createElement("div");
    table.classList.add('table');
    const thead = document.createElement("div");
    thead.classList.add('head');
    const tbody = document.createElement("div");
    tbody.classList.add('body');
    const h_tr = document.createElement("div");
    h_tr.classList.add('row');
    const b1_tr = document.createElement("div");
    b1_tr.classList.add('row');
    b1_tr.classList.add("model");
    const b2_tr = document.createElement("div");
    b2_tr.classList.add('row');

    for (let i = 0; i < body1.length; i++) {
      const th = document.createElement("div");
      th.classList.add('col');
      th.innerText = (header[i]) ?? "";
      h_tr.append(th);

      const td1 = document.createElement("div");
      td1.classList.add('col');
      td1.innerText = body1[i];
      b1_tr.append(td1);

      if (body2[i] != '') {
        const td2 = document.createElement("div");
        td2.classList.add('col');
        td2.setAttribute('contenteditable', '');

        // エラーを強調する
        if (emphasises.indexOf(i + 1) >= 0) {
          td2.classList.add('em');
        }
        if (body2[i].indexOf('要素が取得できません') >= 0) {
          td2.style.width = '100%';
        }
        td2.innerText = body2[i];
        b2_tr.append(td2);
      }
    }
    thead.append(h_tr);
    tbody.append(b1_tr);
    tbody.append(b2_tr);
    table.append(thead, tbody);

    table.addEventListener("mouseenter", async function (e) {
      const col = this.querySelector('.head .row .col:first-child');
      const nodeId = col.innerText.match(/\d+/)?.at(0) - 0;
      if (nodeId && !States.PROCESSING) {
        await dbggr("DOM.scrollIntoViewIfNeeded", { nodeId });
        await dbggr("Overlay.highlightNode", { highlightConfig: HIGHLIGHTCONFIG, nodeId });
      }
    });
    table.addEventListener("mouseleave", async function (e) {
      if (!States.PROCESSING) {
        await dbggr("Overlay.hideHighlight");
      }
    });

    this.element.append(table);
    window.scrollTo(0, document.body.scrollHeight);
  },
  reset: function () {
    this.element.innerHTML = "";
  },
  emptyLine: function () {
    this.add(null);
  },
  makeToc: function () {
    const ul = document.createElement("ul");
    ul.classList.add('toc');
    this.element.querySelectorAll('.title').forEach((ele) => {
      const li = document.createElement("li");
      const a = document.createElement("a");
      a.href = "#" + ele.id;
      a.innerText = ele.innerText;
      li.append(a);
      ul.append(li);
    });
    this.element.prepend(ul);
  },
};
