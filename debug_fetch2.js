const urls = [
  'http://localhost:2004/Portfolio/count',
  'http://localhost:2004/api/portfolio/count'
];

(async () => {
  for (const u of urls) {
    try {
      const r = await fetch(u);
      console.log('---', u, 'status', r.status);
      console.log(await r.text());
    } catch (e) {
      console.error('ERR', u, e.message);
    }
  }
})();
