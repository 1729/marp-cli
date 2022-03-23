import { setQuery, classPrefix } from './utils'
import {
  HeaderEntry,
  PageEntry,
  buildCompactHeadersAndPages,
} from './utils/compact'

const isMobile =
  /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
  document.location.search === '?mobile'

const waitForEvent = function (eventName, eventObj) {
  return new Promise((resolve) => {
    eventObj.addEventListener(eventName, resolve, { once: true })
  })
}

const waitForDOMContentLoaded = function () {
  if (
    document.readyState === 'complete' ||
    document.readyState === 'interactive'
  ) {
    return Promise.resolve(null)
  } else {
    return waitForEvent('DOMContentLoaded', window)
  }
}
function pageIndexFromLocation(): number {
  const paths = location.pathname.split('/')
  const parts = paths[paths.length - 1].split('.')
  return (parseInt(parts[0]) || 1) - 1
}

// Adds the longest block of text to the temporary sizer div to determine what
// is the minimum font size needed to avoid vertical scrolling across the whole
// book. The function then replaces the CSS variable --marpit-root-font-size appropriately
function computeTextFontSize() {
  let longest = ''

  document
    .querySelectorAll(`.${classPrefix}mobile-page-content p`)
    .forEach((pageEl) => {
      const text = pageEl.textContent

      if (text !== null && text.length > longest.length) {
        longest = text + ' Extra Buffer Text'
      }
    })

  const sizer = document.querySelector(`.${classPrefix}mobile-sizer`)
  if (sizer === null) return

  sizer.setAttribute('style', `display: flex`)

  const sizerContent: HTMLElement | null = sizer.querySelector(
    `.${classPrefix}mobile-page-content`
  )
  if (sizerContent === null) return

  const pagesEl: HTMLElement | null = document.querySelector(
    `.${classPrefix}mobile-pages`
  )
  if (pagesEl === null) return

  let bestSize = 0

  for (const fontSize of [28, 26, 24, 20, 18, 16, 14, 12, 8]) {
    sizerContent.setAttribute('style', `font-size: ${fontSize}px`)
    sizerContent.innerText = longest

    if (sizer.scrollHeight <= sizer.clientHeight) {
      bestSize = fontSize
      break
    }
  }

  // Scale the fonts using the marpit root font size CSS variable
  for (let i = 0; i < document.styleSheets.length; i++) {
    const styleSheet = document.styleSheets[i]
    const varRegex = /--marpit-root-font-size:[0-9]+px/

    for (let j = 0; j < styleSheet.cssRules.length; j++) {
      const rule = styleSheet.cssRules[j] as CSSStyleRule

      if (rule !== null) {
        if (rule.cssText && varRegex.test(rule.cssText)) {
          const currentValue = parseInt(
            rule.style
              .getPropertyValue('--marpit-root-font-size')
              .replace('px', ''),
            10
          )
          // Set var to a ratio adjusted value based on the computed font size
          const newValue = Math.floor(currentValue / 16) * bestSize
          rule.style.setProperty('--marpit-root-font-size', `${newValue}px`)
        }
      }
    }
  }

  sizer.setAttribute('style', `display: none`)
}

