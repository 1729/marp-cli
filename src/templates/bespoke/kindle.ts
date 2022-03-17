import RTF from '../../utils/rtf'
import {
  //HeaderEntry,
  //PageEntry,
  buildCompactHeadersAndPages,
} from './utils/compact'

const formatCache = new Map()

const appendToDoc = (
  doc,
  text,
  size,
  bold = false,
  bulleted = false,
  para = false,
  url: string | null = null
) => {
  const key = `${size}-${bold}-${bulleted}-${para}`
  let format

  if (!formatCache.has(key)) {
    format = new RTF.Format()
    format.fontSize = size
    format.bold = bold
    format.bulleted = bulleted
    format.makeParagraph = para
    formatCache.set(key, format)
  } else {
    format = formatCache.get(key)
  }

  if (url != null) {
    // TODO this might mean we don't close paragraphs ending in links
    doc.writeLink(text, url, format)
  } else {
    doc.writeText(text, format)
  }
}

const addKindlePreamble = (script, rtfFileLocation) => {
  script.push('tell application "Keyboard Maestro Engine"')
  script.push('-- Open Kindle Create')
  script.push(
    'do script "<dict> <key>ActionUID</key> <integer>887</integer> <key>AllWindows</key> <false/> <key>AlreadyActivatedActionType</key> <string>Normal</string> <key>Application</key> <dict> <key>BundleIdentifier</key> <string>com.amazon.kc</string> <key>Name</key> <string>Kindle Create</string> <key>NewFile</key> <string>/Applications/Kindle Create.app</string> </dict> <key>MacroActionType</key> <string>ActivateApplication</string> <key>ReopenWindows</key> <false/> <key>TimeOutAbortsMacro</key> <true/> </dict>"'
  )
  script.push('-- Wait for kindle create to load')
  script.push(
    ' do script "<dict> <key>ActionUID</key> <integer>1339</integer> <key>Conditions</key> <dict> <key>ConditionList</key> <array> <dict> <key>ConditionType</key> <string>FrontWindow</string> <key>FrontWindowConditionType</key> <string>Exists</string> <key>IsFrontApplication</key> <true/> </dict> </array> <key>ConditionListMatch</key> <string>All</string> </dict> <key>MacroActionType</key> <string>PauseUntil</string> <key>TimeOutAbortsMacro</key> <true/> </dict> "'
  )
  script.push('-- Pause')
  script.push(
    'do script "<dict> <key>ActionUID</key> <integer>1340</integer> <key>MacroActionType</key> <string>Pause</string> <key>Time</key> <string>0.5</string> <key>TimeOutAbortsMacro</key> <true/> </dict>"'
  )
  script.push('-- Click new document')
  script.push(
    ' do script "<dict> <key>Action</key> <string>MoveAndClick</string> <key>ActionName</key> <string>Click New Document</string> <key>ActionUID</key> <integer>890</integer> <key>Button</key> <integer>0</integer> <key>ClickCount</key> <integer>2</integer> <key>DisplayMatches</key> <false/> <key>DragHorizontalPosition</key> <string>0</string> <key>DragVerticalPosition</key> <string>0</string> <key>Fuzz</key> <integer>15</integer> <key>HorizontalPositionExpression</key> <string>-283</string> <key>MacroActionType</key> <string>MouseMoveAndClick</string> <key>Modifiers</key> <integer>0</integer> <key>MouseDrag</key> <string>None</string> <key>Relative</key> <string>Window</string> <key>RelativeCorner</key> <string>TopRight</string> <key>RestoreMouseLocation</key> <false/> <key>VerticalPositionExpression</key> <string>81</string> </dict>"'
  )
  script.push('-- Click choose file')
  script.push(
    'do script "<dict> <key>Action</key> <string>MoveAndClick</string> <key>ActionName</key> <string>Click Choose File</string> <key>ActionUID</key> <integer>891</integer> <key>Button</key> <integer>0</integer> <key>ClickCount</key> <integer>1</integer> <key>DisplayMatches</key> <false/> <key>DragHorizontalPosition</key> <string>0</string> <key>DragVerticalPosition</key> <string>0</string> <key>Fuzz</key> <integer>15</integer> <key>HorizontalPositionExpression</key> <string>-142</string> <key>MacroActionType</key> <string>MouseMoveAndClick</string> <key>Modifiers</key> <integer>0</integer> <key>MouseDrag</key> <string>None</string> <key>Relative</key> <string>Window</string> <key>RelativeCorner</key> <string>BottomRight</string> <key>RestoreMouseLocation</key> <false/> <key>VerticalPositionExpression</key> <string>-26</string> </dict>"'
  )
  script.push('-- Pause')
  script.push(
    'do script "<dict> <key>ActionUID</key> <integer>1340</integer> <key>MacroActionType</key> <string>Pause</string> <key>Time</key> <string>0.5</string> <key>TimeOutAbortsMacro</key> <true/> </dict>"'
  )
  script.push('-- Enter filename')
  script.push(
    'do script "<dict> <key>Action</key> <string>ByTyping</string> <key>ActionName</key> <string>Enter file</string> <key>ActionUID</key> <integer>1329</integer> <key>MacroActionType</key> <string>InsertText</string> <key>TargetApplication</key> <dict/> <key>TargetingType</key> <string>Front</string> <key>Text</key> <string>' +
      rtfFileLocation +
      '</string> </dict>"'
  )
  script.push('-- Hit Enter')
  script.push(
    'do script "<dict> <key>ActionName</key> <string>Start conversion</string> <key>ActionUID</key> <integer>1330</integer> <key>KeyCode</key> <integer>36</integer> <key>MacroActionType</key> <string>SimulateKeystroke</string> <key>Modifiers</key> <integer>0</integer> <key>ReleaseAll</key> <false/> <key>TargetApplication</key> <dict/> <key>TargetingType</key> <string>Front</string> </dict>"'
  )
  script.push('-- Wait for conversion')
  script.push(
    'do script "<dict> <key>ActionName</key> <string>Wait for conversion</string> <key>ActionUID</key> <integer>1331</integer> <key>Conditions</key> <dict> <key>ConditionList</key> <array> <dict> <key>ConditionType</key> <string>Calculation</string> <key>Text</key> <string>WINDOWCOUNT() == 2</string> </dict> </array> <key>ConditionListMatch</key> <string>All</string> </dict> <key>MacroActionType</key> <string>PauseUntil</string> <key>TimeOutAbortsMacro</key> <true/> </dict>"'
  )
  script.push('-- Pause')
  script.push(
    'do script "<dict> <key>ActionUID</key> <integer>1340</integer> <key>MacroActionType</key> <string>Pause</string> <key>Time</key> <string>0.5</string> <key>TimeOutAbortsMacro</key> <true/> </dict>"'
  )
  script.push(' -- Click continue')
  script.push(
    'do script "<dict> <key>Action</key> <string>MoveAndClick</string> <key>ActionName</key> <string>Click continue</string> <key>ActionUID</key> <integer>1332</integer> <key>Button</key> <integer>0</integer> <key>ClickCount</key> <integer>1</integer> <key>DisplayMatches</key> <false/> <key>DragHorizontalPosition</key> <string>0</string> <key>DragVerticalPosition</key> <string>0</string> <key>Fuzz</key> <integer>15</integer> <key>HorizontalPositionExpression</key> <string>-115</string> <key>MacroActionType</key> <string>MouseMoveAndClick</string> <key>Modifiers</key> <integer>0</integer> <key>MouseDrag</key> <string>None</string> <key>Relative</key> <string>Window</string> <key>RelativeCorner</key> <string>TopRight</string> <key>RestoreMouseLocation</key> <false/> <key>VerticalPositionExpression</key> <string>50</string> </dict>"'
  )
  script.push('-- Pause')
  script.push(
    'do script "<dict> <key>ActionUID</key> <integer>1340</integer> <key>MacroActionType</key> <string>Pause</string> <key>Time</key> <string>0.5</string> <key>TimeOutAbortsMacro</key> <true/> </dict>"'
  )
  script.push('-- Click getting started')
  script.push(
    'do script "<dict> <key>Action</key> <string>MoveAndClick</string> <key>ActionName</key> <string>Click Getting Started</string> <key>ActionUID</key> <integer>1335</integer> <key>Button</key> <integer>0</integer> <key>ClickCount</key> <integer>1</integer> <key>DisplayMatches</key> <false/> <key>DragHorizontalPosition</key> <string>0</string> <key>DragVerticalPosition</key> <string>0</string> <key>Fuzz</key> <integer>15</integer> <key>HorizontalPositionExpression</key> <string>-120</string> <key>MacroActionType</key> <string>MouseMoveAndClick</string> <key>Modifiers</key> <integer>0</integer> <key>MouseDrag</key> <string>None</string> <key>Relative</key> <string>Window</string> <key>RelativeCorner</key> <string>BottomRight</string> <key>RestoreMouseLocation</key> <false/> <key>VerticalPositionExpression</key> <string>-46</string> </dict>"'
  )
  script.push('-- Pause')
  script.push(
    'do script "<dict> <key>ActionUID</key> <integer>1340</integer> <key>MacroActionType</key> <string>Pause</string> <key>Time</key> <string>0.5</string> <key>TimeOutAbortsMacro</key> <true/> </dict>"'
  )
  script.push('-- Focus chapter modal')
  script.push(
    'do script "<dict> <key>Action</key> <string>MoveAndClick</string> <key>ActionName</key> <string>Focus Chapter Popup</string> <key>ActionUID</key> <integer>1343</integer> <key>Button</key> <integer>0</integer> <key>ClickCount</key> <integer>1</integer> <key>DisplayMatches</key> <false/> <key>DragHorizontalPosition</key> <string>0</string> <key>DragVerticalPosition</key> <string>0</string> <key>Fuzz</key> <integer>15</integer> <key>HorizontalPositionExpression</key> <string>132</string> <key>MacroActionType</key> <string>MouseMoveAndClick</string> <key>Modifiers</key> <integer>0</integer> <key>MouseDrag</key> <string>None</string> <key>Relative</key> <string>Screen</string> <key>RelativeCorner</key> <string>TopLeft</string> <key>RestoreMouseLocation</key> <false/> <key>VerticalPositionExpression</key> <string>209</string> </dict>"'
  )
  script.push('-- Pause')
  script.push(
    'do script "<dict> <key>ActionUID</key> <integer>1340</integer> <key>MacroActionType</key> <string>Pause</string> <key>Time</key> <string>0.5</string> <key>TimeOutAbortsMacro</key> <true/> </dict>"'
  )
  script.push(' -- Click reject all')
  script.push(
    'do script "<dict> <key>ActionUID</key> <integer>1344</integer> <key>ButtonName</key> <string>Reject All</string> <key>MacroActionType</key> <string>PressButton</string> </dict>"'
  )
  script.push('-- Pause')
  script.push(
    'do script "<dict> <key>ActionUID</key> <integer>1340</integer> <key>MacroActionType</key> <string>Pause</string> <key>Time</key> <string>0.5</string> <key>TimeOutAbortsMacro</key> <true/> </dict>"'
  )
}

