import { setQuery, classPrefix } from './utils'
import {
  HeaderEntry,
  PageEntry,
  buildCompactHeadersAndPages,
} from './utils/compact'

const isMobile =
  /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
  document.location.search === '?mobile'

const isFirefox = navigator.userAgent.toLowerCase().indexOf('firefox') > -1

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
  const isLocalMarp =
    document.location.toString().indexOf('localhost:8080') > -1

  if (isLocalMarp) {
    return parseInt(document.location.hash.substring(1) || '1') - 1
  } else {
    const paths = location.pathname.split('/')
    const parts = paths[paths.length - 1].split('.')
    return (parseInt(parts[0]) || 1) - 1
  }
}

// Adds the longest block of text to the temporary sizer div to determine what
// is the minimum font size needed to avoid vertical scrolling across the whole
// book. The function then replaces the CSS variable --marpit-root-font-size appropriately
function computeTextFontSize(pages) {
  let longest = ''

  let chapter

  document
    .querySelectorAll(`.${classPrefix}mobile-page-content p`)
    .forEach((pageEl) => {
      const text = pageEl.textContent

      if (text !== null && text.length > longest.length) {
        longest = text + ' Extra Buffer Text'
        const pageIndex = parseInt(
          pageEl.parentElement?.parentElement?.getAttribute(
            'data-page-index'
          ) || '-1'
        )
        for (let i = pageIndex; i > 0; i--) {
          if (pages[i].chapter !== null) {
            chapter = pages[i].chapter
            break
          }
        }
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

  console.log(
    `Computing font size based on:\nChapter: ${chapter}\nSnippet: "${longest.substring(
      0,
      50
    )}"\nLength: ${longest.length}`
  )

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
    const varRegex = /--marpit-root-font-size: *[0-9]+px/

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

  if (isFirefox) {
    // Firefox horizontal scrolling is busted
    pageView.classList.add('no-x-scroll')
  }

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

  for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
    const { el: pageEl, full, iframe } = pages[pageIndex]

    if (full) {
      if (iframe !== null) {
        const el = document.createElement('iframe')
        el.setAttribute('src', iframe)
        el.setAttribute(
          'style',
          'width: 80%; height: 80%; aspect-ratio: 16 / 9; flex: 0;'
        )
        el.setAttribute('width', '1024')
        el.setAttribute('height', '768')
        el.setAttribute('allow', 'microphone; camera; vr; speaker;')
        const node = pageEl.children[0].cloneNode(true)
        node.appendChild(el)
        pageView.appendChild(node)
      } else {
        pageView.appendChild(pageEl.children[0].cloneNode(true))
      }
    } else {
      const sectionEl = document.createElement('section')
      sectionEl.classList.add(`${classPrefix}mobile-page`)
      addSpacer(sectionEl)

      const contentEl = document.createElement('div')
      contentEl.classList.add(`${classPrefix}mobile-page-content`)
      sectionEl.appendChild(contentEl)
      sectionEl.setAttribute('data-page-index', pageIndex.toString())

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
      const locationPageIndex = pageIndexFromLocation()

      if (locationPageIndex !== pageSpaceX) {
        document.title = `${
          headers[Math.floor(headerSpaceX)].pageTitle
        } | ${deckTitle}`

        const isLocalMarp =
          document.location.toString().indexOf('localhost:8080') > -1
        const isLocalStatic =
          !isLocalMarp && document.location.toString().indexOf('localhost') > -1

        if (isLocalMarp) {
          setQuery(
            {},
            {
              location: {
                ...location,
                hash: pageSpaceX === 0 ? '' : `#${pageSpaceX + 1}`,
              },
              setter: (...args) => history.pushState(...args),
            }
          )
        } else {
          const parts = location.pathname.split('/')
          parts.pop()

          setQuery(
            {},
            {
              location: {
                ...location,
                pathname:
                  parts.join('/') +
                  (pageSpaceX === 0
                    ? '/b'
                    : `/b/${pageSpaceX + 1}${isLocalStatic ? '.html' : ''}`),
              },
              setter: (...args) => history.pushState(...args),
            }
          )
        }
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

  let lastWheelTime = 0
  let isTrackpad = false

  document.body.addEventListener('wheel', (ev) => {
    // Rate limit trackpad scroll events
    if (isTrackpad && performance.now() - lastWheelTime < 500) return
    if (performance.now() - lastWheelTime < 100) return

    // Only firefox will do wheel events on a trackpad
    if (isTrackpad && !isFirefox) return

    lastWheelTime = performance.now()

    // Hack, two finger drag on trackpad detected by seeing low deltas
    if (
      !isTrackpad &&
      ((ev.deltaY !== 0 && Math.abs(ev.deltaY) <= 3) ||
        (ev.deltaX !== 0 && Math.abs(ev.deltaX) <= 3))
    ) {
      isTrackpad = true
    }

    const e = ev as WheelEvent

    // Firefox disabled overflow scroll along x, so use wheel
    const delta = isFirefox
      ? Math.abs(e.deltaY) > Math.abs(e.deltaX)
        ? e.deltaY
        : e.deltaX
      : e.deltaY

    // Navigate
    let direction = 0

    if (delta > 0) direction = 1
    if (delta < 0) direction = -1
    if (!direction) return

    const pageView = document.querySelector(`.${classPrefix}mobile-pages`)
    if (pageView === null) return

    const locationPageIndex = pageIndexFromLocation()
    const pageWidth = pageView.clientWidth
    const newPageIndex = Math.min(
      pages.length,
      Math.max(0, locationPageIndex + direction)
    )

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

    const snapBookToClientX = (x) => {
      const pageView = document.querySelector(`.${classPrefix}mobile-pages`)
      if (pageView === null) return
      const pageWidth = pageView.clientWidth

      let bookOffsetPct = Math.max(
        0,
        Math.min(1, (x - sliderEl.offsetLeft) / sliderEl.offsetWidth)
      )

      // Snap to current page within a few pixels
      if (x >= startScrollSnapLowerX && x <= startScrollSnapUpperX) {
        bookOffsetPct = startScrollBookOffset
      }

      const pageIndex = Math.floor(bookOffsetPct * pages.length)
      setTimeout(() => (pageView.scrollLeft = pageIndex * pageWidth))
    }

    for (const event of ['mousedown', 'mousemove', 'mouseup']) {
      for (const el of [sliderEl, handleEl]) {
        el.addEventListener(event, (e) => {
          const me = e as MouseEvent
          if (me['sourceCapabilities']?.firesTouchEvents) return

          if (
            !me ||
            (event === 'mouseup' && (me.buttons & 1) === 1) ||
            (event !== 'mouseup' && (me.buttons & 1) === 0)
          )
            return

          snapBookToClientX(me.clientX)
          e.preventDefault()
          e.stopPropagation()

          if (event === 'mousedown') {
            tipEl.style.display = 'flex'
          } else if (event === 'mouseup') {
            tipEl.style.display = 'none'
          }
        })
      }
    }

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
      snapBookToClientX(e.targetTouches[0].clientX)
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
      window.addEventListener('resize', () => computeTextFontSize(pages))

      computeTextFontSize(pages)

      setupScroller()
      setupNavInputBindings(deck, pages)

      // HACK needed to avoid Safari crash due to excessive layout.
      document.body.classList.remove('loading')
    })
  })
}
export default bespokeMobile
