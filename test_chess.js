const fs = require('fs');
const { JSDOM } = require('jsdom');

const html = fs.readFileSync('chess.html', 'utf8');

const dom = new JSDOM(html, {
  runScripts: "dangerously",
  resources: "usable"
});

dom.window.addEventListener('error', event => {
  console.error('JSDOM Error:', event.error);
});

// Mock some things
dom.window.STORE = { progress: {}, sessions: {}, settings: {} };
dom.window.syncUp = () => {};
dom.window.saveLocalStore = () => {};
dom.window.initCommon = () => {};
dom.window.openChessSetup = () => {};
dom.window.confirm = () => true;
dom.window.alert = console.log;

setTimeout(() => {
  console.log("Starting chess game...");
  try {
    dom.window.startChessGame();
    console.log("Board child element count:", dom.window.document.getElementById('chessBoard').children.length);
  } catch(e) {
    console.error("Execution error:", e);
  }
}, 1000);
