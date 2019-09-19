var express = require('express');
var router = express.Router();
const numWords = require('num-words');

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/events/polls', (req, res, next) => {
  res.status(200).send(req.body.challenge)
})

router.post('/events/polls/create-poll', (req, res, next) => {
  const text = req.body.text;
  const entries = text.split('"').map(x => x.trim()).filter(x => x !== "");
  const question = entries.shift();
  const formattedPollText = getFormattedPollText(question, entries);
  const actions = getActions(entries);
  const response = {
    response_type: "in_channel",
    as_user: true,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: formattedPollText
        }
      },
      actions
    ],
  }
  res.status(200).send(response);
});

getFormattedPollText = (question, entries) => {
  let result = "";
  result += `*${question}*\n\n`;
  entries.forEach((entry, index) => result += `:${numWords(index + 1)}: ${entry}\n`)
  return result;
}

getActions = (entries) => {
  const elements = entries.map((entry, index) => ({
    type: "button",
    text: {
      type: "plain_text",
      emoji: true,
      text: `:${numWords(index + 1)}:`,
    },
    value: entry
  }));

  const actionsBlock = {
    type: "actions",
    elements
  };

  return actionsBlock;
}

module.exports = router;
