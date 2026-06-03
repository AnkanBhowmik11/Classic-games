const fs = require('fs');
const { JSDOM } = require('jsdom');

const commonJs = fs.readFileSync('common.js', 'utf8');
const chessHtml = fs.readFileSync('chess.html', 'utf8');

const html = chessHtml.replace('<script src="common.js"></script>', `<script>${commonJs}</script>`);

const dom = new JSDOM(html, {
  url: "http://localhost/", // Fix for localStorage opaque origins
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

setTimeout(() => {
  try {
    dom.window.startChessGame();
  } catch (e) {
    console.error("Error starting game:", e);
  }
  const board = dom.window.document.getElementById('chessBoard');
  console.log("Children count:", board.children.length);
}, 500);
