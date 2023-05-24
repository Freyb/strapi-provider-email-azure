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

    const transformAddress = (address) => {
      if (!address) return address;
      if (typeof address === 'string') return [{ address }];
      if (!Array.isArray(address) && address.hasOwnProperty('address')) return [address];
      return address;
    };

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
            to: transformAddress(options.to),
            cc: transformAddress(options.cc),
            bcc: transformAddress(options.bcc),
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
