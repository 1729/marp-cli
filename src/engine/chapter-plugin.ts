import { Marpit } from '@marp-team/marpit'
import type MarkdownIt from 'markdown-it'

interface Chapter {
  chapter: string
}

export default function chapterPlugin(md: MarkdownIt & { marpit: Marpit }) {
  md.marpit.customDirectives.local.chapter = (value): Chapter => {
    return { chapter: value.toString() }
  }

  md.core.ruler.after(
    'marpit_directives_apply',
    'marp_cli_chapter',
    (state) => {
      if (state.inlineMode) return false

      for (const token of state.tokens) {
        const { marpitDirectives } = token.meta || {}

        if (marpitDirectives?.chapter) {
          token.attrSet(`data-chapter`, `${marpitDirectives.chapter}`)
        }
      }

      return true
    }
  )
}
