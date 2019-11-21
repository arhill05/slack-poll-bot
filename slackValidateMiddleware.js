const crypto = require('crypto');
const config = require('./config.json');

validateRequestSignature = (req, res, next) => {
  try {
    const time = Math.floor(new Date().getTime() / 1000);
    const timestamp = req.headers['x-slack-request-timestamp'];
    if (Math.abs(time - timestamp) > 300) {
      return res.status(400).send('Identical request received too many times');
    }

    const slackSignature = req.headers['x-slack-signature'];
    const signatureString = `v0:${timestamp}:${req.rawBody}`;
    const mySignature = "v0=" + crypto.createHmac('sha256', config.slackSigningSecret)
      .update(signatureString, 'utf8')
      .digest('hex');

    const isValid = crypto.timingSafeEqual(Buffer.from(mySignature, 'utf8'), Buffer.from(slackSignature, 'utf8'))
    if (!isValid) {
      res.status(400).send('Invalid signature');
    }
  } catch (err) {
    console.log(err);
  }

  next();
}

module.exports = validateRequestSignature;