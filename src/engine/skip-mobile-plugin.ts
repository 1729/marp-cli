import { Marpit } from '@marp-team/marpit'
import type MarkdownIt from 'markdown-it'

interface SkipMobile {
  skipMobile: boolean
}

export default function skipMobilePlugin(md: MarkdownIt & { marpit: Marpit }) {
  md.marpit.customDirectives.local.skip_mobile = (value): SkipMobile => {
    if (value === 'true') {
      return { skipMobile: true }
    } else {
      return { skipMobile: false }
    }
  }

  md.core.ruler.after(
    'marpit_directives_apply',
    'marp_cli_skip_mobile',
    (state) => {
      if (state.inlineMode) return false

      for (const token of state.tokens) {
        const { marpitDirectives } = token.meta || {}

        if (marpitDirectives?.skipMobile) {
          token.attrSet(`data-skip-mobile`, `${marpitDirectives.skipMobile}`)
        }
      }

      return true
    }
  )
}
