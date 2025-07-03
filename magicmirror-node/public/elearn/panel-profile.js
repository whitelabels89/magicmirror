function initPanelProfile() {
  const panel = document.querySelector('.panel-ungu');
  const btn = document.getElementById('toggle-panel-btn');
  function updateBtnDirection() {
    if (panel.classList.contains('hidden')) {
      btn.innerHTML = '⮞';
    } else {
      btn.innerHTML = '⮜';
    }
  }
  btn.addEventListener('click', () => {
    panel.classList.toggle('hidden');
    updateBtnDirection();
  });
  updateBtnDirection();
}