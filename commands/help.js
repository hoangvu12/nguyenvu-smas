module.exports = {
  execute({ args, api, event, commands }) {
    if (args[0]) {
      if (!commands[args[0]] || typeof commands[args[0]].execute !== "function")
        return api.sendMessage(
          "Không tìm thấy command phù hợp!",
          event.threadID
        );

      const command = commands[args[0]];

      let message = ``;
      message += `Tên: ${command.name}\n`;
      message += `Cú pháp: ${command.command}\n`;

      if (command.description) message += `Nội dung: ${command.description}\n`;
      if (command.params) message += `Params: ${command.params}\n`;

      api.sendMessage(message, event.threadID);
    } else {
      let message = "Supported commands:\n\n";

      for (let key in commands) {
        if (key === "help") continue;
        let command = commands[key];
        message += `${command.command} => ${command.description}\n`;
      }

      api.sendMessage(message, event.threadID);
    }
  },
};
