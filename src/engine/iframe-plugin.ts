import { Marpit } from '@marp-team/marpit'
import type MarkdownIt from 'markdown-it'

interface Iframe {
  iframe: string
}

export default function iframePlugin(md: MarkdownIt & { marpit: Marpit }) {
  md.marpit.customDirectives.local.iframe = (value): Iframe => {
    return {
      iframe: value.toString(),
    }
  }

  md.core.ruler.after(
    'marpit_directives_apply',
    'marp_cli_iframe_mobile',
    (state) => {
      if (state.inlineMode) return false

      for (const token of state.tokens) {
        const { marpitDirectives } = token.meta || {}

        if (marpitDirectives?.iframe) {
          token.attrSet(`data-iframe`, `${marpitDirectives.iframe}`)
        }
      }

      return true
    }
  )
}
