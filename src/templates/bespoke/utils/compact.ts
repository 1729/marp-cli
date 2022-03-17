export interface HeaderEntry {
  title: string | null
  figure: string | null
  pages: Array<number>
}

export interface PageEntry {
  el: HTMLElement
  page: number
  slide: number
  full: boolean
}

// Builds page and header entries which describes the top and bottom panes of the
// mobile view, based on the content of the deck.
export function buildCompactHeadersAndPages(
  deck
): [HeaderEntry[], PageEntry[]] {
  const pages: Array<PageEntry> = []
  const headers: Array<HeaderEntry> = []

  for (let slideIndex = 0; slideIndex < deck.slides.length; slideIndex++) {
    const slide = deck.slides[slideIndex]
    if (slide.querySelector("section[data-skip-mobile='true']")) continue

    const listSplitPoint = parseInt(
      slide
        .querySelector(`section[data-list-split]`)
        ?.getAttribute('data-list-split') || '5'
    )

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

        for (let i = 0; i < contentEl.children.length; i++) {
          let pageEl = contentEl.children[i]

          if (pageEl.tagName !== 'P' && pageEl.tagName !== 'UL') continue

          if (
            contentEl.children[i + 1] &&
            contentEl.children[i + 1].tagName === 'UL'
          ) {
            pageEl = document.createElement('div')
            const sublist = document.createElement('ul')

            pageEl.appendChild(contentEl.children[i].cloneNode(true))
            pageEl.appendChild(sublist)

            const ul = contentEl.children[i + 1]

            const lis = ul.children

            for (
              let j = 0, l = lis.length;
              j < Math.min(listSplitPoint, l);
              j++
            ) {
              sublist.appendChild(lis[0].cloneNode(true))
              lis[0].remove()
              if (lis.length === 0) i++
            }
          }

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
