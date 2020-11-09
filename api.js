const axios = require("axios").default;
const axiosCookieJarSupport = require("axios-cookiejar-support").default;
const tough = require("tough-cookie");
axiosCookieJarSupport(axios);
const Database = require("./database");

class API {
  constructor() {
    this.cookieJar = new tough.CookieJar();
  }

  updateOpts(opts) {
    for (let key in opts) this[key] = opts[key];
  }

  async login() {
    const url = "http://smsedu.smas.vn/User/Login";
    const body = `UserName=${this.username}&Password=${this.password}`;
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
    };

    const { data } = await axios.post(url, body, {
      headers,
      maxRedirects: 0,
      validateStatus: function (status) {
        return status === 302;
      },
      jar: this.cookieJar,
      withCredentials: true,
    });

    return data;
  }

  async getTimeTable() {
    const URL = this.params.homepage;

    const { data } = await axios.get(URL, {
      jar: this.cookieJar,
      withCredentials: true,
    });

    return data;
  }

  async getMail() {
    const url = "http://smsedu.smas.vn/Home/CallApi";
    const body = `key=%5B%22schoolID%22%2C%22pupilID%22%2C%22pageSize%22%2C%22pageNumber%22%5D&value=%5B%2297078%22%2C%22${this.params.pupilID}%22%2C%2220%22%2C1%5D&uri=api%2Fnewmessage%2FgetNewMessage%3F&parseObject=getNewMessage`;
    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
    };

    const { data } = await axios.post(url, body, {
      headers,
      jar: this.cookieJar,
      withCredentials: true,
    });

    return data;
  }
}

module.exports = API;
