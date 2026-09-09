module.exports = {
  apps: [
    {
      name: "bawari-banno",
      script: ".output/server/index.mjs",
      interpreter: "node",
      exec_mode: "fork",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
        HOST: "0.0.0.0",
        PORT: 3020,
        NITRO_HOST: "0.0.0.0",
        NITRO_PORT: 3020,
      },
    },
  ],
};