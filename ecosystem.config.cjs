require('fs').readFileSync('.env', 'utf8').split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) {
    process.env[match[1].trim()] = match[2].trim();
  }
});

module.exports = {
  apps: [{
    name: 'ris-api',
    script: './dist/ris-api',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: process.env,
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
