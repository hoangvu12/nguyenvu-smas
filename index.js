const SMAS = require("./utils/smas");
const login = require("facebook-chat-api");
const requireDir = require("require-dir");
const fs = require("fs");
require("dotenv").config();
const requestedUsers = {};
const Database = require("./utils/database");

// == Commands == //
const commands = requireDir("./commands");

const ALLOWED_GROUPS = ["2615370441918987"];
const MINUTE = 60000;

login(
  { appState: JSON.parse(fs.readFileSync("appstate-main.json", "utf-8")) },
  async (err, api) => {
    if (err) return console.log("LOGIN", err);

    api.setOptions({
      selfListen: true,
      logLevel: "silent",
      updatePresence: false,
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/76.0.3809.132 Safari/537.36",
    });

    await Database.initialize("users");

    function acceptPendingMessages() {
      api.getThreadList(20, null, ["PENDING"], function (err, friends) {
        if (err) return console.log(err);

        if (JSON.stringify(friends) === "[]") return;

        friends.forEach((friend) => {
          api.handleMessageRequest(friend.threadID, true, function (err) {
            if (err) return console.log(error);
          });

          api.sendMessage(friend.snippet, friend.threadID);
        });
      });
    }

    async function startUsersSchedule() {
      const users = await Database.getAll("users");

      users.forEach((user) => {
        requestedUsers[user.senderID] = {
          smas: new SMAS(user.senderID),
        };

        requestedUsers[user.senderID].smas.updateSchedule();
      });
    }

    setInterval(acceptPendingMessages, 30 * MINUTE);
    acceptPendingMessages();
    startUsersSchedule();

    api.listenMqtt(async function (err, event) {
      if (err) return console.log("LISTEN", err);
      if (event.type !== "message") return;
      if (!ALLOWED_GROUPS.includes(event.threadID) && event.isGroup) return;
      if (!event.body.startsWith("!")) return;

      try {
        const args = event.body.slice(1).trim().split(/ +/g);
        const command = args.shift().replace(/\./g, "_");

        if (typeof commands[command].execute !== "function") return;

        if (!(event.senderID in requestedUsers)) {
          requestedUsers[event.senderID] = {
            smas: new SMAS(event.senderID),
          };
        }

        const user = requestedUsers[event.senderID];

        const userFunction = commands[command].execute;

        const parameters = {
          args,
          api,
          event,
          smas: user.smas,
          Database,
          commands,
        };

        await userFunction(parameters);
      } catch (err) {
        console.log("CATCH", err);
        api.sendMessage(`Error: ${err.message}`, event.senderID);
      }
    });
  }
);