const addKindleSlideScript = (image, script) => {
  script.push('-- Move cursor in position for insert image')
  script.push(
    'do script "<dict> <key>ActionUID</key> <integer>1416</integer> <key>KeyCode</key> <integer>125</integer> <key>MacroActionType</key> <string>SimulateKeystroke</string> <key>Modifiers</key> <integer>0</integer> <key>ReleaseAll</key> <false/> <key>TargetApplication</key> <dict/> <key>TargetingType</key> <string>Front</string> </dict>"'
  )
  script.push('-- Click insert menu')
  script.push(
    'do script "<dict> <key>Action</key> <string>MoveAndClick</string> <key>ActionName</key> <string>Click Insert</string> <key>ActionUID</key> <integer>1417</integer> <key>Button</key> <integer>0</integer> <key>ClickCount</key> <integer>1</integer> <key>DisplayMatches</key> <false/> <key>DragHorizontalPosition</key> <string>0</string> <key>DragVerticalPosition</key> <string>0</string> <key>Fuzz</key> <integer>15</integer> <key>HorizontalPositionExpression</key> <string>233</string> <key>MacroActionType</key> <string>MouseMoveAndClick</string> <key>Modifiers</key> <integer>0</integer> <key>MouseDrag</key> <string>None</string> <key>Relative</key> <string>Window</string> <key>RelativeCorner</key> <string>TopLeft</string> <key>RestoreMouseLocation</key> <false/> <key>VerticalPositionExpression</key> <string>52</string> </dict>"'
  )
  script.push('-- Pause')
  script.push(
    'do script "<dict> <key>ActionUID</key> <integer>1340</integer> <key>MacroActionType</key> <string>Pause</string> <key>Time</key> <string>0.5</string> <key>TimeOutAbortsMacro</key> <true/> </dict>"'
  )
  script.push('-- Move into insert menu')
  script.push(
    'do script "<dict> <key>ActionUID</key> <integer>1420</integer> <key>KeyCode</key> <integer>125</integer> <key>MacroActionType</key> <string>SimulateKeystroke</string> <key>Modifiers</key> <integer>0</integer> <key>ReleaseAll</key> <false/> <key>TargetApplication</key> <dict/> <key>TargetingType</key> <string>Front</string> </dict>"'
  )
  script.push('-- Pause')
  script.push(
    'do script "<dict> <key>ActionUID</key> <integer>1340</integer> <key>MacroActionType</key> <string>Pause</string> <key>Time</key> <string>0.5</string> <key>TimeOutAbortsMacro</key> <true/> </dict>"'
  )
  script.push('-- Open image picker dialog')
  script.push(
    'do script "<dict> <key>ActionUID</key> <integer>1420</integer> <key>KeyCode</key> <integer>36</integer> <key>MacroActionType</key> <string>SimulateKeystroke</string> <key>Modifiers</key> <integer>0</integer> <key>ReleaseAll</key> <false/> <key>TargetApplication</key> <dict/> <key>TargetingType</key> <string>Front</string> </dict>"'
  )
  script.push('-- Pause')
  script.push(
    'do script "<dict> <key>ActionUID</key> <integer>1340</integer> <key>MacroActionType</key> <string>Pause</string> <key>Time</key> <string>0.5</string> <key>TimeOutAbortsMacro</key> <true/> </dict>"'
  )
  script.push('---- Enter image filename')
  script.push(
    'do script "<dict> <key>Action</key> <string>ByTyping</string> <key>ActionName</key> <string>Enter image filename</string> <key>ActionUID</key> <integer>1433</integer> <key>MacroActionType</key> <string>InsertText</string> <key>TargetApplication</key> <dict/> <key>TargetingType</key> <string>Front</string> <key>Text</key> <string>' +
      image +
      '</string> </dict>"'
  )
  script.push('-- Choose image')
  script.push(
    'do script "<dict> <key>ActionUID</key> <integer>1420</integer> <key>KeyCode</key> <integer>36</integer> <key>MacroActionType</key> <string>SimulateKeystroke</string> <key>Modifiers</key> <integer>0</integer> <key>ReleaseAll</key> <false/> <key>TargetApplication</key> <dict/> <key>TargetingType</key> <string>Front</string> </dict>"'
  )
  script.push('-- Pause')
  script.push(
    'do script "<dict> <key>ActionUID</key> <integer>1340</integer> <key>MacroActionType</key> <string>Pause</string> <key>Time</key> <string>0.5</string> <key>TimeOutAbortsMacro</key> <true/> </dict>"'
  )
  script.push('---- Set image to large')
  script.push(
    'do script "<dict> <key>Action</key> <string>MoveAndClick</string> <key>ActionName</key> <string>Set to Large</string> <key>ActionUID</key> <integer>1427</integer> <key>Button</key> <integer>0</integer> <key>ClickCount</key> <integer>1</integer> <key>DisplayMatches</key> <false/> <key>DragHorizontalPosition</key> <string>0</string> <key>DragVerticalPosition</key> <string>0</string> <key>Fuzz</key> <integer>15</integer> <key>HorizontalPositionExpression</key> <string>-105</string> <key>MacroActionType</key> <string>MouseMoveAndClick</string> <key>Modifiers</key> <integer>0</integer> <key>MouseDrag</key> <string>None</string> <key>Relative</key> <string>Window</string> <key>RelativeCorner</key> <string>TopRight</string> <key>RestoreMouseLocation</key> <false/> <key>VerticalPositionExpression</key> <string>500</string> </dict>"'
  )
  script.push('-- Select alt text input')
  script.push(
    'do script "<dict> <key>Action</key> <string>MoveAndClick</string> <key>ActionName</key> <string>Set to Large</string> <key>ActionUID</key> <integer>1427</integer> <key>Button</key> <integer>0</integer> <key>ClickCount</key> <integer>1</integer> <key>DisplayMatches</key> <false/> <key>DragHorizontalPosition</key> <string>0</string> <key>DragVerticalPosition</key> <string>0</string> <key>Fuzz</key> <integer>15</integer> <key>HorizontalPositionExpression</key> <string>-168</string> <key>MacroActionType</key> <string>MouseMoveAndClick</string> <key>Modifiers</key> <integer>0</integer> <key>MouseDrag</key> <string>None</string> <key>Relative</key> <string>Window</string> <key>RelativeCorner</key> <string>TopRight</string> <key>RestoreMouseLocation</key> <false/> <key>VerticalPositionExpression</key> <string>278</string> </dict>"'
  )
  script.push('---- Enter alt text')
  script.push(
    'do script "<dict> <key>Action</key> <string>ByTyping</string> <key>ActionUID</key> <integer>1425</integer> <key>MacroActionType</key> <string>InsertText</string> <key>TargetApplication</key> <dict/> <key>TargetingType</key> <string>Front</string> <key>Text</key> <string>This is the alt text</string> </dict>"'
  )
  script.push('-- Tab back to main pane')
  script.push(
    'do script "<dict> <key>ActionUID</key> <integer>1426</integer> <key>KeyCode</key> <integer>48</integer> <key>MacroActionType</key> <string>SimulateKeystroke</string> <key>Modifiers</key> <integer>512</integer> <key>ReleaseAll</key> <false/> <key>TargetApplication</key> <dict/> <key>TargetingType</key> <string>Front</string> </dict>"'
  )
  script.push('-- Move up to title')
  script.push(
    'do script "<dict> <key>ActionUID</key> <integer>1429</integer> <key>KeyCode</key> <integer>126</integer> <key>MacroActionType</key> <string>SimulateKeystroke</string> <key>Modifiers</key> <integer>0</integer> <key>ReleaseAll</key> <false/> <key>TargetApplication</key> <dict/> <key>TargetingType</key> <string>Front</string> </dict>"'
  )
  script.push('-- Go down to insert line above body')
  script.push(
    'do script "<dict> <key>ActionUID</key> <integer>1429</integer> <key>KeyCode</key> <integer>125</integer> <key>MacroActionType</key> <string>SimulateKeystroke</string> <key>Modifiers</key> <integer>0</integer> <key>ReleaseAll</key> <false/> <key>TargetApplication</key> <dict/> <key>TargetingType</key> <string>Front</string> </dict>"'
  )
  script.push('-- Insert line above body')
  script.push(
    'do script "<dict> <key>ActionName</key> <string>Add line above body</string> <key>ActionUID</key> <integer>1431</integer> <key>KeyCode</key> <integer>36</integer> <key>MacroActionType</key> <string>SimulateKeystroke</string> <key>Modifiers</key> <integer>0</integer> <key>ReleaseAll</key> <false/> <key>TargetApplication</key> <dict/> <key>TargetingType</key> <string>Front</string> </dict>"'
  )
  script.push('-- Move up to blank line')
  script.push(
    'do script "<dict> <key>ActionUID</key> <integer>1429</integer> <key>KeyCode</key> <integer>126</integer> <key>MacroActionType</key> <string>SimulateKeystroke</string> <key>Modifiers</key> <integer>0</integer> <key>ReleaseAll</key> <false/> <key>TargetApplication</key> <dict/> <key>TargetingType</key> <string>Front</string> </dict>"'
  )
  script.push('-- Move up to title')
  script.push(
    'do script "<dict> <key>ActionUID</key> <integer>1429</integer> <key>KeyCode</key> <integer>126</integer> <key>MacroActionType</key> <string>SimulateKeystroke</string> <key>Modifiers</key> <integer>0</integer> <key>ReleaseAll</key> <false/> <key>TargetApplication</key> <dict/> <key>TargetingType</key> <string>Front</string> </dict>"'
  )
  script.push('-- Click subtitle')
  script.push(
    'do script "<dict> <key>Action</key> <string>MoveAndClick</string> <key>ActionUID</key> <integer>1350</integer> <key>Button</key> <integer>0</integer> <key>ClickCount</key> <integer>1</integer> <key>DisplayMatches</key> <false/> <key>DragHorizontalPosition</key> <string>0</string> <key>DragVerticalPosition</key> <string>0</string> <key>Fuzz</key> <integer>15</integer> <key>HorizontalPositionExpression</key> <string>-140</string> <key>MacroActionType</key> <string>MouseMoveAndClick</string> <key>Modifiers</key> <integer>0</integer> <key>MouseDrag</key> <string>None</string> <key>Relative</key> <string>Window</string> <key>RelativeCorner</key> <string>TopRight</string> <key>RestoreMouseLocation</key> <false/> <key>VerticalPositionExpression</key> <string>610</string> </dict>"'
  )
  script.push('-- Go to next page')
  script.push(
    'do script "<dict> <key>ActionUID</key> <integer>860</integer> <key>KeyCode</key> <integer>121</integer> <key>MacroActionType</key> <string>SimulateKeystroke</string> <key>Modifiers</key> <integer>0</integer> <key>ReleaseAll</key> <false/> <key>TargetApplication</key> <dict/> <key>TargetingType</key> <string>Front</string> </dict>"'
  )
}

