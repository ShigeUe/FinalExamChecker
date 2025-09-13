import { States } from "./states.class.js";
import { wait } from "./utils.js";

export async function makeCheckerWindow(html, css, js, slick) {

// チェッカー用ウィンドウ表示
  const win = window.open('checker.html');
  win.addEventListener('load', async function () {
    this.document.querySelector('#css').value = css;
    this.document.querySelector('#js').value = js;
    this.document.querySelector('#slick').value = slick ? 1 : 0;
    if (html) {
      this.document.querySelector('#html').value = html;
      this.document.querySelector('.perform').click();
    }
    else {
      this.document.querySelector('.perform').parentElement.style.display = 'block';
    }

    let tables = '';
    document.getElementById('messages').querySelectorAll('.table').forEach((el) => {
      tables = tables + el.outerHTML;
    });
    this.document.querySelector('#messages .tables').innerHTML = tables;
    this.document.querySelector('#messages .details').innerHTML = States.RESULT_MESSAGES;
    this.document.querySelector('#messages .property_check').innerHTML = States.CHECK_ELEMENTS_PROPERTIES_MESSAGE;
    this.document.querySelector('#messages .position_relative_check').innerHTML = States.POSITION_RELATIVE_CHECK;
  });
  await wait(100);
  window.scrollTo(0, 0);
}
