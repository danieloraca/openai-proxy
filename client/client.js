const audioChunks = [];
let socket;
let mediaRecorder;

async function startMicrophone() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        audioChunks.push(event.data); // Store recorded audio chunks
        console.log("Audio chunk received:", event.data.size);
      }
    };

    mediaRecorder.onstop = () => {
      if (audioChunks.length === 0) {
        console.error("No audio data captured.");
        return;
      }

      const audioBlob = new Blob(audioChunks, { type: "audio/wav" });
      console.log("Sending audio blob of size:", audioBlob.size);
      sendAudioToProxy(audioBlob); // Send audio blob to server
      audioChunks.length = 0; // Clear audio chunks
    };

    mediaRecorder.start(); // Start recording audio
    console.log("Recording started...");
  } catch (err) {
    console.error("Error accessing microphone:", err);
  }
}

function stopMicrophone() {
  if (mediaRecorder && mediaRecorder.state === "recording") {
    mediaRecorder.stop(); // Stop recording audio
    console.log("Recording stopped.");
  }
}

function connectWebSocket() {
  socket = new WebSocket("ws://the-url/ws");

  socket.onopen = () => {
    console.log("Connected to WebSocket");
  };

  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    console.log("Response from AI:", data);

    // Check for errors
    if (data.type === "error") {
      console.error("Error from AI:", data.error);
      alert(`Error from AI: ${data.error.message}`); // Display the error message to the user
      return; // Exit the function if there's an error
    }

    // Handle audio response
    if (data.response && data.response.output) {
      const audioResponse = data.response.output.find(
        (item) => item.type === "audio",
      );
      if (audioResponse) {
        const audioBlob = new Blob([new Uint8Array(audioResponse.audio)], {
          type: "audio/wav",
        });
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        audio.play(); // Play the audio response
      }
    }

    // Update the response text in the HTML
    document.getElementById("response-text").textContent = JSON.stringify(
      data,
      null,
      2,
    );
  };

  socket.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  socket.onclose = () => {
    console.log("WebSocket connection closed. Attempting to reconnect...");
    // Try to reconnect after a delay
    setTimeout(connectWebSocket, 1000);
  };
}

function sendAudioToProxy(audioBlob) {
  const reader = new FileReader();
  reader.onloadend = function () {
    const base64Audio = reader.result.split(",")[1];

    // Check WebSocket state before sending data
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          type: "input_audio_buffer.append",
          audio: base64Audio,
        }),
      );

      socket.send(
        JSON.stringify({
          type: "input_audio_buffer.commit",
        }),
      );
    } else {
      console.error("WebSocket is not open. Cannot send audio.");
    }
  };
  reader.readAsDataURL(audioBlob); // Read audio as base64
}

// Event listeners for buttons
document.getElementById("start-btn").addEventListener("click", () => {
  connectWebSocket(); // Connect to WebSocket server
  startMicrophone(); // Start capturing microphone audio
});

document.getElementById("stop-btn").addEventListener("click", stopMicrophone); // Stop capturing audio
