import JSZip from '../../utils/jszip'

import {
  HeaderEntry,
  //PageEntry,
  buildCompactHeadersAndPages,
} from './utils/compact'

interface NavPoint {
  id: string
  playOrder: number
  label: string
  contentSrc: string
  subpoints: Array<NavPoint>
}

interface ChapterEntry {
  title: string
  headers: Array<HeaderEntry>
}

interface MetaItemEntry {
  id: string
  filename: string
  filetype: string
}

// Generates the mobile view, by walking the existing deck and spinning out a whole
// different DOM.
const bespokeKindle = (deck) => {
  const [headers, pages] = buildCompactHeadersAndPages(deck)
  window['downloadKindlePackage'] = () => {
    const ext = new Date().getTime()
    const zip = new JSZip()
    const oebps = zip.folder('OEBPS')
    const metainf = oebps.folder('META-INF')
    const text = oebps.folder('Text')
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

    const chapters: Array<ChapterEntry> = [
      { title: 'Chapter 1: The Network State', headers },
    ]

    for (let iChapter = 0; iChapter < chapters.length; iChapter++) {
      const chapter = chapters[iChapter]
      const chapterHeaders = chapter.headers
      const subpoints: Array<NavPoint> = []

      navPoints.push({
        id: `chapter-${iChapter + 1}`,
        playOrder: playOrder++,
        label: chapters[iChapter].title,
        contentSrc: `Text/chapter-${iChapter + 1}.xhtml`,
        subpoints,
      })

      metaItems.push({
        id: `chapter-${iChapter + 1}`,
        filename: `Text/chapter-${iChapter + 1}.xhtml`,
        filetype: 'application/xhtml+xml',
      })

      text.file(
        `chapter-${iChapter + 1}.xhtml`,
        `<html><body>Chapter ${iChapter + 1}</body></html>`
      )

      for (let i = 0; i < chapterHeaders.length; i++) {
        const header = chapterHeaders[i]
        const headerIndex = headers.indexOf(header)

        for (let j = 0; j < header.pages.length; j++) {
          const pageIndex = header.pages[j]
          const page = pages[pageIndex]

          if (page.full) continue

          subpoints.push({
            id: `${headerIndex}.${pageIndex}`,
            playOrder: playOrder++,
            label: j === 0 ? `${header.title}` : `${header.title} | ${j + 1}`,
            contentSrc: `Text/${headerIndex}_${pageIndex}.xhtml`,
            subpoints: [],
          })

          metaItems.push({
            id: `page-${headerIndex}_${pageIndex}`,
            filename: `Text/${headerIndex}_${pageIndex}.xhtml`,
            filetype: 'application/xhtml+xml',
          })

          text.file(
            `${headerIndex}_${pageIndex}.xhtml`,
            `<html><body>Hello ${headerIndex} ${pageIndex}</body></html>`
          )
        }
      }
    }

    metaItems.push({
      id: `styles`,
      filename: 'Styles/styles.css',
      filetype: 'text/css',
    })

    styles.file(`styles.css`, 'h1 {}')

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
          ${chapters.map(
            (chapter, i) => `
            <itemref idref="chapter-${i + 1}" />`
          )}
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
