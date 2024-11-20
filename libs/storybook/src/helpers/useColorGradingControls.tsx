import { LUT, type LUTProps } from '@react-three/postprocessing'
import { type LUT3DEffect } from 'postprocessing'
import { forwardRef, useMemo, type ReactElement } from 'react'
import { suspend } from 'suspend-react'

import { axios } from '@geovanni/core'
import { useHaldLookupTexture } from '@geovanni/effects/react'

import { useControls } from './useControls'

interface Entry {
  category: string
  manufacturer: string
  file: string
}

const HaldLUT = forwardRef<
  LUT3DEffect,
  Omit<LUTProps, 'lut'> & {
    path: string
  }
>(function HaldLUT({ path, ...props }, forwardedRef) {
  const texture = useHaldLookupTexture(path)
  return <LUT ref={forwardedRef} lut={texture} {...props} />
})

export function useColorGradingControls(): ReactElement | null {
  const data = suspend(
    async () => (await axios<Entry[]>('/clut/index.json')).data,
    [useColorGradingControls]
  )

  const films = useMemo(
    () =>
      data
        .map(({ category, manufacturer, file }) => [
          file.slice(0, -4),
          `/clut/${category}/${manufacturer}/${file}`
        ])
        .sort(([a], [b]) => a.localeCompare(b))
        .reduce<Record<string, string>>(
          (films, [key, value]) => ({
            ...films,
            [key]: value
          }),
          {}
        ),
    [data]
  )

  const { enabled, film } = useControls(
    'color grading',
    {
      enabled: false,
      film: {
        options: films
      }
    },
    { collapsed: true },
    [films]
  )

  return useMemo(
    () => (enabled ? <HaldLUT path={film} /> : null),
    [enabled, film]
  )
}