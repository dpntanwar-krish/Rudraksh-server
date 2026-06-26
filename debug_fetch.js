const urls = [
  server_url + '/',
  server_url + '/Enquiry/Eall',
  server_url + '/Slider/all',
  server_url + '/File/files',
  server_url + '/Video/videos',
  server_url + '/News/all',
  server_url + '/Portfolio?counts=true',
  server_url + '/api/portfolio?counts=true'
];

(async () => {
  for (const u of urls) {
    try {
      const r = await fetch(u);
      console.log('---', u, 'status', r.status);
      const t = await r.text();
      console.log(t.slice(0, 400));
    } catch (e) {
      console.error('ERR', u, e.message);
    }
  }
})();