// Builds the new DOM for the mobile deck
function buildMobileDOM(headers: Array<HeaderEntry>, pages: Array<PageEntry>) {
  const root = document.createElement('div')
  root.classList.add(`${classPrefix}mobile-root`)

  const addSpacer = (el) => {
    const spacer = document.createElement('div')
    spacer.classList.add(`${classPrefix}mobile-spacer`)
    spacer.innerHTML = '&nbsp;'
    el.appendChild(spacer)
  }

  const headerView = document.createElement('div')
  headerView.classList.add(`${classPrefix}mobile-headers`)
  root.appendChild(headerView)

  const pageView = document.createElement('div')
  pageView.classList.add(`${classPrefix}mobile-pages`)
  root.appendChild(pageView)

  const sizerEl = document.createElement('section')
  sizerEl.classList.add(`${classPrefix}mobile-sizer`)
  sizerEl.classList.add(`${classPrefix}mobile-page`)
  addSpacer(sizerEl)
  const spacerContentEl = document.createElement('div')
  spacerContentEl.classList.add(`${classPrefix}mobile-page-content`)
  sizerEl.appendChild(spacerContentEl)

  pageView.appendChild(sizerEl)

  for (const header of headers) {
    const headerEl = document.createElement('section')
    headerEl.setAttribute('data-pages', header.pages.join(','))

    if (header.title) {
      const titleEl = document.createElement('h1')
      titleEl.innerHTML = header.title
      headerEl.appendChild(titleEl)
    }

    if (header.figure) {
      const figureEl = document.createElement('img')
      figureEl.setAttribute('src', header.figure)
      figureEl.setAttribute('loading', 'lazy')
      headerEl.appendChild(figureEl)
    }

    headerView.appendChild(headerEl)
  }

  for (const { el: pageEl, full } of pages) {
    if (full) {
      pageView.appendChild(pageEl.children[0].cloneNode(true))
    } else {
      const sectionEl = document.createElement('section')
      sectionEl.classList.add(`${classPrefix}mobile-page`)
      addSpacer(sectionEl)

      const contentEl = document.createElement('div')
      contentEl.classList.add(`${classPrefix}mobile-page-content`)
      sectionEl.appendChild(contentEl)

      contentEl.appendChild(pageEl)
      pageView.appendChild(sectionEl)
    }
  }

  document.body.appendChild(root)
}

function buildMobileStylesheet() {
  // Re-write stylesheet
  for (let i = 0; i < document.styleSheets.length; i++) {
    const styleSheet = document.styleSheets[i]

    for (let j = 0; j < styleSheet.cssRules.length; j++) {
      const rule = styleSheet.cssRules[j] as CSSStyleRule

      if (rule !== null) {
        if (
          rule.selectorText &&
          rule.selectorText
            .toLowerCase()
            .startsWith('div#p > svg > foreignobject >')
        ) {
          rule.selectorText = rule.selectorText.replace(
            /div#p > svg > foreignobject >/gi,
            `.${classPrefix}mobile-pages `
          )
        }
      }
    }
  }
}

let updateLocationDuringPaging = false

