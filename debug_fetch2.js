const urls = [
  server_url + '/Portfolio/count',
  server_url + '/api/portfolio/count'
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
