
const startButton = document.querySelector("#startButton");
const message = document.querySelector("#message");

startButton.addEventListener("click", function () {
  message.textContent =
    "Welcome to DevTrack! Your workspace is ready to build.";

  startButton.textContent = "Let's Get Started ✓";
});
