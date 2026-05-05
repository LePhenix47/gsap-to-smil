type ElementPair = {
  gsapElement: Element
  smilElement: Element
  label?: string
}

type FramePairSample = {
  label: string
  gsapLeft: number
  gsapTop: number
  smilLeft: number
  smilTop: number
  deltaX: number
  deltaY: number
}

export type FrameSample = {
  timestamp: number
  elapsed: number
  pairs: FramePairSample[]
}

export type SampleOptions = {
  pairs: ElementPair[]
  duration: number
  fps?: number
}

export class AnimationDebugger {
  static sample(options: SampleOptions): Promise<FrameSample[]> {
    const fps = options.fps ?? 60
    const frameInterval = 1000 / fps

    const samples: FrameSample[] = []
    const startTime = performance.now()

    return new Promise((resolve) => {
      let lastFrameTime = 0

      const onFrame = (now: number) => {
        const elapsed = (now - startTime) / 1000

        if (now - lastFrameTime >= frameInterval) {
          lastFrameTime = now

          const framePairs: FramePairSample[] = options.pairs.map((pair, i) => {
            const gsapRect = pair.gsapElement.getBoundingClientRect()
            const smilRect = pair.smilElement.getBoundingClientRect()

            return {
              label: pair.label ?? `target[${i}]`,
              gsapLeft: gsapRect.left,
              gsapTop: gsapRect.top,
              smilLeft: smilRect.left,
              smilTop: smilRect.top,
              deltaX: Math.abs(gsapRect.left - smilRect.left),
              deltaY: Math.abs(gsapRect.top - smilRect.top),
            }
          })

          samples.push({
            timestamp: now,
            elapsed: Math.round(elapsed * 1000) / 1000,
            pairs: framePairs,
          })
        }

        if (elapsed >= options.duration) {
          resolve(samples)
        } else {
          requestAnimationFrame(onFrame)
        }
      }

      requestAnimationFrame(onFrame)
    })
  }
}
