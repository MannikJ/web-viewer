import { FileLoader, Cache } from "three";
import { Parser } from "binary-parser";
class Loader {
  constructor(src, options) {
    this.src = src;
    this.options = Object.assign({ cache: true, meta: true }, options);
    this.showMeta = this.options.meta;
    Cache.enabled = this.options.cache;
    this.loader = new FileLoader();
    this.extensions = [];
  }

  canProcess(file = null) {
    file = file ?? this.src;
    const filename = file instanceof Blob ? file.name : file;
    return this.extensions.includes(filename.split(".").pop());
  }

  reset() {
    if (this.dataTable) {
      this.dataTable.remove();
    }
  }

  async buffer() {
    if (this._buffer) {
      // console.log("Already buffered!");
      return this._buffer;
    }

    this.reset();

    console.time("Buffering");

    this.loader.setResponseType("blob");

    try {
      this.blob =
        this.src instanceof Blob
          ? this.src
          : await this.loader.loadAsync(
              this.src // onLoad callback
            );
      this._buffer = Buffer.from(await this.blob.arrayBuffer());
      console.timeEnd("Buffering");
      return this._buffer;
    } catch (error) {
      console.log(error);
      throw error;
    }
  }

  newParser() {
    return new Parser();
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

  throw(message = "File is corrupted") {
    throw new Error(message);
  }

  async header() {
    if (this._header) {
      return this._header;
    }
    await this.parseHeader();
    return this._header;
  }

  async parseHeader() {
    this._header = await this.headerParser().parse(await this.buffer());
    return this._header;
  }

  async parse() {
    await this.header();
  }

  addGUIControllers(folder, onChange) {
    if (this.options.meta) {
      folder
        .add(this, "showMeta", this.showMeta)
        .name("Meta")
        .onChange((value) => this.toggleMeta());
    }
  }

  toggleMeta() {
    if (!this.dataTable) {
      return;
    }
    this.dataTable.style.visibility = this.showMeta ? "visible" : "hidden";
  }

  getDataLabels() {
    return {
      Filesize: (this.blob.size / 1000 ** 2).toFixed(2) + " MB"
    };
  }

  createDataTable() {
    const id = "viewer-data-table";
    const existing = document.getElementById(id);
    if (existing) {
      existing.remove();
    }
    this.dataTable = document.createElement("table");
    this.dataTable.id = id;
    this.dataTable.style.position = "absolute";
    this.dataTable.style.left = "5px";
    this.dataTable.style.bottom = "5px";
    this.toggleMeta();

    document.body.appendChild(this.dataTable);

    const dataLabels = this.getDataLabels();
    for (const key in dataLabels) {
      this.addDataRow(key, dataLabels[key]);
    }
  }

  addDataRow(key, value, index = null) {
    const row = document.createElement("tr");
    const keyColumn = document.createElement("td");
    const valueColumn = document.createElement("td");
    row.append(keyColumn, valueColumn);
    const color = "lightgray";
    const fontSize = "small";
    keyColumn.textContent = key + ":";
    keyColumn.style.textAlign = "left";
    keyColumn.style.color = color;
    keyColumn.style.fontSize = fontSize;
    valueColumn.textContent = value;
    valueColumn.style.textAlign = "right";
    valueColumn.style.color = color;
    valueColumn.style.fontSize = fontSize;
    const node = this.dataTable.children[index];
    this.dataTable.insertBefore(row, node);
  }
}

export default Loader;
