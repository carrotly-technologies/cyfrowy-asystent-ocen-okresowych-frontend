/**
 * Brings the top of the stage work area into view after a step change, but only when the user has scrolled past it
 * (the case file scrolls as one document inside `#main`; the sticky stepper stays on top via scroll-margin).
 */
export function scrollToCaseWork() {
  const work = document.querySelector<HTMLElement>('.case-work')
  const main = document.getElementById('main')
  if (!work || !main) return
  if (work.getBoundingClientRect().top < main.getBoundingClientRect().top + 80) work.scrollIntoView({ block: 'start' })
}
