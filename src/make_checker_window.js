import { States } from "./states.class.js";
import { wait } from "./utils.js";

export async function makeCheckerWindow() {

// チェッカー用ウィンドウ表示
  const win = window.open('checker.html');
  win.addEventListener('load', async function () {
    this.document.querySelector('#css').value = States.SOURCE_CSS;
    this.document.querySelector('#js').value = States.SOURCE_JS;
    this.document.querySelector('#slick').value = States.SLICK ? 1 : 0;
    if (States.SOURCE_HTML) {
      this.document.querySelector('#html').value = States.SOURCE_HTML;
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
