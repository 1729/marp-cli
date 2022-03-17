import bespoke from 'bespoke'
import bespokeClasses from './classes'
import bespokeFragments from './fragments'
import bespokeFullscreen from './fullscreen'
import bespokeInactive from './inactive'
import bespokeInteractive from './interactive'
import bespokeKindle from './kindle'
import bespokeLoad from './load'
import bespokeMobile from './mobile'
import bespokeNavigation from './navigation'
import bespokeOSC from './osc'
import bespokePresenter from './presenter/'
import bespokeProgress from './progress'
import bespokeState from './state'
import bespokeSync from './sync'
import bespokeTouch from './touch'
import bespokeTransition from './transition'
import { getViewMode, popQuery, setViewMode, viewModes } from './utils'
import bespokeWakeLock from './wake-lock'

const parse = (
  ...patterns: [
    [normalView: 1 | 0, presnterView: 1 | 0, nextView: 1 | 0],
    (...args: unknown[]) => void
  ][]
) => {
  const i = viewModes.findIndex((v) => getViewMode() === v)
  return patterns.map(([pat, plugin]) => pat[i] && plugin).filter((p) => p)
}

const bespokeTemplate = (
  target = document.getElementById('p')! // eslint-disable-line @typescript-eslint/no-non-null-assertion
) => {
  setViewMode()

  // Hacky, dispatch based on mobile browser
  const isMobile =
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    document.location.search === '?mobile'

  if (isMobile) {
    return bespoke.from(
      target,
      parse([[1, 1, 1], bespokeClasses], [[1, 1, 0], bespokeMobile])
    )
  } else {
    const key = popQuery('sync') || undefined
    return bespoke.from(
      target,
      parse(
        //   P  N
        [[1, 1, 0], bespokeSync({ key })],
        [[1, 1, 1], bespokePresenter(target)],
        [[1, 1, 0], bespokeInteractive],
        [[1, 1, 1], bespokeClasses],
        [[1, 0, 0], bespokeInactive()],
        [[1, 1, 1], bespokeLoad],
        [[1, 1, 1], bespokeState({ history: false })],
        [[1, 1, 0], bespokeNavigation()],
        [[1, 1, 0], bespokeFullscreen],
        [[1, 0, 0], bespokeProgress],
        [[1, 1, 0], bespokeTouch()],
        [[1, 0, 0], bespokeOSC()],
        [[1, 0, 0], bespokeTransition],
        [[1, 1, 1], bespokeFragments],
        [[1, 1, 0], bespokeWakeLock],
        [[1, 1, 0], bespokeKindle]
      )
    )
  }
}

export default bespokeTemplate
