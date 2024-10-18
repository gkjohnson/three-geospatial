import {
  GizmoHelper,
  GizmoViewport,
  OrbitControls,
  RenderCubeTexture,
  Sphere,
  TorusKnot,
  type RenderCubeTextureApi
} from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { SMAA, ToneMapping } from '@react-three/postprocessing'
import { type StoryFn } from '@storybook/react'
import { useControls } from 'leva'
import { ToneMappingMode } from 'postprocessing'
import { Suspense, useEffect, useMemo, useRef, useState, type FC } from 'react'
import { Matrix4, MeshStandardMaterial, Vector3 } from 'three'

import {
  Ellipsoid,
  Geodetic,
  getECIToECEFRotationMatrix,
  getMoonDirectionECEF,
  getSunDirectionECEF,
  radians,
  TilingScheme
} from '@geovanni/core'
import { CSM, useCSM } from '@geovanni/csm'
import {
  Depth,
  EffectComposer,
  LensFlare,
  Normal,
  useColorGradingControls
} from '@geovanni/effects'
import { LocalTangentFrame, useRendererControls } from '@geovanni/react'
import { IonTerrain, TerrainTile } from '@geovanni/terrain'

import { AerialPerspective } from '../../AerialPerspective'
import { type AerialPerspectiveEffect } from '../../AerialPerspectiveEffect'
import { Atmosphere, type AtmosphereImpl } from '../../Atmosphere'
import { computeSunLightColor } from '../../computeSunLightColor'
import { Irradiance } from '../../Irradiance'
import { Stars, type StarsImpl } from '../../Stars'
import { usePrecomputedTextures } from '../../usePrecomputedTextures'
import { useLocalDateControls } from '../useLocalDateControls'

const location = new Geodetic(radians(138.731), radians(35.363), 4500)
const position = location.toECEF()
const up = Ellipsoid.WGS84.getSurfaceNormal(position)

const tilingScheme = new TilingScheme()
const tile = tilingScheme.geodeticToTile(location, 7)
tile.y = tilingScheme.getSize(tile.z).y - tile.y - 1
const terrain = new IonTerrain({
  assetId: 1,
  apiToken: import.meta.env.STORYBOOK_ION_API_TOKEN
})

const tiles = tile
  .getChildren()
  .flatMap(tile => tile.getChildren())
  .flatMap(tile => tile.getChildren())
  .flatMap(tile => tile.getChildren())
  .flatMap(tile => tile.getChildren())