const writeDeckPage = (doc, script, title, bodyEl: HTMLElement, image) => {
  appendToDoc(doc, ' ' + title, 4, false, false, true) // Title is small due to kindle script wanting to avoid wrapping

  const walk = (parent, bold) => {
    for (let i = 0; i < parent.childNodes.length; i++) {
      const node = parent.childNodes[i]

      if (node.nodeType === Node.TEXT_NODE) {
        appendToDoc(doc, ' ' + node.textContent, 10, bold)
      } else if ((node as HTMLElement).tagName === 'A') {
        appendToDoc(
          doc,
          ' ' + node.textContent,
          10,
          bold,
          false,
          false,
          (node as HTMLElement).getAttribute('href') || null
        )
      } else if ((node as HTMLElement).tagName === 'EM') {
        walk(node, true)
      }
    }
  }

  doc.addCommand('\\pard')

  walk(bodyEl, false)

  doc.addCommand('\\par')

  doc.addPage()

  addKindleSlideScript(image, script)
}

// Generates the mobile view, by walking the existing deck and spinning out a whole
// different DOM.
const bespokeKindle = (deck) => {
  const [headers, pages] = buildCompactHeadersAndPages(deck)
  window['downloadKindlePackage'] = () => {
    const doc = new RTF.Doc()
    const script: Array<string> = []
    const ext = new Date().getTime()
    addKindlePreamble(script, `~/Downloads/kindle-${ext}.rtf`)

    const sourcePath =
      new URL(document.location.href).searchParams.get('source_path') ||
      '~/ostn/draftcontent/book'
    const chapterPath =
      new URL(document.location.href).searchParams.get('chapter_path') ||
      'A01-the-network-state'

    for (const header of headers) {
      for (const pageIndex of header.pages) {
        const page = pages[pageIndex]
        if (page.full) continue
        if (page.el.tagName === 'P') {
          writeDeckPage(
            doc,
            script,
            header.title,
            page.el,
            `${sourcePath}/${chapterPath}/${header.figure}`
          )
        }
      }
    }

    script.push('end tell')

    doc.createDocument((e, rtfContent) => {
      let blob = new Blob([rtfContent], { type: 'text/rtf' })
      let url = URL.createObjectURL(blob)
      let a = document.createElement('a')
      a.href = url
      a.download = `kindle-${ext}.rtf`
      a.click()

      blob = new Blob([script.join('\n')], {
        type: 'text/plain',
      })
      url = URL.createObjectURL(blob)
      a = document.createElement('a')
      a.href = url
      a.download = `kindle-${ext}.script`
      a.click()

      console.log(
        `To Run (copied to clipboard):\ncd ~/Downloads ; osascript kindle-${ext}.script`
      )

      navigator.clipboard.writeText(
        `cd ~/Downloads ; osascript kindle-${ext}.script`
      )
    })
  }
}

export default bespokeKindle