// Sets up the requestAnimationFrame handler for dealing with scrolling the header
function runRAF(headers: Array<HeaderEntry>, pages: Array<PageEntry>) {
  const deckTitle = document.title
  const headerView = document.querySelector(`.${classPrefix}mobile-headers`)
  const pageView = document.querySelector(`.${classPrefix}mobile-pages`)
  const handleEl = document.querySelector(
    `.${classPrefix}mobile-scroller .handle`
  ) as HTMLElement
  const sliderEl = document.querySelector(
    `.${classPrefix}mobile-scroller .slider`
  ) as HTMLElement
  const pageTipEl = document.querySelector(
    `.${classPrefix}mobile-scroller .tip`
  ) as HTMLElement
  const pageLabelEl = document.querySelector(
    `.${classPrefix}mobile-scroller .label`
  ) as HTMLElement
  const chapterEls = document.querySelectorAll(
    `.${classPrefix}mobile-nav .chapters button`
  )
  const chapterPages: Array<number> = []
  for (let i = 0; i < chapterEls.length; i++) {
    chapterPages.push(parseInt(chapterEls[i].getAttribute('data-page') || '0'))
  }

  if (pageView === null) return
  if (headerView === null) return
  if (handleEl === null) return
  if (sliderEl === null) return
  if (pageLabelEl === null) return

  const performScroll = () => {
    const scrollOffset = pageView.scrollLeft
    const pageWidth = pageView.clientWidth
    const pageSpaceX = scrollOffset / pageWidth

    let headerSpaceX = 0

    for (let i = 0; i < headers.length - 1; i++) {
      const headerPages = headers[i].pages
      const headerLastPage = headerPages[headerPages.length - 1]
      const nextHeaderPages = headers[i + 1].pages
      const nextHeaderFirstPage = nextHeaderPages[0]

      if (pageSpaceX > headerLastPage && pageSpaceX < nextHeaderFirstPage) {
        headerSpaceX = i - 1 + (pageSpaceX - (headerLastPage - 1))
        break
      }

      if (pageSpaceX > headerLastPage) {
        headerSpaceX = i + 1
      }
    }

    const scroll = Math.floor(headerSpaceX * pageWidth)

    if (headerView.scrollLeft !== scroll) {
      headerView.scrollLeft = scroll
    }

    // On page scrolls, update the history + title + handle + scroller + nav
    if (Number.isInteger(pageSpaceX) && updateLocationDuringPaging) {
      const page = pages[pageSpaceX]
      const slide = page.slide

      const locationPageIndex = pageIndexFromLocation()

      if (locationPageIndex !== pageSpaceX) {
        const parts = location.pathname.split('/')
        parts.pop()

        document.title = `${
          headers[Math.floor(headerSpaceX)].title
        } | ${deckTitle}`

        const newPath =
          pageSpaceX === 0
            ? '/'
            : `/${pageSpaceX + 1}${
                document.location.toString().indexOf('localhost') > -1
                  ? '.html'
                  : ''
              }`

        setQuery(
          {},
          {
            location: { ...location, pathname: parts.join('/') + newPath },
            setter: (...args) => history.pushState(...args),
          }
        )
      }

      // Scroller
      const hitboxMargin = 10
      const handleOffset =
        (pageSpaceX / pages.length) * sliderEl.clientWidth +
        sliderEl.offsetLeft -
        hitboxMargin

      const handleLeft = `${Math.floor(handleOffset)}px`
      const tipLeft = `${Math.floor(handleOffset - 32)}px`
      const pageLabel = pageSpaceX === 0 ? 'Cover' : (pageSpaceX + 1).toString()

      if (handleEl.style.left !== handleLeft) {
        handleEl.style.left = handleLeft
      }

      if (pageTipEl.style.left !== tipLeft) {
        pageTipEl.style.left = tipLeft
      }

      if (pageLabelEl.innerHTML !== pageLabel) {
        pageLabelEl.innerHTML = pageLabel
      }

      // Nav
      for (let i = 0; i < chapterEls.length; i++) {
        const chapterEl = chapterEls[i]
        const chapterPage = chapterPages[i]
        const nextChapterPage =
          i < chapterPages.length - 1 ? chapterPages[i + 1] : Infinity

        const isActive =
          pageSpaceX >= chapterPage && pageSpaceX < nextChapterPage

        if (chapterEl.classList.contains('active') !== isActive) {
          chapterEl.classList.toggle('active')
        }
      }
    }

    requestAnimationFrame(performScroll)
  }

  requestAnimationFrame(performScroll)
}

