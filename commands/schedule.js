module.exports = {
  name: "schedule",
  command: "!schedule",
  description: "Bật thông báo thư SMAS (5p check 1 lần)",
  async execute({ api, event, smas }) {
    api.sendMessage("Bắt đầu bật thông báo!", event.senderID);
    await smas.schedule(function (response) {
      if (response.newMail) {
        const message = `Người gửi: ${response.sender}\nNội dung: ${response.body}`;
        api.sendMessage(message, event.senderID);
      }
    });
  },
};
