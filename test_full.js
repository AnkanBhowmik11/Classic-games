const fs = require('fs');
const { JSDOM } = require('jsdom');

const commonJs = fs.readFileSync('common.js', 'utf8');
const chessHtml = fs.readFileSync('chess.html', 'utf8');

const html = chessHtml.replace('<script src="common.js"></script>', `<script>${commonJs}</script>`);

const dom = new JSDOM(html, {
  runScripts: "dangerously",
  resources: "usable"
});

dom.window.addEventListener('error', event => {
  console.error('JSDOM Error:', event.error);
});

// Mock firebase
dom.window.firebase = {
  apps: [],
  initializeApp: () => {},
  auth: () => ({
    onAuthStateChanged: (cb) => {
      setTimeout(() => cb({uid: '123'}), 10);
    }
  }),
  firestore: () => ({
    collection: () => ({
      doc: () => ({
        collection: () => ({
          doc: () => ({
            get: () => Promise.resolve({exists: true, data: () => ({displayName: 'Test'})})
          })
        })
      })
    })
  })
};

// Mock Date.now if needed, not really needed
setTimeout(() => {
  const board = dom.window.document.getElementById('chessBoard');
  console.log("Children count:", board.children.length);
  const sq = board.children[0];
  if (sq) {
      console.log("Square clientWidth:", sq.clientWidth);
      console.log("Square clientHeight:", sq.clientHeight);
  }
  const outer = dom.window.document.querySelector('.chess-board-outer');
  console.log("Outer display:", dom.window.getComputedStyle(outer).display);
}, 500);
