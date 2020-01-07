const inquirer = require('inquirer');
var WebSocket = require('ws');
const run = async () => {
  const { name } = await askName();
  var ws = new WebSocket("ws://127.0.0.1:3000?t=test");
  ws.on("open",  function() {
    //console.log("open");
    ws.send("/login "+name);
   
  });
  ws.on("error", function(err) {
    console.log("error: ", err);
  });
   
  ws.on("close", function() {
    console.log("close");
  });
   
  ws.on("message", function(data) {
    console.log(data);
  });
  
  while (true) {
    const answers = await askChat();
    const { message } = answers;
    ws.send(message);
  }
};

const askChat = () => {
  const questions = [
    {
      name: "message",
      type: "input",
      message: "Enter chat message:"
    }
  ];
  return inquirer.prompt(questions);
};

const askName = () => {
  const questions = [
    {
      name: "name",
      type: "input",
      message: "Enter your name:"
    }
  ];
  return inquirer.prompt(questions);
};
run();
