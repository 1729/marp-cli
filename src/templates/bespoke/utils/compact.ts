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

    const figureEl = slide.querySelector('section img')
    let contentEl

    if (figureEl) {
      // Slide with figure
      const figure = figureEl.getAttribute('src')

      contentEl = slide.querySelector('section p')?.parentElement

      if (contentEl) {
        let title

        for (const tagName of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']) {
          const titleEl = contentEl.querySelector(tagName)
          if (titleEl) {
            title = titleEl.textContent
            break
          }
        }

        let page = 0

        for (let i = 0; i < contentEl.children.length; i++) {
          let pageEl = contentEl.children[i]

          if (
            pageEl.tagName !== 'P' &&
            pageEl.tagName !== 'UL' &&
            pageEl.tagName !== 'OL'
          )
            continue
          if (figureEl.parentElement === pageEl) continue

          if (
            contentEl.children[i + 1] &&
            (contentEl.children[i + 1].tagName === 'UL' ||
              contentEl.children[i + 1].tagName === 'OL')
          ) {
            pageEl = document.createElement('div')
            const sublist = document.createElement(
              contentEl.children[i + 1].tagName
            )

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
              ul.setAttribute('start', i)
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
