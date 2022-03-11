import { setQuery, classPrefix } from './utils'

const waitForEvent = function (eventName, eventObj) {
  return new Promise((resolve) => {
    eventObj.addEventListener(eventName, resolve, { once: true })
  })
}

const toPaddedHex = (num: number) => {
  if (num < 16) {
    return `0${num.toString(16)}`.toUpperCase()
  } else {
    return num.toString(16).toUpperCase()
  }
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

interface HeaderEntry {
  title: string | null
  figure: string | null
  pages: Array<number>
}

interface PageEntry {
  el: HTMLElement
  page: number
  slide: number
  full: boolean
}

function coerceHexInt(ns: string) {
  const coerced = Number.parseInt(ns, 16)
  return Number.isNaN(coerced) ? null : coerced
}

function slideAndPageFromLocation(): Array<number> {
  const paths = location.pathname.split('/')
  const parts = paths[paths.length - 1].split('.')
  const slide = coerceHexInt(parts[0].substring(0, 2)) || 0
  const page = coerceHexInt(parts[0].substring(2)) || 0
  return [slide, page]
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

  if (sizer !== null) {
    sizer.remove()
  }
}

// Builds page and header entries which describes the top and bottom panes of the
// mobile view, based on the content of the deck.
function buildMobileHeadersAndPages(deck): [HeaderEntry[], PageEntry[]] {
  const pages: Array<PageEntry> = []
  const headers: Array<HeaderEntry> = []

  for (let slideIndex = 0; slideIndex < deck.slides.length; slideIndex++) {
    const slide = deck.slides[slideIndex]
    const figureEl = slide.querySelector("section[data-class='right'] figure")
    let contentEl

    let figure: string | null = null
    let title: string | null = null

    if (figureEl) {
      // Slide with figure
      const cssParts = figureEl.getAttribute('style').split(';')
      const backgroundImage = cssParts.find((part) =>
        part.includes('background-image:')
      )

      if (backgroundImage) {
        figure = backgroundImage.split(':')[1].replace(/['"]+/g, '')

        if (figure !== null && figure.startsWith('url(')) {
          figure = figure.slice(4, -1)
        }
      }

      contentEl = slide.querySelector(
        "section[data-class='right'] p"
      )?.parentElement

      if (contentEl) {
        title = contentEl.querySelector('h1')?.textContent

        let page = 0

        for (const pageEl of contentEl.querySelectorAll('p')) {
          pages.push({
            el: pageEl.cloneNode(true) as HTMLElement,
            slide: slideIndex,
            page,
            full: false,
          })

          if (figure != null) {
            // Page with figure
            if (
              headers.length === 0 ||
              headers[headers.length - 1].figure !== figure
            ) {
              headers.push({
                title,
                figure,
                pages: [pages.length - 1],
              })
            } else {
              headers[headers.length - 1].pages.push(pages.length - 1)
            }
          }

          page++
        }
      }
    } else {
      pages.push({
        el: slide.children[0].cloneNode(true) as HTMLElement,
        slide: slideIndex,
        page: 0,
        full: true,
      })

      headers.push({
        title: null,
        figure: null,
        pages: [pages.length - 1],
      })
    }
  }

  return [headers, pages]
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

// Sets up the requestAnimationFrame handler for dealing with scrolling the header
function runRAF(headers: Array<HeaderEntry>, pages: Array<PageEntry>) {
  const deckTitle = document.title
  const headerView = document.querySelector(`.${classPrefix}mobile-headers`)
  const pageView = document.querySelector(`.${classPrefix}mobile-pages`)

  if (pageView === null) return
  if (headerView === null) return

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

    // On page scrolls, update the history + title
    if (Number.isInteger(pageSpaceX)) {
      const page = pages[pageSpaceX]
      const slide = page.slide

      const [locationSlide, locationPage] = slideAndPageFromLocation()

      if (locationSlide !== slide || locationPage !== page.page) {
        const parts = location.pathname.split('/')
        parts.pop()

        document.title = `${
          headers[Math.floor(headerSpaceX)].title
        } | ${deckTitle}`

        const newLocation = {
          ...location,
          pathname:
            parts.join('/') + `/${toPaddedHex(slide)}${toPaddedHex(page.page)}`,
        }

        setQuery(
          {},
          {
            location: newLocation,
            setter: (...args) => history.pushState(...args),
          }
        )
      }
    }

    requestAnimationFrame(performScroll)
  }

  requestAnimationFrame(performScroll)
}

// Generates the mobile view, by walking the existing deck and spinning out a whole
// different DOM.
const bespokeMobile = (deck) => {
  const [headers, pages] = buildMobileHeadersAndPages(deck)

  // Disable desktop slides
  deck.parent.setAttribute('style', 'display: none;')
  buildMobileDOM(headers, pages)
  runRAF(headers, pages)

  const navigateFromState = () => {
    const pageView = document.querySelector(`.${classPrefix}mobile-pages`)
    if (pageView === null) return

    const [locationSlide, locationPage] = slideAndPageFromLocation()

    for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
      const page = pages[pageIndex]
      if (page.slide === locationSlide && page.page === locationPage) {
        const pageWidth = pageView.clientWidth
        // Not sure why this is needed, otherwise chrome is off by a page on initial load (maybe due to spacer?)
        setTimeout(() => (pageView.scrollLeft = pageIndex * pageWidth))
        break
      }
    }
  }

  // Wait a frame so layout runs
  setTimeout(() => {
    waitForDOMContentLoaded().then(() => {
      buildMobileStylesheet()

      // HACK needed to avoid Safari crash due to excessive layout.
      document.body.classList.remove('loading')

      // Restore position from URL on load
      navigateFromState()

      // Update position on URL change
      window.addEventListener('popstate', () => navigateFromState())

      computeTextFontSize()
    })
  })
}
export default bespokeMobile
