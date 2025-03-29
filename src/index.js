const { EmailClient } = require('@azure/communication-email');
const { ManagedIdentityCredential } = require('@azure/identity');

class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.message = message;
  }
}

const additionalKeys = ['attachments', 'disableUserEngagementTracking', 'headers'];

const emailRegex =
  /^[-!#$%&'*+\/0-9=?A-Z^_a-z{|}~](\.?[-!#$%&'*+\/0-9=?A-Z^_a-z`{|}~])*@[a-zA-Z0-9](-*\.?[a-zA-Z0-9])*\.[a-zA-Z](-?[a-zA-Z0-9])+$/;
const recipentWithEmailRegex = new RegExp(
  `^(?<displayName>.*) <(?<address>${emailRegex.source.slice(1, -1)})>$`,
);
const isEmail = (text) => emailRegex.test(text);
const isRecipentWithEmail = (text) => recipentWithEmailRegex.test(text);

module.exports = {
  provider: 'azure',
  name: 'Azure Communication Service',

  init: (providerOptions = {}, settings = {}) => {
    let emailClient;
    if (providerOptions.useManagedIdentity) {
      const credential = new ManagedIdentityCredential(providerOptions.identityClientId);
      emailClient = new EmailClient(providerOptions.endpoint, credential);
    } else {
      emailClient = new EmailClient(providerOptions.endpoint);
    }

    const transformAddress = (address, defaultAddress) => {
      if (!address) return defaultAddress ? [{ address: defaultAddress }] : undefined;
      if (typeof address === 'string') {
        if (isEmail(address)) return [{ address }];
        if (isRecipentWithEmail(address))
          return [address.match(recipentWithEmailRegex).groups];
        throw new ValidationError(`Invalid email address: ${address}`);
      }
      if (!Array.isArray(address) && address.hasOwnProperty('address')) return [address];
      return address;
    };

    return {
      send: async (options) => {
        const message = {
          senderAddress: transformAddress(options.from, settings.defaultFrom)[0].address,
          replyTo: transformAddress(options.replyTo, settings.defaultFrom),
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
            Object.entries(options).filter(([key, _val]) => additionalKeys.includes(key)),
          ),
        };
        const poller = await emailClient.beginSend(message);
        const response = await poller.pollUntilDone();
        return response;
      },
    };
  },
};
