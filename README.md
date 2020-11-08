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

| Commands   |             Arguments             | Example                         | Description                                                            |
| ---------- | :-------------------------------: | ------------------------------- | ---------------------------------------------------------------------- |
| `update`   | username, password (**Required**) | `!update <username> <password>` | Update smas account!                                                   |
| `tkb`      |         None (_Optional_)         | `!tkb`                          | Get latest saved timetable from `schedule`                             |
| `schedule` |         None (_Optional_)         | `!schedule`                     | Start listening for new mail per 5 minutes, also update the timetable! |
