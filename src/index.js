// Entry point: do not start the agent here.
// Run the API server: npm run server
// Run the queue worker (one agent thread per task, clean context): npm run worker

module.exports = {
  createCoder: require("./coder").createCoder,
  tasks: require("./tasks"),
};