const Scene: FC = () => {
  useRendererControls({ exposure: 10, shadow: true })
  const lut = useColorGradingControls()

  const { normal, depth } = useControls('effect', {
    depth: false,
    normal: false,
    shadow: true
  })

  const { enable, sunIrradiance, skyIrradiance, transmittance, inscatter } =
    useControls('aerial perspective', {
      enable: true,
      sunIrradiance: true,
      skyIrradiance: true,
      transmittance: true,
      inscatter: true
    })

  const motionDate = useLocalDateControls()
  const sunDirectionRef = useRef(new Vector3())
  const moonDirectionRef = useRef(new Vector3())
  const rotationMatrixRef = useRef(new Matrix4())
  const atmosphereRef = useRef<AtmosphereImpl>(null)
  const aerialPerspectiveRef = useRef<AerialPerspectiveEffect>(null)
  const envMapRef = useRef<AtmosphereImpl>(null)
  const starsRef = useRef<StarsImpl>(null)

  const csm = useCSM()

  const material = useMemo(() => {
    const material = new MeshStandardMaterial({
      color: 'white'
    })
    csm.setupMaterial(material)
    return material
  }, [csm])

  const terrainMaterial = useMemo(() => {
    const material = new MeshStandardMaterial({
      color: 'gray'
    })
    csm.setupMaterial(material)
    return material
  }, [csm])

  const [envMap, setEnvMap] = useState<RenderCubeTextureApi | null>(null)
  useEffect(() => {
    material.envMap = envMap?.fbo.texture ?? null
    terrainMaterial.envMap = envMap?.fbo.texture ?? null
  }, [material, terrainMaterial, envMap])

  useEffect(() => {
    const intensity = skyIrradiance ? 1 : 0
    material.envMapIntensity = intensity
    terrainMaterial.envMapIntensity = intensity
  }, [material, terrainMaterial, skyIrradiance])

  useFrame(() => {
    const date = new Date(motionDate.get())
    getSunDirectionECEF(date, sunDirectionRef.current)
    getMoonDirectionECEF(date, moonDirectionRef.current)
    getECIToECEFRotationMatrix(date, rotationMatrixRef.current)
    if (atmosphereRef.current != null) {
      atmosphereRef.current.material.sunDirection = sunDirectionRef.current
      atmosphereRef.current.material.moonDirection = moonDirectionRef.current
    }
    if (envMapRef.current != null) {
      envMapRef.current.material.sunDirection = sunDirectionRef.current
      envMapRef.current.material.moonDirection = moonDirectionRef.current
    }
    if (starsRef.current != null) {
      starsRef.current.material.sunDirection = sunDirectionRef.current
      starsRef.current.setRotationFromMatrix(rotationMatrixRef.current)
    }
    if (aerialPerspectiveRef.current != null) {
      aerialPerspectiveRef.current.sunDirection = sunDirectionRef.current
    }
    csm.directionalLight.direction
      .copy(sunDirectionRef.current)
      .multiplyScalar(-1)
  })

  const effectComposer = useMemo(
    () => (
      <EffectComposer key={Math.random()} normalPass multisampling={0}>
        {enable && !normal && !depth && (
          <>
            <AerialPerspective
              ref={aerialPerspectiveRef}
              skyIrradiance={false}
              sunIrradiance={false}
              transmittance={transmittance}
              inscatter={inscatter}
            />
            <LensFlare />
          </>
        )}
        {depth && <Depth useTurbo />}
        {normal && <Normal />}
        {!normal && !depth && (
          <>
            <ToneMapping mode={ToneMappingMode.AGX} />
            {lut != null && lut}
            <SMAA />
          </>
        )}
      </EffectComposer>
    ),
    [enable, transmittance, inscatter, normal, depth, lut]
  )

  const textures = usePrecomputedTextures('/', true)
  const camera = useThree(({ camera }) => camera)
  useFrame(() => {
    computeSunLightColor(
      textures.transmittanceTexture,
      sunDirectionRef.current,
      camera,
      csm.directionalLight.mainLight.color
    )
  })

  return (
    <>
      <OrbitControls target={position} minDistance={1e3} />
      <GizmoHelper alignment='top-left' renderPriority={2}>
        <GizmoViewport />
      </GizmoHelper>
      <Atmosphere ref={atmosphereRef} />
      <Stars ref={starsRef} />
      <CSM.DirectionalLight intensity={sunIrradiance ? 1 : 0} />
      <Sphere
        args={[location.clone().setHeight(0).toECEF().length(), 360, 180]}
        material={terrainMaterial}
      />
      <LocalTangentFrame location={location}>
        <TorusKnot
          args={[200, 60, 256, 64]}
          position={[0, 0, 20]}
          material={material}
          receiveShadow
          castShadow
        />
        <primitive object={material}>
          <RenderCubeTexture ref={setEnvMap} position={position}>
            <Irradiance ref={envMapRef} />
          </RenderCubeTexture>
        </primitive>
      </LocalTangentFrame>
      {tiles.map(tile => (
        <Suspense key={`${tile.x}:${tile.y}:${tile.z}`}>
          <TerrainTile
            terrain={terrain}
            {...tile}
            computeVertexNormals
            material={terrainMaterial}
            receiveShadow
            castShadow
          />
        </Suspense>
      ))}
      {effectComposer}
    </>
  )
}

export const Shadow: StoryFn = () => {
  return (
    <Canvas
      gl={{
        antialias: false,
        depth: false,
        stencil: false,
        logarithmicDepthBuffer: true
      }}
      camera={{ near: 100, far: 1e6, position, up }}
    >
      <CSM far={1e5} margin={7000} mapSize={4096}>
        <Scene />
      </CSM>
    </Canvas>
  )
}