const axios = require('axios')
const moment = require('moment')
require('dotenv').config()

const token = process.env.TOKEN;
let tron_usdt_id = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"
let address = "TSaJqQ1AZ2bEYyqBwBmJqCBSPv8KPRTAdv"
let last_transaction_id = ""

let summary = {}

let transactions = require('./test.json')

let i = 0;

const TeleBot = require('telebot');
const bot = new TeleBot(token);

let id;
let interval;
let paused = false;

bot.on('/exit', (msg) => {
  bot.sendMessage(msg.from.id, "Exit!");
  bot.stop();
  clearInterval(interval)
})

bot.on('/pause', (msg) => {
  bot.sendMessage(msg.from.id, "Paused!");
  paused = true;
})

bot.on('/resume', (msg) => {
  bot.sendMessage(msg.from.id, "Resumed!");
  paused = false;
})

bot.on('/help', (msg) => {
  bot.sendMessage(msg.from.id, "/scan: Track Address\n/pause: Pause Tracking Address\n/resume: Resume Tracking Address\n/exit: Exit Tracking Address\n/help: Help Instructions")
})

bot.on('/start', (msg) => {
  bot.sendMessage(msg.from.id, "Please check help for instructions by typing /help")
})

bot.on('/scan', (msg) => {
  bot.sendMessage(msg.from.id, "Started!")
  interval = setInterval(function() {
    axios.get("https://apilist.tronscan.org/api/token_trc20/transfers?limit=2000&start=0&sort=-timestamp&count=true&relatedAddress=TSaJqQ1AZ2bEYyqBwBmJqCBSPv8KPRTAdv")
    .then(res => {
      let transaction = res.data.token_transfers[0];
      // let transaction = transactions.token_transfers[i]

      let token_info = transaction.tokenInfo;

      let time = moment.utc(transaction.block_ts / 1000, 'X').format("MM/DD/YYYY");
      let exactDate = moment.utc(transaction.block_ts / 1000, 'X').format("MM/DD/YYYY hh:mm:ss");

      let isSend;

      let sum_out, sum_in;

      if (summary[time]) {
        sum_out = summary[time].sum_out;
        sum_in = summary[time].sum_in;
      } else {
        sum_out = 0;
        sum_in = 0;

        summary[time] = {
          sum_out,
          sum_in
        }
      }

      if (transaction.confirmed) {
        if (token_info.tokenId === tron_usdt_id && last_transaction_id !== transaction.transaction_id) {
        // if (last_transaction_id !== transaction.transaction_id) {
          
          // let trigger_info = transaction.trigger_info;
          if (transaction.from_address === address) {
            isSend = true;
            sum_out += Number(transaction.quant);
          } else {
            isSend = false;
            sum_in += Number(transaction.quant);
          }

          let direction = isSend ? "OUT" : "IN";
          let amount = Number(transaction.quant) / Math.pow(10, token_info.tokenDecimal);
          let temp = isSend ? "To" : "From";
          let address_ = isSend ? transaction.to_address : transaction.from_address
          let token_name = token_info.tokenAbbr;

          let message = `${token_name}/TRC20 Transaction just confirmed! (${exactDate})\nDirection: ${direction}\nAmount: ${amount}\n${temp} ${address_}\nDaily Summary\nTotal in: ${summary[time].sum_in}\nTotal out: ${summary[time].sum_out}`

          summary[time] = {
            sum_out,
            sum_in
          }

          // console.log(time, '---------- >', message)

          if (!paused) {
            bot.sendMessage(msg.from.id, message)
          }
        }
      }

      i ++;
      })
  }, 2000);
});

bot.start();