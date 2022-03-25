export interface HeaderEntry {
  title: string | null
  pageTitle: string | null
  figure: string | null
  pages: Array<number>
}

export interface PageEntry {
  el: HTMLElement
  page: number
  slide: number
  full: boolean
  chapter: string | null
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

    const chapter =
      slide
        .querySelector('section[data-chapter]')
        ?.getAttribute('data-chapter') || null

    const listSplitPoints = (
      slide
        .querySelector(`section[data-list-splits]`)
        ?.getAttribute('data-list-splits') || '5'
    )
      .split(',')
      .map((x) => parseInt(x))

    const figureEl = slide.querySelector('section img')
    let contentEl

    // Remove svg scaling hack from marp-svg-polyfill that breaks safari
    slide.querySelector('section')?.removeAttribute('style')

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

          const pushHeader = () => {
            if (figure != null) {
              // Page with figure
              if (
                headers.length === 0 ||
                headers[headers.length - 1].figure !== figure
              ) {
                headers.push({
                  title,
                  pageTitle: title,
                  figure,
                  pages: [pages.length - 1],
                })
              } else {
                headers[headers.length - 1].pages.push(pages.length - 1)
              }
            }
          }

          // Split up lists into multiple based on split points
          if (
            contentEl.children[i + 1] &&
            (contentEl.children[i + 1].tagName === 'UL' ||
              contentEl.children[i + 1].tagName === 'OL')
          ) {
            pageEl = document.createElement('div')
            pageEl.appendChild(contentEl.children[i].cloneNode(true))

            const list = contentEl.children[i + 1].cloneNode(true)
            const items = list.children
            const sublists: Array<HTMLElement> = []
            const itemsToRemove: Array<HTMLElement> = []
            let offset = -1

            for (let j = 0, l = listSplitPoints.length; j < l + 1; j++) {
              let sublist: HTMLElement | null = null
              const splitPoint = listSplitPoints[j]

              for (
                let k = 0;
                k < (j < l ? splitPoint : 1000) && offset < items.length - 1;
                k++
              ) {
                offset++

                if (j === 0) continue // Skip first list, which is retained in contentEl

                const item = items[offset]

                if (sublist === null) {
                  sublist = document.createElement(
                    contentEl.children[i + 1].tagName
                  )
                  if (sublist === null) continue

                  sublist.setAttribute('start', `${offset + 1}`)
                  sublists.push(sublist)
                }

                sublist.appendChild(item.cloneNode(true))
                itemsToRemove.push(item)
              }
            }

            for (const item of itemsToRemove) {
              list.removeChild(item)
            }

            pageEl.appendChild(list)
            i++

            pages.push({
              el: pageEl.cloneNode(true) as HTMLElement,
              slide: slideIndex,
              page,
              full: false,
              chapter,
            })

            pushHeader()

            for (const sublist of sublists) {
              page++

              pages.push({
                el: sublist,
                slide: slideIndex,
                page,
                full: false,
                chapter,
              })

              pushHeader()
            }
          } else {
            pages.push({
              el: pageEl.cloneNode(true) as HTMLElement,
              slide: slideIndex,
              page,
              full: false,
              chapter,
            })

            pushHeader()
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
        chapter,
      })

      let pageTitle = ''

      for (const tagName of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']) {
        const titleEl = slide.children[0].querySelector(tagName)
        if (titleEl) {
          pageTitle = titleEl.textContent
          break
        }
      }

      headers.push({
        title: null,
        pageTitle,
        figure: null,
        pages: [pages.length - 1],
      })
    }
  }

  return [headers, pages]
}
