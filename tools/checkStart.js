console.log("require.main===module?", require.main===module);
const mod = require("../src/index.js");
mod.startServer()
  .then(() => {
    console.log("startServer() resolved — server should be listening");
    console.log("Sleeping 30s to allow manual health check...");
    setTimeout(()=>{ console.log("Exiting after 30s"); process.exit(0); }, 30000);
  })
  .catch(err => {
    console.error("startServer() rejected:", err && err.message ? err.message : err);
    process.exit(1);
  });
