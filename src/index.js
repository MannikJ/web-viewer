import Viewer from "./Viewer";

const viewer = new Viewer();

// const file = "./examples/1801af15-128e-4cbd-9eed-cf05e6233abd.vbf";
const file = "./examples/3DL-12447.vmj";
// const file = "./examples/test.vbf";

viewer.init(document.querySelector("#viewer-scene-container"), file);
