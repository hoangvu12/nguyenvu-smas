module.exports = async function ({ args, api, event, smas, Database }) {
  await smas.schedule(function (response) {
    if (response.newMail) {
      const message = `Người gửi: ${response.sender}\nNội dung: ${response.body}`;
      api.sendMessage(message, event.senderID);
    }
  });
};
