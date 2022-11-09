import Loader from "./Loader";
import LZMA from "lzma-web";
import { BufferGeometry } from "three";
import { Parser } from "binary-parser";

class VMJ extends Loader {
  constructor(src, options) {
    super(src, options);
    this.extensions = ["vmj"];
  }

  getDataLabels() {
    const data = super.getDataLabels();

    return Object.assign(data, {
      Points: this._header.pointCount
    });
  }

  headerParser() {
    return this.newParser()
      .endianess("little")
      .uint16("id") // Always 19030
      .uint32("iniLength")
      .string("ini", {
        length: "iniLength",
        // Parse ini string into object structure:
        formatter: function (ini) {
          const configLines = ini.split("\n");
          // Create objects from lines
          return configLines.reduce((objects, configLine) => {
            const lastObject =
              objects.length > 0 ? objects[objects.length - 1] : null;

            // New object identifier
            if (configLine.match(/\[.*\]/)) {
              const objectId = configLine.replace("[", "").replace("]", "");
              const newObject = {
                id: objectId,
                attributes: {}
              };
              objects.push(newObject);
            } else if (lastObject) {
              // Config line
              const chunks = configLine.split("=").map((chunk) => chunk.trim());
              const key = chunks[0];
              if (key) {
                let value = chunks[1];
                value = isNaN(value) ? value : Number(value);

                lastObject.attributes[key] = value;
              }
            }

            return objects;
          }, []);
        }
      })
      .uint32("decompressedSize"); // 4 bytes
  }

  async parseHeader() {
    await super.parseHeader();
    // Move to canProcess() and use for file compatibility analysis
    if (this._header.id !== 19030) {
      this.throw();
    }

    this._header.pointCount = this._header.ini.reduce((start, object) => {
      const points = object.attributes.POINTS ?? 0;
      return start + points;
    }, 0);

    return this._header;
  }

  parser() {
    return new Parser()
      .nest("header", {
        type: this.headerParser()
      })
      .nest("data", {
        type: this.dataParser()
      });
  }

  dataParser() {
    const decompressedDataParser = Parser.start()
      .endianess("little")
      .string("text", {
        greedy: true
      });
    return (
      new Parser()
        .nest("header", {
          type: this.headerParser()
        })
        // Create new buffer for the compressed part at current offset:
        // .buffer("lzmaBuffer", ({ readUntil: "eof" }))
        .wrapped("data", {
          // Indicate how much data to read, like buffer()
          readUntil: "eof",
          // Define function to pre-process the data buffer
          wrapper: async function (buffer) {
            console.log(this.$parent);
            console.log("LZMA Buffer Length", buffer.length);
            // Decompress LZMA and return it for further parsing
            const lzma = new LZMA();
            return await lzma.decompress(buffer);
          },
          // The parser to run on the decompressed data
          type: decompressedDataParser
        })
    );
  }

  async parse() {
    const vmj = await this.parser().parse();
    console.log(vmj.header);
  }
}

export default VMJ;
