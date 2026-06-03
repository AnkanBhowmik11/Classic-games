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

// Mock firebase
dom.window.firebase = {
  apps: [],
  initializeApp: () => {},
  auth: () => ({
    onAuthStateChanged: (cb) => {
      // Simulate logged in user
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
  console.log("Setup modal active class:", dom.window.document.getElementById('chessSetupModal').classList.contains('active'));
  console.log("Start game button display:", dom.window.getComputedStyle(dom.window.document.querySelector('.btn-primary')).display);
}, 1000);
