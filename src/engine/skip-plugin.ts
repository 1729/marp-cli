import { Marpit } from '@marp-team/marpit'
import type MarkdownIt from 'markdown-it'

interface Skip {
  skip: boolean
}

export default function skipPlugin(md: MarkdownIt & { marpit: Marpit }) {
  md.marpit.customDirectives.local.skip = (value): Skip => {
    if (value === 'true') {
      return { skip: true }
    } else {
      return { skip: false }
    }
  }

  md.core.ruler.after(
    'marpit_directives_apply',
    'marp_cli_skip_mobile',
    (state) => {
      if (state.inlineMode) return false

      for (const token of state.tokens) {
        const { marpitDirectives } = token.meta || {}

        if (marpitDirectives?.skip) {
          token.attrSet(`data-skip`, `${marpitDirectives.skip}`)
        }
      }

      return true
    }
  )
}
