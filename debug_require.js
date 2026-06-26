const ctrl = require('./controller/PortfolioController');
console.log(Object.keys(ctrl));
for (const k of Object.keys(ctrl)) {
  console.log(k, typeof ctrl[k]);
}
