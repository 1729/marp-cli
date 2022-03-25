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
}

const tmpDiv = document.createElement('div')

function HTMLEncode(s) {
  const el = tmpDiv
  el.innerText = el.textContent = s
  s = el.innerHTML
  return s
}

const epubBodyForHeaderAndPage = (header, headerIndex, page) => {
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.1//EN"
  "http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd">

<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <link rel="stylesheet" href="../Styles/styles.css"></link>
  <title></title>
</head>

<body>
  <h1 class="title">${HTMLEncode(header.title)}</h1>
	<div class="figure">
    <img class="figure" src="${header.figure}"></img>
  </div>
  ${page.el.outerHTML}
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
    const oebps = zip.folder('OEBPS')
    const metainf = oebps.folder('META-INF')
    const text = oebps.folder('Text')
    const assets = text.folder('assets')
    const styles = oebps.folder('Styles')
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
    })

    text.file('cover.xhtml', '<html><body>Cover</body></html>')

    const figures: Array<string | null> = [
      ...['assets/origins.svg'],
      ...headers.map((h) => h.figure),
    ]

    for (const figure of figures) {
      if (figure === null) continue
      const filename = decodeURIComponent(figure).replace(/^assets\//, '')

      const res = await fetch(figure)
      const buf = await res.arrayBuffer()
      assets.file(filename, buf)
    }

    let subpoints: Array<NavPoint> = []
    let iChapter = 0

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
            id: `${headerIndex}.${pageIndex}`,
            playOrder: playOrder++,
            label: `${page.chapter}`,
            contentSrc: `Text/${headerIndex}_${pageIndex}.xhtml`,
            subpoints,
          })

          iChapter++
        } else if (j === 0) {
          // Emit entry for each header
          subpoints.push({
            id: `${headerIndex}.${pageIndex}`,
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
        })

        if (!page.full) {
          text.file(
            `${headerIndex}_${pageIndex}.xhtml`,
            epubBodyForHeaderAndPage(header, headerIndex, page)
          )
        } else {
          text.file(
            `${headerIndex}_${pageIndex}.xhtml`,
            `<html><body>${page.el.outerHTML}</body></html>`
          )
        }
      }
    }

    metaItems.push({
      id: `styles`,
      filename: 'Styles/styles.css',
      filetype: 'text/css',
    })

    styles.file(
      `styles.css`,
      `
.title {
  font-size: 1.5em;
  margin: 0.25em 0;
  padding: 0;
}

div.figure {
  width: 60%;
  margin: 0 20%;
}

img.figure {
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

    const toc = `
      <?xml version="1.0" encoding="utf-8"?>
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
    zip.file('mimetype', 'application/epub+zip')
    metainf.file(
      'container.xml',
      `
      <?xml version="1.0" encoding="utf-8"?>
      <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
        <rootfiles>
          <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml" />
        </rootfiles>
      </container>`
    )
    oebps.file(
      'content.opf',
      `
      <?xml version="1.0" encoding="utf-8"?>
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
          ${metaItems.map(
            (metaItem) => `
            <item id="${metaItem.id}" href="${metaItem.filename}" media-type="${metaItem.filetype}" />`
          )}
        </manifest>
        <spine toc="ncx">
          <itemref idref="cover" linear="no" />
        </spine>
        <reference href="Text/cover.xhtml" type="cover" title="Cover" />
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
