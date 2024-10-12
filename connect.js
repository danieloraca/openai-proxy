const socket = new WebSocket("ws://localhost:8000/ws");

socket.onopen = function () {
  console.log("Connected to WebSocket Proxy");
  socket.send("Hello GPT-4");
};

socket.onmessage = function (event) {
  console.log("Received from Proxy:", event.data);
};

socket.onclose = function (event) {
  console.log("WebSocket closed:", event);
};

socket.onerror = function (error) {
  console.log("WebSocket error:", error);
};
