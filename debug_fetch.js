const urls = [
  'http://localhost:2004/',
  'http://localhost:2004/Enquiry/Eall',
  'http://localhost:2004/Slider/all',
  'http://localhost:2004/File/files',
  'http://localhost:2004/Video/videos',
  'http://localhost:2004/News/all',
  'http://localhost:2004/Portfolio?counts=true',
  'http://localhost:2004/api/portfolio?counts=true'
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
