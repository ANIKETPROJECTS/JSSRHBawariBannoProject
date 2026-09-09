module.exports = {
  apps: [
    {
      name: "bawari-banno",
      cwd: __dirname,
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
        MONGODB_URI: "mongodb+srv://raneaniket23_db_user:emZJOe0Dxszpd3sK@bawribano.7k1tjqu.mongodb.net/?appName=BawriBano",
        SESSION_SECRET: "iPpDX3i6XuqM1L+U/2gaYP3svvKVGKusdGw1FJzOhHzzFB3vrFXqELqMAv+b9txXdWvu3fR4mmu2wAkGlXuL6w==",
        ADMIN_EMAIL: "admin@gmail.com",
        ADMIN_PASSWORD: "admin123",
      },
    },
  ],
};