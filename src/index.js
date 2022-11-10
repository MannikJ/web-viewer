import Viewer from "./Viewer";

const viewer = new Viewer();

// const file = "./files/1801af15-128e-4cbd-9eed-cf05e6233abd.vbf";
const file = "./files/3DL-12447.vmj";
// const file = "./files/test.vbf";

viewer.init(document.querySelector("#viewer-scene-container"), file);
