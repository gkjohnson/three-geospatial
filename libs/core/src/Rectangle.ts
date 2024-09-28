import { Cartographic } from './Cartographic'

export type RectangleTuple = [number, number, number, number]

export interface RectangleLike {
  readonly west: number
  readonly south: number
  readonly east: number
  readonly north: number
}

export class Rectangle {
  static readonly MAX: Readonly<Rectangle> = Object.freeze(
    new Rectangle(
      Cartographic.MIN_LONGITUDE,
      Cartographic.MIN_LATITUDE,
      Cartographic.MAX_LONGITUDE,
      Cartographic.MAX_LATITUDE
    )
  )

  constructor(
    public west = 0,
    public south = 0,
    public east = 0,
    public north = 0
  ) {}

  get width(): number {
    let east = this.east
    if (east < this.west) {
      east += Math.PI * 2
    }
    return east - this.west
  }

  get height(): number {
    return this.north - this.south
  }

  set(west: number, south: number, east: number, north: number): this {
    this.west = west
    this.south = south
    this.east = east
    this.north = north
    return this
  }

  clone(): Rectangle {
    return new Rectangle(this.west, this.south, this.east, this.north)
  }

  copy(other: RectangleLike): this {
    this.west = other.west
    this.south = other.south
    this.east = other.east
    this.north = other.north
    return this
  }

  equals(other: RectangleLike): boolean {
    return (
      other.west === this.west &&
      other.south === this.south &&
      other.east === this.east &&
      other.north === this.north
    )
  }

  fromArray(array: readonly number[], offset = 0): this {
    this.west = array[offset]
    this.south = array[offset + 1]
    this.east = array[offset + 2]
    this.north = array[offset + 3]
    return this
  }

  toArray(array: number[] = [], offset = 0): number[] {
    array[offset] = this.west
    array[offset + 1] = this.south
    array[offset + 2] = this.east
    array[offset + 3] = this.north
    return array
  }

  *[Symbol.iterator](): Generator<number> {
    yield this.west
    yield this.south
    yield this.east
    yield this.north
  }
}