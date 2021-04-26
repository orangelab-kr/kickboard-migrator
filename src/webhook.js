const { IncomingWebhook } = require('@slack/webhook');

exports.webhook = new IncomingWebhook(String(process.env.SLACK_WEBHOOK_URL));
