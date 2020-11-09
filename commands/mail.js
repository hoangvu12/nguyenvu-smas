module.exports = async function ({ args, api, event, smas, Database }) {
  try {
    const mail = await smas.getLatestMail();

    const message = `Người gửi: ${mail.sender}\nNội dung: ${mail.body}`;
    api.sendMessage(message, event.senderID);
  } catch (err) {
    api.sendMessage(err.message, event.senderID);
  }
};
