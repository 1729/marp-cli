import JSZip from '../../utils/jszip'

import { buildCompactHeadersAndPages } from './utils/compact'

interface NavPoint {
  id: string
  playOrder: number
  label: string
  contentSrc: string
  subpoints: Array<NavPoint>
}

interface MetaItemEntry {
  id: string
  filename: string
  filetype: string
  inSpine: boolean
}

const tmpDiv = document.createElement('div')

function cleanHTML(h) {
  return h
    .replace(/<br>/g, '<br/>')
    .replace(/<(\/?)section([^>]*)>/g, '<$1div>')
    .replace(/<(\/?)foreignObject([^>]*)>/g, '<$1div>')
    .replace(/<(\/?)svg([^>]*)>/g, '<$1div>')
}

function HTMLEncode(s) {
  const el = tmpDiv
  el.innerText = el.textContent = s
  s = el.innerHTML
  return s
}

const epubBodyForHeaderAndPage = (header, headerIndex, page) => {
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">

<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <link type="text/css" rel="stylesheet" href="../Styles/styles.css"/>
  <title>${header.pageTitle}</title>
</head>

<body>
  <h1 class="title">${HTMLEncode(header.title)}</h1>
    ${
      header.figure !== null
        ? `
    <div class="figure">
      <img src="${header.figure}" alt="${header.title} Figure"/>
    </div>
  `
        : ''
    }
  ${cleanHTML(page.el.outerHTML)}
</body>
</html>
  `
}

// Generates the mobile view, by walking the existing deck and spinning out a whole
// different DOM.
const bespokeKindle = (deck) => {
  const [headers, pages] = buildCompactHeadersAndPages(deck)

  window['downloadKindlePackage'] = async () => {
    const ext = new Date().getTime()
    const zip = new JSZip()
    zip.file('mimetype', 'application/epub+zip')
    const oebps = zip.folder('OEBPS')
    const metainf = zip.folder('META-INF')
    metainf.file(
      'container.xml',
      `<?xml version="1.0" encoding="utf-8"?>
      <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
        <rootfiles>
          <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml" />
        </rootfiles>
      </container>`
    )
    const text = oebps.folder('Text')
    const textAssets = text.folder('assets')
    const styles = oebps.folder('Styles')
    const styleAssets = styles.folder('assets')
    const title = 'The Network State: How To Start a New Country' // TODO generalize
    const author = 'Balaji Srinivasan' // TODO generalize
    const description =
      'This book introduces the concept of the network state: a country you can start from your computer, a state that recruits like a startup, a nation built from the internet rather than disrupted by it.'
    const identifier = 'B09VPKZR3G'
    const navPoints: Array<NavPoint> = []
    const metaItems: Array<MetaItemEntry> = []

    let playOrder = 1

    metaItems.push({
      id: `cover`,
      filename: 'Text/cover.xhtml',
      filetype: 'application/xhtml+xml',
      inSpine: false, // Kind of a lie, but it's the only way to get the cover to show up as non-linear
    })

    text.file(
      'cover.xhtml',
      `<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">\n<html xmlns="http://www.w3.org/1999/xhtml"><head><title>${title}</title></head><body><p>Cover</p></body></html>`
    )

    const figures: Array<string | null> = [
      ...['assets/origins.svg'],
      ...headers.map((h) => h.figure),
    ]

    for (let i = 0; i < figures.length; i++) {
      const figure = figures[i]
      if (figure === null) continue

      const filename = decodeURIComponent(figure).replace(/^assets\//, '')

      try {
        const res = await fetch(figure)
        const buf = await res.arrayBuffer()
        textAssets.file(filename, buf)
      } catch (e) {
        console.warn(`Failed to fetch ${figure}`)

        if (filename.endsWith('svg')) {
          const EMPTY_SVG = `<?xml version="1.0" encoding="utf-8"?>
            <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" version="1.1" width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
              <rect width="100%" height="100%" fill="white" />
            </svg>`
          textAssets.file(filename, EMPTY_SVG)
        } else if (filename.endsWith('png')) {
          const EMPTY_PNG = atob(
            'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
          )
          textAssets.file(filename, EMPTY_PNG)
        } else if (filename.endsWith('gif')) {
          const EMPTY_GIF = atob(
            'R0lGODlhAQABAIAAAP///wAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw=='
          )
          textAssets.file(filename, EMPTY_GIF)
        }
      }
    }

    const fontRules: Array<string> = []

    // Download fonts
    for (let i = 0; i < document.styleSheets.length; i++) {
      const styleSheet = document.styleSheets[i]

      for (let j = 0; j < styleSheet.cssRules.length; j++) {
        const rule = styleSheet.cssRules[j] as CSSStyleRule

        if (rule instanceof CSSFontFaceRule) {
          const fontFaceRule = rule as CSSFontFaceRule

          if (fontFaceRule) {
            for (const src of fontFaceRule.style['src'].split(',')) {
              const path = src
                .trim()
                .replace(/url\(['"]?/, '')
                .replace(/['"]?\).*$/, '')

              if (path.startsWith('assets')) {
                const filename = decodeURIComponent(path).replace(
                  /^assets\//,
                  ''
                )

                try {
                  const res = await fetch(path)
                  const buf = await res.arrayBuffer()
                  styleAssets.file(filename, buf)

                  fontRules.push(fontFaceRule.cssText)
                } catch (e) {
                  console.warn('failed to fetch', path)
                }
              }
            }
          }
        }
      }
    }

    let tocLis = ''

    metaItems.push({
      id: `toc`,
      filename: 'Text/toc.xhtml',
      filetype: 'application/xhtml+xml',
      inSpine: true,
    })

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i]
      const headerIndex = i

      for (let j = 0; j < header.pages.length; j++) {
        const pageIndex = header.pages[j]
        if (pageIndex === 0) continue // Skip cover page

        const page = pages[pageIndex]

        if (page.chapter) {
          tocLis += `<li><a href="${headerIndex}_${pageIndex}.xhtml">${page.chapter}</a></li>`
        }
      }
    }

    text.file(
      'toc.xhtml',
      `<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
            <html xmlns="http://www.w3.org/1999/xhtml"><head><title>Table of Contents</title></head><body><p class="toc"><ol>${tocLis}</ol></p></body></html>`
    )

    let subpoints: Array<NavPoint> = []

    for (let i = 0; i < headers.length; i++) {
      const header = headers[i]
      const headerIndex = i

      for (let j = 0; j < header.pages.length; j++) {
        const pageIndex = header.pages[j]
        if (pageIndex === 0) continue // Skip cover page

        const page = pages[pageIndex]

        if (page.chapter) {
          subpoints = []

          navPoints.push({
            id: `page-${headerIndex}_${pageIndex}`,
            playOrder: playOrder++,
            label: `${page.chapter}`,
            contentSrc: `Text/${headerIndex}_${pageIndex}.xhtml`,
            subpoints,
          })
        } else if (j === 0) {
          // Emit entry for each header
          subpoints.push({
            id: `page-${headerIndex}_${pageIndex}`,
            playOrder: playOrder++,
            label: `${header.pageTitle}`,
            contentSrc: `Text/${headerIndex}_${pageIndex}.xhtml`,
            subpoints: [],
          })
        }

        metaItems.push({
          id: `page-${headerIndex}_${pageIndex}`,
          filename: `Text/${headerIndex}_${pageIndex}.xhtml`,
          filetype: 'application/xhtml+xml',
          inSpine: true,
        })

        if (!page.full) {
          text.file(
            `${headerIndex}_${pageIndex}.xhtml`,
            epubBodyForHeaderAndPage(header, headerIndex, page)
          )
        } else {
          const html: Array<string> = []
          for (let i = 0; i < page.el.children.length; i++) {
            html.push(cleanHTML(page.el.children[i].outerHTML))
          }

          text.file(
            `${headerIndex}_${pageIndex}.xhtml`,
            `<?xml version="1.0" encoding="utf-8"?>\n<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN" "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">
            <html xmlns="http://www.w3.org/1999/xhtml"><head><title>${
              header.pageTitle
            }</title></head><body>${html.join('\n')}</body></html>`
          )
        }
      }
    }

    metaItems.push({
      id: `styles`,
      filename: 'Styles/styles.css',
      filetype: 'text/css',
      inSpine: false,
    })

    styles.file(
      `styles.css`,
      `

${fontRules.join('\n')}

.title {
  font-size: 1.5em;
  margin: 0.25em 0;
  padding: 0;
  text-align: left;
  font-family: 'Suisse Works';
}

.figure {
  width: 60%;
  margin: 0 20%;
}

.figure img {
  width: 100%;
}
      `
    )

    const walkNavToXml = (navPoint) => {
      return `
      <navPoint id="${navPoint.id}" playOrder="${navPoint.playOrder}">
        <navLabel>
          <text>${navPoint.label}</text>
        </navLabel>
        <content src="${navPoint.contentSrc}" />
        ${navPoint.subpoints.map(walkNavToXml).join('\n')}
      </navPoint>`
    }

    const toc = `<?xml version="1.0" encoding="utf-8"?>
      <!DOCTYPE ncx PUBLIC "-//NISO//DTD ncx 2005-1//EN"
         "http://www.daisy.org/z3986/2005/ncx-2005-1.dtd">
      <ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1">
        <head>
          <meta name="dtb:uid" content="${identifier}" />
          <meta name="dtb:depth" content="2" />
          <meta name="dtb:totalPageCount" content="${playOrder}" />
          <meta name="dtb:maxPageNumber" content="${playOrder}" />
        </head>
      <docTitle>
        <text>${title}</text>
      </docTitle>
      <docAuthor>
        <text>${author}</text>
      </docAuthor>
      <navMap>
      ${navPoints.map(walkNavToXml).join('\n')}
      </navMap>
      </ncx>
    `

    oebps.file('toc.ncx', toc)
    oebps.file(
      'content.opf',
      `<?xml version="1.0" encoding="utf-8"?>
      <package xmlns="http://www.idpf.org/2007/opf" version="2.0" unique-identifier="BookId">
        <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:opf="http://www.idpf.org/2007/opf">
          <dc:title>${title}</dc:title>
          <dc:creator>${author}</dc:creator>
          <dc:language>en</dc:language>
          <dc:identifier id="BookId">${identifier}</dc:identifier>
          <dc:description>${description}</dc:description>
          <meta name="cover" content="cover-image" />
        </metadata>
        <manifest>
          <item id="ncx" href="toc.ncx" media-type="application/x-dtbncx+xml" />
          ${metaItems
            .map(
              (metaItem) => `
            <item id="${metaItem.id}" href="${metaItem.filename}" media-type="${metaItem.filetype}" />`
            )
            .join('\n')}
        </manifest>
        <spine toc="ncx">
          <itemref idref="cover" linear="no" />
          <itemref idref="toc" linear="no" />
          ${metaItems
            .filter((item) => item.inSpine)
            .map((item) => `<itemref idref="${item.id}" linear="yes"/>`)
            .join('\n')}
        </spine>
        <guide>
          <reference href="Text/cover.xhtml" type="cover" title="Cover" />
        </guide>
      </package>
`
    )

    zip.generateAsync({ type: 'blob' }).then(function (blob) {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `kindle-${ext}.epub`
      a.click()
    })
  }
}

export default bespokeKindle
