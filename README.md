# SMAS Facebook Bot

This bot is using for notify new emails, update latest timetable and send it to users.

## How to install

**Install all dependencies**

`npm install`

## How to use

Login to your Facebook account to get cookies in `login.js`
See [facebook-chat-api](https://github.com/Schmavery/facebook-chat-api)

After get cookies, make an .env file with two variables
`SMAS_USERNAME` and `SMAS_PASSWORD`. See `.env-example`

Run the bot with `node index.js` or `node .`


## Commands
`!update` Update smas account!. `args`: True. Ex: `!update <username> <account>`  
`!schedule` Start listening for new mail per 5 minutes, also update the timetable! `args`: False  
`!tkb` Get the latest saved timetable in `!schedule command`! `args`: False  
