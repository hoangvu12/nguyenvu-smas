module.exports = {
  name: "mail",
  command: "!mail",
  description: "Lấy thư mới nhất từ SMAS.",
  async execute({ api, event, smas }) {
    try {
      const mail = await smas.getLatestMail();

      const message = `Người gửi: ${mail.sender}\n\nNội dung: ${mail.body}`;
      api.sendMessage(message, event.senderID);
    } catch (err) {
      api.sendMessage(err.message, event.senderID);
    }
  },
};