function setupNavInputBindings(deck, pages) {
  if (isMobile) return

  document.addEventListener('keydown', (e) => {
    const pageView = document.querySelector(`.${classPrefix}mobile-pages`)
    if (pageView === null) return

    const locationPageIndex = pageIndexFromLocation()
    const pageWidth = pageView.clientWidth
    let newPageIndex = locationPageIndex

    if (e.key === ' ' && e.shiftKey) {
      newPageIndex = Math.max(0, newPageIndex - 1)
    } else if (
      e.key === 'ArrowLeft' ||
      e.key === 'ArrowUp' ||
      e.key === 'PageUp'
    ) {
      newPageIndex = Math.max(0, newPageIndex - 1)
    } else if (e.key === ' ' && !e.shiftKey) {
      newPageIndex = Math.min(pages.length - 1, newPageIndex + 1)
    } else if (
      e.key === 'ArrowRight' ||
      e.key === 'ArrowDown' ||
      e.key === 'PageDown'
    ) {
      newPageIndex = Math.min(pages.length - 1, newPageIndex + 1)
    } else if (e.key === 'End') {
      newPageIndex = pages.length - 1
    } else if (e.key === 'Home') {
      newPageIndex = 0
    } else {
      return
    }
    e.preventDefault() // Prevent default action when navigated
    pageView.scrollLeft = newPageIndex * pageWidth
  })

  let lastWheelNavigationAt = 0
  let lastWheelDelta
  let wheelIntervalTimer

  deck.parent.addEventListener('wheel', (e) => {
    e.preventDefault()
    console.log(e.deltaX, e.deltaY)

    // Prevent too sensitive navigation on trackpad and magic mouse
    const currentWheelDelta = Math.sqrt(e.deltaX ** 2 + e.deltaY ** 2)

    if (e.wheelDelta !== undefined) {
      if (e.webkitForce === undefined) {
        // [Chromium]
        // Chromium has (a deprecated) wheelDelta value and it is following the
        // pre-defeind WHEEL_DELTA (=120). It means a required delta for
        // scrolling 3 lines. We have set a threshold as 40 (required to scroll
        // 1 line).
        if (Math.abs(e.wheelDelta) < 40) return
      }

      // [WebKit]
      // WebKit's wheelDelta value will just return 3 times numbers from the
      // standard delta values, so using the standard delta will be better
      // than depending on deprecated values.
      //
      // Both of Chromium and Webkit are starting scroll from 4 pixels by a
      // event of the mouse wheel notch. If set a threshold to require 1 line
      // of scroll, the navigation by mouse wheel may be insensitive. So we
      // have set a threshold as 4 pixels.
      //
      // It means Safari is more sensitive to Multi-touch devices than other
      // browsers.
      if (e.deltaMode === e.DOM_DELTA_PIXEL && currentWheelDelta < 4) return
    } else {
      // [Firefox]
      // Firefox only has delta values provided by the standard wheel event.
      //
      // It will report 36 as the delta of the minimum tick for the regular
      // mouse wheel because Firefox's default font size is 12px and 36px is
      // required delta to scroll 3 lines at once.
      if (e.deltaMode === e.DOM_DELTA_PIXEL && currentWheelDelta < 12) return
    }

    // Suppress momentum scrolling by trackpad
    if (wheelIntervalTimer) clearTimeout(wheelIntervalTimer)

    const interval = 250

    wheelIntervalTimer = setTimeout(() => {
      lastWheelDelta = 0
    }, interval)

    const debouncing = Date.now() - lastWheelNavigationAt < interval
    const attenuated = currentWheelDelta <= lastWheelDelta

    lastWheelDelta = currentWheelDelta

    if (debouncing || attenuated) return

    // Navigate
    let direction = 0

    if (e.deltaX > 0 || e.deltaY > 0) direction = 1
    if (e.deltaX < 0 || e.deltaY < 0) direction = -1
    if (!direction) return

    const pageView = document.querySelector(`.${classPrefix}mobile-pages`)
    if (pageView === null) return

    const locationPageIndex = pageIndexFromLocation()
    const pageWidth = pageView.clientWidth
    const newPageIndex = Math.min(
      pages.length,
      Math.max(0, locationPageIndex + direction)
    )

    lastWheelNavigationAt = Date.now()
    pageView.scrollLeft = newPageIndex * pageWidth
  })
}

