module.exports = async function ({ args, api, event, smas, Database }) {
  const find_value = { senderID: event.senderID };
  const isExist = await Database.isExist("users", find_value);

  if (!isExist)
    return api.sendMessage(
      "Không tìm thấy mật khẩu và tài khoản! Vui lòng cập nhật bằng (!update <taikhoan> <matkhau>)"
    );

  const user = await Database.get("users", find_value);

  smas.update(user.SMAS_USERNAME, user.SMAS_PASSWORD);
  await smas.schedule(function (response) {
    console.log(response);
    if (response.newMail) {
      const message = `Người gửi: ${response.sender}\nNội dung: ${response.body}`;
      api.sendMessage(message, event.senderID);
    }
  });
};
