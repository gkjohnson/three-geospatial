import { forwardRef, useEffect, useMemo, type ReactNode } from 'react'
import { Group, Matrix4, Vector3 } from 'three'
import { type SetOptional } from 'type-fest'

import { Ellipsoid } from '../Ellipsoid'
import { Geodetic, type GeodeticLike } from '../Geodetic'

const matrixScratch = /*#__PURE__*/ new Matrix4()
const geodeticScratch = /*#__PURE__*/ new Geodetic()
const vectorScratch = /*#__PURE__*/ new Vector3()

class EastNorthUpFrameImpl extends Group {
  set(
    longitude: number,
    latitude: number,
    height: number,
    ellipsoid = Ellipsoid.WGS84
  ): void {
    // TODO: Support nesting
    const position = geodeticScratch
      .set(longitude, latitude, height)
      .toECEF(vectorScratch)
    const matrix = ellipsoid.getEastNorthUpFrame(position, matrixScratch)
    matrix.decompose(this.position, this.quaternion, this.scale)
  }
}

export interface EastNorthUpFrameProps
  extends SetOptional<GeodeticLike, 'height'> {
  ellipsoid?: Ellipsoid
  children?: ReactNode
}

export const EastNorthUpFrame = forwardRef<
  EastNorthUpFrameImpl,
  EastNorthUpFrameProps
>(function EastNorthUpFrame(
  { longitude, latitude, height = 0, ellipsoid = Ellipsoid.WGS84, children },
  forwardedRef
) {
  const group = useMemo(() => new EastNorthUpFrameImpl(), [])

  useEffect(() => {
    group.set(longitude, latitude, height, ellipsoid)
  }, [longitude, latitude, height, ellipsoid, group])

  return (
    <primitive ref={forwardedRef} object={group}>
      {children}
    </primitive>
  )
})