import "babel-polyfill";
import * as tfc from "@tensorflow/tfjs-core";
import qs from "querystring";
import { MobileNet } from "./src/mobilenet";
import { camera } from "./src/camera";
import tr from "./src/tr.json";

const VIDEO_PIXELS = 224;

const emojiScavengerMobileNet = new MobileNet();
const startBtn = document.getElementsByClassName("start")[0];
const loading = document.getElementsByClassName("loading")[0];
const desc = document.getElementsByClassName("desc")[0];
const trtext = document.getElementsByClassName("trtext")[0];
const end = document.getElementsByClassName("end")[0];
const tweetBtn = document.getElementsByClassName("tweetBtn")[0];
const unkoBtn = document.getElementsByClassName("unkoBtn")[0];
const isDebug = Boolean(location.hash == "#debug");

// console.log(emojiScavengerMobileNet);
startBtn.addEventListener("click", () => {
  startBtn.style.display = "none";
  loading.style.display = "block";
  Promise.all([
    //mobilenet warmup
    emojiScavengerMobileNet.load().then(() => {
      emojiScavengerMobileNet.predict(
        tfc.zeros([VIDEO_PIXELS, VIDEO_PIXELS, 3])
      );
    }),
    camera.setupCamera().then(value => {
      camera.setupVideoDimensions(value[0], value[1]);
    })
  ]).then(e => {
    console.log(e);
    loading.style.display = "none";
    desc.style.display = "block";
    predict();
  });
});

let isStop = false;
async function predict() {
  if (isStop) {
    return;
  }
  const result = tfc.tidy(() => {
    const pixels = tfc.fromPixels(camera.videoElement);
    const centerHeight = pixels.shape[0] / 2;
    const beginHeight = centerHeight - VIDEO_PIXELS / 2;
    const centerWidth = pixels.shape[1] / 2;
    const beginWidth = centerWidth - VIDEO_PIXELS / 2;
    const pixelsCropped = pixels.slice(
      [beginHeight, beginWidth, 0],
      [VIDEO_PIXELS, VIDEO_PIXELS, 3]
    );

    return emojiScavengerMobileNet.predict(pixelsCropped);
  });

  // This call retrieves the topK matches from our MobileNet for the
  // provided image data.
  const topK = await emojiScavengerMobileNet.getTopKClasses(result, 10);

  // Match the top 2 matches against our current active emoji.
  checkEmojiMatch(topK[0].label);
  requestAnimationFrame(() => predict());
}

function checkEmojiMatch(emojiNameTop1) {
  // console.log(emojiNameTop1, emojiNameTop2);

  if (tr[emojiNameTop1]) {
    console.log(tr[emojiNameTop1]);
    trtext.innerHTML = tr[emojiNameTop1].tr;
  }
  if (isDebug) {
    return;
  }
  if ("toilet tissue" === emojiNameTop1) {
    isStop = true;
    end.style.display = "block";
  }
}

unkoBtn.addEventListener("click", () => {
  tweet(true);
});
tweetBtn.addEventListener("click", () => {
  tweet(false);
});

function tweet(isUnko) {
  let twContent = {
    url: "https://kusoapp2018.netlify.com",
    text: isUnko ? "うんこなう #真のうんこなう判定機" : "#真のうんこなう判定機"
  };
  const twurl = "https://twitter.com/share?" + qs.stringify(twContent);
  window.open(twurl);
}
