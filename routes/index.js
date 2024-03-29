const express = require('express');
const router = express.Router();
const numWords = require('num-words');
const axios = require('axios');
const path = require('path');
const config = require(path.resolve(__dirname, '../config.json'));

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index', { title: 'Express' });
});

router.post('/events/polls', (req, res, next) => {
  res.status(200).send(req.body.challenge);
});

router.get('/setup', (req, res, next) => {
  res.redirect(302, `https://slack.com/oauth/authorize?client_id=${config.slackClientId}&scope=commands`);
})

router.get('/setup/complete', async (req, res, next) => {
  const authResponse = await axios(`https://slack.com/api/oauth.access?code=${req.query.code}&client_id=${config.slackClientId}&client_secret=${config.slackClientSecret}`)
  if (authResponse.data.ok) {
    res.status(200).send('Successfully installed!');
  } else {
    res.status(500).send('Something went wrong during installation.');
  }
})

router.post('/events/polls/create-poll', (req, res, next) => {
  const text = req.body.text;
  const entries = text
    .split('"')
    .map(x => x.trim())
    .filter(x => x !== '');
  const question = entries.shift();
  const formattedPollText = getFormattedPollText(question, entries);
  const actions = getActions(entries);
  const response = {
    response_type: 'in_channel',
    as_user: true,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: formattedPollText
        }
      },
      actions
    ]
  };
  res.status(200).send(response);
});

router.post('/events/polls/user-interaction', async (req, res, next) => {
  const payload = req.body.payload;

  res.status(200).send({ deleteOriginal: true });
  await sendInteractiveResponse(payload);
});

appendUserToAction = (text, actionValue, user) => {
  const options = text.split('\n');
  const matchingOption = options.filter(x => x.includes(actionValue))[0];
  let replacedOption = matchingOption;
  if (replacedOption.includes(user.id)) {
    replacedOption = replacedOption.replace(` <@${user.id}>`, '')
  }
  else {
    replacedOption = replacedOption += ` @${user.username}`;
  }
  let result = text.replace(matchingOption, replacedOption);
  return result;
}

sendInteractiveResponse = async payload => {
  try {
    const payloadObj = JSON.parse(payload);
    const responseUrl = payloadObj.response_url;
    let blocks = payloadObj.message.blocks;

    if (payloadObj.actions[0].value === 'delete_poll') {
      const deleteResponse = {
        delete_original: true
      }
      await axios.post(responseUrl, deleteResponse);
      return;
    }

    const replaceBlock = blocks.filter(x => x.type === 'section')[0];
    const { user } = payloadObj;
    replaceBlock.text = {
      ...replaceBlock.text,
      text: appendUserToAction(replaceBlock.text.text, payloadObj.actions[0].value, user)
    }

    const response = {
      replaceOriginal: true,
      blocks
    };

    await axios.post(responseUrl, response);
  } catch (err) {
    const errResponse = {
      replaceOriginal: false,
      text: "Something went wrong. Sorry! :("
    };
    if (err.response) {
      console.log(err.response.data);
    }
    else {
      console.log(err);
    }
    await axios.post(responseUrl, errResponse);
  }
};

getFormattedPollText = (question, entries) => {
  let result = '';
  result += `*${question}*\n\n`;
  entries.forEach(
    (entry, index) => (result += `:${numWords(index + 1)}: ${entry}\n`)
  );
  return result;
};

getActions = entries => {
  const elements = entries.map((entry, index) => ({
    type: 'button',
    text: {
      type: 'plain_text',
      emoji: true,
      text: `:${numWords(index + 1)}:`
    },
    value: entry
  }));

  elements.push({
    type: 'button',
    text: {
      type: 'plain_text',
      text: 'Delete Poll'
    },
    style: 'danger',
    value: 'delete_poll'
  });

  const actionsBlock = {
    type: 'actions',
    elements
  };

  return actionsBlock;
};

module.exports = router;
