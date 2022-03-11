import { Marpit } from '@marp-team/marpit'
import type MarkdownIt from 'markdown-it'

interface ListSplit {
  listSplit: number
}

export default function listSplitPlugin(md: MarkdownIt & { marpit: Marpit }) {
  md.marpit.customDirectives.local.list_split = (value): ListSplit => {
    return { listSplit: parseInt(value.toString(), 10) }
  }

  md.core.ruler.after(
    'marpit_directives_apply',
    'marp_cli_skip_mobile',
    (state) => {
      if (state.inlineMode) return false

      for (const token of state.tokens) {
        const { marpitDirectives } = token.meta || {}

        if (marpitDirectives?.listSplit) {
          token.attrSet(`data-list-split`, `${marpitDirectives.listSplit}`)
        }
      }

      return true
    }
  )
}
