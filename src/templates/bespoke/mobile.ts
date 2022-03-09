import { classPrefix } from './utils'

interface HeaderEntry {
  title: string | null
  figure: string | null
  pages: Array<number>
}

interface PageEntry {
  el: HTMLElement
  full: boolean
  dark: boolean
}

function computeTextFontSize() {
  let longest = ''

  document
    .querySelectorAll(`.${classPrefix}mobile-content p`)
    .forEach((pageEl) => {
      const text = pageEl.textContent

      if (text !== null && text.length > longest.length) {
        longest = text + ' Extra Buffer Text'
      }
    })

  const sizer = document.querySelector(`.${classPrefix}mobile-sizer`)
  if (sizer === null) return

  const sizerContent: HTMLElement | null = sizer.querySelector(
    `.${classPrefix}mobile-content`
  )
  if (sizerContent === null) return

  const pagesEl: HTMLElement | null = document.querySelector(
    `.${classPrefix}mobile-pages`
  )
  if (pagesEl === null) return

  let bestSize = 0

  for (const fontSize of [32, 30, 28, 26, 24, 20, 18, 16, 14, 12, 8]) {
    sizerContent.setAttribute('style', `font-size: ${fontSize}px`)
    sizerContent.innerText = longest

    if (sizer.scrollHeight <= sizer.clientHeight + 24) {
      bestSize = fontSize
      break
    }
  }

  pagesEl.setAttribute('style', `font-size: ${bestSize}px`)

  if (sizer !== null) {
    sizer.remove()
  }
}

// Generates the mobile view, by walking the existing deck and spinning out a whole
// different DOM.
const bespokeMobile = (deck) => {
  const pages: Array<PageEntry> = []
  const headers: Array<HeaderEntry> = []

  for (const slide of deck.slides) {
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
    }

    if (contentEl) {
      title = contentEl.querySelector('h1')?.textContent

      for (const pageEl of contentEl.querySelectorAll('p')) {
        pages.push({
          el: pageEl.cloneNode(true) as HTMLElement,
          full: figure === null,
          dark: false,
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
      }
    }
  }

  // Disable desktop slides
  deck.parent.setAttribute('style', 'display: none;')
  const root = document.createElement('div')
  root.classList.add(`${classPrefix}mobile-root`)

  const addSpacer = (el) => {
    const spacer = document.createElement('div')
    spacer.classList.add(`${classPrefix}mobile-spacer`)
    spacer.innerHTML = '&nbsp;'
    el.appendChild(spacer)
  }

  console.log(pages)
  console.log(headers)

  const headerView = document.createElement('div')
  headerView.classList.add(`${classPrefix}mobile-headers`)
  root.appendChild(headerView)

  const pageView = document.createElement('div')
  pageView.classList.add(`${classPrefix}mobile-pages`)
  root.appendChild(pageView)

  const sizerEl = document.createElement('section')
  sizerEl.classList.add(`${classPrefix}mobile-sizer`)
  addSpacer(sizerEl)
  const spacerContentEl = document.createElement('div')
  spacerContentEl.classList.add(`${classPrefix}mobile-content`)
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
      headerEl.appendChild(figureEl)
    }

    headerView.appendChild(headerEl)
  }

  for (const { el: pageEl, dark, full } of pages) {
    const sectionEl = document.createElement('section')

    if (!full) {
      addSpacer(sectionEl)
    }

    const contentEl = document.createElement('div')
    contentEl.classList.add(`${classPrefix}mobile-content`)
    sectionEl.appendChild(contentEl)

    if (dark) {
      sectionEl.classList.add(`${classPrefix}mobile-dark`)
    }

    contentEl.appendChild(pageEl)
    pageView.appendChild(sectionEl)
  }

  document.body.appendChild(root)

  setTimeout(() => {
    // HACK needed to avoid Safari crash due to excessive layout.
    document.body.classList.remove('loading')
    computeTextFontSize()
  })
}

export default bespokeMobile
