module.exports = {
  apps: [
    {
      name: "spotify-playing",
      cwd: __dirname,
      script: "main.js",
      interpreter: "node",
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      watch: false,
      time: true,
      cron_restart: "0 4 * * *",

      env: {
        NODE_ENV: "production",
      },
    },
  ],
};

