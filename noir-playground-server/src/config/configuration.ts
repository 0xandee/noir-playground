export default () => ({
  port: parseInt(process.env.PORT || "4000", 10) || 4000,
  noir: {
    dataPath: process.env.NOIR_DATA_PATH || "/data/noir-profiler",
    backendPath: process.env.NOIR_BACKEND_PATH || "/usr/local/bin/bb",
  },
  database: {
    url: process.env.DATABASE_URL,
  },
});
