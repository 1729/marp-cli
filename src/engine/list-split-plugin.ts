import { Marpit } from '@marp-team/marpit'
import type MarkdownIt from 'markdown-it'

interface ListSplit {
  listSplits: Array<number>
}

export default function listSplitPlugin(md: MarkdownIt & { marpit: Marpit }) {
  md.marpit.customDirectives.local.list_splits = (value): ListSplit => {
    return {
      listSplits: value
        .toString()
        .split(',')
        .map((v) => parseInt(v, 10)),
    }
  }

  md.core.ruler.after(
    'marpit_directives_apply',
    'marp_cli_list_split',
    (state) => {
      if (state.inlineMode) return false

      for (const token of state.tokens) {
        const { marpitDirectives } = token.meta || {}

        if (marpitDirectives?.listSplits) {
          token.attrSet(
            `data-list-splits`,
            `${marpitDirectives.listSplits.join(',')}`
          )
        }
      }

      return true
    }
  )
}
