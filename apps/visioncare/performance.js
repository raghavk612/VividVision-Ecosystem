const panel = document.querySelector('.chart-panel')
const replay = document.querySelector('#replay')
function animateBars() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  for (const bar of panel.querySelectorAll('.bar')) {
    bar.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], {
      duration: 1300, easing: 'cubic-bezier(.16,1,.3,1)',
    })
  }
}
replay.addEventListener('click', animateBars)
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) {
      animateBars()
      observer.disconnect()
    }
  }, { threshold: 0.4 })
  observer.observe(panel)
}