// Generates the mobile view, by walking the existing deck and spinning out a whole
// different DOM.
const bespokeMobile = (deck) => {
  const [headers, pages] = buildCompactHeadersAndPages(deck)

  const navigateFromState = () => {
    const pageView = document.querySelector(`.${classPrefix}mobile-pages`)
    if (pageView === null) return Promise.resolve()

    const locationPageIndex = pageIndexFromLocation()
    const pageWidth = pageView.clientWidth

    // Not sure why this is needed, otherwise chrome is off by a page on initial load (maybe due to spacer?)
    return new Promise<void>((res) => {
      setTimeout(() => {
        pageView.scrollLeft = locationPageIndex * pageWidth
        res()
      })
    })
  }

  const setupNav = () => {
    const navEl = document.querySelector(
      `.${classPrefix}mobile-nav`
    ) as HTMLElement

    const chaptersEl = document.querySelector(
      `.${classPrefix}mobile-nav .chapters`
    ) as HTMLElement

    let toggled = false
    const toggleEl = document.querySelector(
      `.${classPrefix}mobile-nav .toggle`
    ) as HTMLElement

    const toggleNav = () => {
      toggled = !toggled
      navEl.classList.toggle('toggled')
      chaptersEl.style.display = toggled ? 'flex' : 'none'
      toggleEl.innerHTML = !toggled ? '☰' : '✕'
    }

    toggleEl.addEventListener('click', toggleNav)

    const add = (title, page) => {
      const el = document.createElement('button')
      el.innerHTML = title
      el.setAttribute('data-page', page.toString())
      chaptersEl.appendChild(el)
    }

    add('Cover', 0)

    let iChapter = 0

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i]
      if (page.chapter === null) continue

      add(`${iChapter + 1}. ${page.chapter}`, i)
      iChapter++
    }

    chaptersEl.querySelectorAll('button').forEach((el) => {
      el.addEventListener('click', () => {
        const pageIndex = parseInt(el.getAttribute('data-page') as string)
        const pageView = document.querySelector(`.${classPrefix}mobile-pages`)
        if (pageView === null) return
        const pageWidth = pageView.clientWidth
        pageView.scrollLeft = pageIndex * pageWidth
        toggleNav()
      })
    })
  }

  const setupScroller = () => {
    const scroller = document.querySelector(`.${classPrefix}mobile-scroller`)
    if (scroller === null) return
    scroller.setAttribute('style', 'display: flex;')

    const handleEl = document.querySelector(
      `.${classPrefix}mobile-scroller .handle`
    ) as HTMLElement

    const sliderEl = document.querySelector(
      `.${classPrefix}mobile-scroller .slider`
    ) as HTMLElement

    const tipEl = document.querySelector(
      `.${classPrefix}mobile-scroller .tip`
    ) as HTMLElement

    let startScrollBookOffset = 0
    let startScrollSnapLowerX = 0
    let startScrollSnapUpperX = 0
    let scrolling = false

    handleEl.addEventListener('touchstart', (e) => {
      scrolling = true

      const pageView = document.querySelector(`.${classPrefix}mobile-pages`)
      if (pageView === null) return
      const pageWidth = pageView.clientWidth

      tipEl.style.display = 'flex'

      startScrollBookOffset = pageView.scrollLeft / pageWidth / pages.length
      const snapSize = 4

      startScrollSnapLowerX = Math.min(
        e.targetTouches[0].clientX - snapSize,
        handleEl.offsetLeft - snapSize
      )
      startScrollSnapUpperX = Math.max(
        e.targetTouches[0].clientX + snapSize,
        handleEl.offsetLeft + handleEl.offsetWidth + snapSize
      )
    })

    handleEl.addEventListener('touchend', () => {
      scrolling = false
      tipEl.style.display = 'none'
    })

    handleEl.addEventListener('touchmove', (e) => {
      if (!scrolling) return

      const touchEvent = e as TouchEvent
      if (touchEvent === null) return
      if (touchEvent.targetTouches.length !== 1) return

      const pageView = document.querySelector(`.${classPrefix}mobile-pages`)
      if (pageView === null) return
      const pageWidth = pageView.clientWidth
      const tx = e.targetTouches[0].clientX

      let bookOffsetPct = Math.max(
        0,
        Math.min(1, (tx - sliderEl.offsetLeft) / sliderEl.offsetWidth)
      )

      // Snap to current page within a few pixels
      if (tx >= startScrollSnapLowerX && tx <= startScrollSnapUpperX) {
        bookOffsetPct = startScrollBookOffset
      }

      const pageIndex = Math.floor(bookOffsetPct * pages.length)
      setTimeout(() => (pageView.scrollLeft = pageIndex * pageWidth))
    })
  }

  // Disable desktop slides
  deck.parent.setAttribute('style', 'display: none;')
  buildMobileDOM(headers, pages)
  setupScroller()
  setupNav()
  runRAF(headers, pages)

  // Wait a frame so layout runs
  setTimeout(() => {
    waitForDOMContentLoaded().then(() => {
      buildMobileStylesheet()

      // Restore position from URL on load, then begin tracking position
      navigateFromState().then(() => {
        updateLocationDuringPaging = true
      })

      // Update position on URL change
      window.addEventListener('popstate', () => navigateFromState())
      window.addEventListener('resize', () => computeTextFontSize())

      computeTextFontSize()

      setupScroller()
      setupNavInputBindings(deck, pages)

      // HACK needed to avoid Safari crash due to excessive layout.
      document.body.classList.remove('loading')
    })
  })
}
export default bespokeMobile
