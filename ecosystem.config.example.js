module.exports = {
  apps: [
    {
      name: 'kickboard-migrator',
      script: './index.js',
      env: {
        LEGACY_URL: 'mqtt://write_your_legacy_mqtt_url',
        LEGACY_USERNAME: 'write_your_legacy_mqtt_username',
        LEGACY_PASSWORD: 'write_your_legacy_mqtt_password',
        TARGET_URL: 'mqtt://write_your_target_mqtt_url',
        TARGET_USERNAME: 'write_your_target_mqtt_username',
        TARGET_PASSWORD: 'write_your_target_mqtt_password',
        NEW_ADDRESS: 'write_your_new_mqtt_address',
        NEW_USERNAME: 'write_your_new_mqtt_username',
        NEW_PASSWORD: 'write_your_new_mqtt_password',
        SLACK_WEBHOOK_URL:
          'https://hooks.slack.com/services/WRITE_YOUR_WEBHOOK',
      },
    },
  ],
};
