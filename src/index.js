const { EmailClient } = require('@azure/communication-email');

const additionalKeys = [
  'attachments',
  'replyTo',
  'disableUserEngagementTracking',
  'headers',
];

module.exports = {
  provider: 'azure',
  name: 'Azure Communication Service',

  init: (providerOptions = {}, settings = {}) => {
    const emailClient = new EmailClient(providerOptions.endpoint);

    return {
      send: async (options) => {
        const message = {
          senderAddress: options.from || settings.defaultFrom,
          content: {
            subject: options.subject || '',
            plainText: options.text || '',
            html: options.html || '',
          },
          recipients: {
            to: [
              {
                address: options.to
              }
            ],
            cc: options.cc,
            bcc: options.bcc,
          },
          ...Object.fromEntries(
            Object.entries(options).filter(([key, _val]) =>
              additionalKeys.includes(key),
            ),
          ),
        };
        const poller = await emailClient.beginSend(message);
        const response = await poller.pollUntilDone();
        return response;
      },
    };
  },
};
