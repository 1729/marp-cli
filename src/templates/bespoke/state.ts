import { readQuery, setQuery } from './utils'

export interface BespokeStateOption {
  history?: boolean
}

const coerceInt = (ns: string) => {
  const coerced = Number.parseInt(ns, 10)
  return Number.isNaN(coerced) ? null : coerced
}

const bespokeState = (opts: BespokeStateOption = {}) => {
  const options: BespokeStateOption = { history: true, ...opts }
  const deckTitle = document.title

  return (deck) => {
    let internalNavigation = true

    const navInternally = (action: () => any) => {
      const previous = internalNavigation

      try {
        internalNavigation = true
        return action()
      } finally {
        internalNavigation = previous
      }
    }

    const setPageTitle = (deck, index: number) => {
      if (index === 0) {
        document.title = deckTitle
      } else {
        const header =
          deck.slides[index].querySelector('h1') ||
          deck.slides[index].querySelector('h2') ||
          deck.slides[index].querySelector('h3') ||
          deck.slides[index].querySelector('h4') ||
          deck.slides[index].querySelector('h5') ||
          deck.slides[index].querySelector('h6')

        if (header) document.title = `${header.innerHTML} | ${deckTitle}`
      }
    }

    const activateSlide = (index: number, fragment: number | null) => {
      const { min, max } = Math
      const { fragments, slides } = deck
      const idx = max(0, min(index, slides.length - 1))
      const frag = max(0, min(fragment || 0, fragments[idx].length - 1))

      if (idx !== deck.slide() || frag !== deck.fragmentIndex) {
        deck.slide(idx, { fragment: frag })
        setPageTitle(deck, idx)
      }
    }

    const parseState = (opts: any = { fragment: true }) => {
      const parts = location.pathname.split('/')

      const pageParts = parts[parts.length - 1].split('.')
      const page = (coerceInt(pageParts[0]) || 1) - 1
      const fragment = opts.fragment ? coerceInt(readQuery('f') || '') : null

      activateSlide(page, fragment)
    }

    deck.on('fragment', ({ index, fragmentIndex }) => {
      if (internalNavigation) return

      const parts = location.pathname.split('/')
      parts.pop()

      setPageTitle(deck, index)

      const newLocation = {
        ...location,
        pathname: parts.join('/') + `/${index + 1}`,
      }

      setQuery(
        { f: fragmentIndex === 0 || fragmentIndex.toString() },
        {
          location: newLocation,
          setter: (...args) =>
            options.history
              ? history.pushState(...args)
              : history.replaceState(...args),
        }
      )
    })

    setTimeout(() => {
      parseState()

      window.addEventListener('hashchange', () =>
        navInternally(() => {
          parseState({ fragment: false })
          setQuery({ f: undefined }) // f parameter has to remove
        })
      )

      window.addEventListener('popstate', () => {
        if (!internalNavigation) navInternally(() => parseState())
      })

      internalNavigation = false
    }, 0)
  }
}

export default bespokeState
