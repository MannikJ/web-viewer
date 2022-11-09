import {
  BufferGeometry,
  Float32BufferAttribute,
  Points,
  PointsMaterial
} from "three";

import Loader from "./Loader";

class VBF extends Loader {
  constructor(src, options) {
    super(src, options);
    this.createPointsMaterial();
    this.extensions = ["vbf"];
  }

  createPointsMaterial() {
    this.material = new PointsMaterial({
      color: "white",
      opacity: 0.5, // 0.5
      transparent: true,
      size: 0.5 // 0.125
    });
  }

  headerParser() {
    return this.newParser()
      .endianess("little")
      .uint16("id") // always 16982
      .uint8("version") // always 1
      .uint32("pointCount")
      .uint32("layerCount")
      .saveOffset("offset");
  }

  async parseHeader() {
    await super.parseHeader();
    if (this._header.id !== 16982) {
      throw new Error("File is corrupted");
    }

    return this._header;
  }

  async layerParser(offset) {
    return this.newParser()
      .endianess("little")
      .seek(offset || (await this.header()).offset)
      .uint32("pointCount")
      .floatle("z")
      .saveOffset("currentOffset");
  }

  async parseLayer(offset) {
    return (await this.layerParser(offset)).parse(await this.buffer());
  }

  vertexParser(layer) {
    return this.newParser()
      .endianess("little")
      .seek(layer.currentOffset)
      .array("xy", { type: "floatle", length: layer.pointCount * 2 })
      .saveOffset("currentOffset");
  }

  async vertices() {
    if (this._vertices) {
      return this._vertices;
    }
    this._vertices = await this.parseVertices();
    return this._vertices;
  }

  async parseVertices() {
    await this.buffer();
    console.time("parsing");
    await this.header();
    console.log(this._header);
    this._vertices = new Float32Array(this._header.pointCount * 3);
    this._layers = [];

    let verticesOffset = 0;
    let offset = this._header.offset;
    for (let i = 0; i < this._header.layerCount; i++) {
      // parse layer header
      const layer = await this.parseLayer(offset);
      this._layers.push(layer);
      //console.log(layer);
      // Parse points in layer
      const { xy, currentOffset } = await this.vertexParser(layer).parse(
        await this.buffer()
      );

      for (let i = 0; i < xy.length / 2; i++) {
        this._vertices[verticesOffset * 3 + 0] = xy[i * 2 + 0];
        this._vertices[verticesOffset * 3 + 1] = xy[i * 2 + 1];
        this._vertices[verticesOffset * 3 + 2] = layer.z;
        verticesOffset++;
      }

      offset = currentOffset;
    }
    console.timeEnd("parsing");
    return this._vertices;
  }

  getDataLabels() {
    const data = super.getDataLabels();
    return Object.assign(data, {
      Points: this._header.pointCount,
      Layers: this._header.layerCount
    });
  }

  async parse() {
    const vertices = await this.vertices();

    const geometry = new BufferGeometry();
    geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));

    return new Points(geometry, this.material);
  }

  addGUIControllers(folder, onChange) {
    super.addGUIControllers(folder, onChange);

    folder
      .add(this.material, "size", 0, 2)
      .step(0.05)
      .name("Point Size")
      .onChange(onChange);

    folder
      .add(this.material, "opacity", 0, 1)
      .name("Opacity")
      .onChange(onChange);
  }
}

export default VBF;
