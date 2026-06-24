"use strict";

const VENDORS = ["亞克", "鎧鉅", "馗鼎", "大寶鈦金", "亞洲科匯", "聖釭"];

const REPORT_LABELS = {
  P1: "P1－刀盒/填充物/螺絲 確認",
  P2: "P2－箱內填充確認",
  P3: "P3－箱外束帶/膠帶固定、地址確認",
};

const PHOTO_MARKS = {
  P1: "刀盒/填充物/螺絲 確認",
  P2: "箱內填充確認",
  P3: "箱外束帶/膠帶固定、地址確認",
};

const MAX_IMAGE_SIDE = 2560;
const JPEG_QUALITY = 0.95;

const state = {
  activeStep: null,
  cameraStream: null,
  currentPhoto: null,
  permissionProbePromise: null,
  vendorCounts: new Map(),
};

const elements = {
  vendorSelect: document.querySelector("#vendorSelect"),
  boxCountSelect: document.querySelector("#boxCountSelect"),
  addVendorButton: document.querySelector("#addVendorButton"),
  clearVendorButton: document.querySelector("#clearVendorButton"),
  vendorList: document.querySelector("#vendorList"),
  emptyVendorText: document.querySelector("#emptyVendorText"),
  staffSelect: document.querySelector("#staffSelect"),
  cameraButtons: document.querySelectorAll("[data-camera-step]"),
  cameraPanel: document.querySelector("#cameraPanel"),
  cameraStepBadge: document.querySelector("#cameraStepBadge"),
  cameraVideo: document.querySelector("#cameraVideo"),
  cameraStatus: document.querySelector("#cameraStatus"),
  photoStatus: document.querySelector("#photoStatus"),
  quickModeCheckbox: document.querySelector("#quickModeCheckbox"),
  captureCameraButton: document.querySelector("#captureCameraButton"),
  closeCameraButton: document.querySelector("#closeCameraButton"),
  photoPreview: document.querySelector("#photoPreview"),
  downloadPhoto: document.querySelector("#downloadPhoto"),
  clearPhotoButton: document.querySelector("#clearPhotoButton"),
  copyInfoButton: document.querySelector("#copyInfoButton"),
  copyStatus: document.querySelector("#copyStatus"),
  reportOutput: document.querySelector("#reportOutput"),
};

elements.addVendorButton.addEventListener("click", addVendorCount);
elements.clearVendorButton.addEventListener("click", clearVendorCounts);
elements.copyInfoButton.addEventListener("click", copyReportText);
elements.captureCameraButton.addEventListener("click", captureCurrentPhoto);
elements.closeCameraButton.addEventListener("click", stopCamera);
elements.clearPhotoButton.addEventListener("click", clearCurrentPhoto);
elements.downloadPhoto.addEventListener("click", () => {
  if (elements.quickModeCheckbox.checked) {
    setPhotoStatus("已開始儲存，正在清除預覽。", "success");
    window.setTimeout(clearCurrentPhoto, 900);
    return;
  }

  setPhotoStatus("確認手機已存檔後，按「已存檔，清除照片」。", "success");
});
elements.cameraButtons.forEach((button) => {
  button.addEventListener("click", () => {
    startCamera(button.dataset.cameraStep);
  });
});

window.addEventListener("pagehide", stopCamera);

renderVendorList();
state.permissionProbePromise = warmUpCameraPermission();

function addVendorCount() {
  const vendor = elements.vendorSelect.value;
  const count = Number(elements.boxCountSelect.value);

  if (!vendor || !Number.isFinite(count) || count <= 0) {
    alert("請選擇廠商與箱數");
    return;
  }

  const currentCount = state.vendorCounts.get(vendor) || 0;
  state.vendorCounts.set(vendor, currentCount + count);
  renderVendorList();
  setCopyStatus(`${vendor} 已加入，目前 ${currentCount + count} 箱。`, "success");
}

function clearVendorCounts() {
  if (state.vendorCounts.size === 0) {
    return;
  }

  state.vendorCounts.clear();
  renderVendorList();
  setCopyStatus("外包商箱數清單已清除。", "success");
}

function renderVendorList() {
  elements.vendorList.innerHTML = "";

  const selectedVendors = VENDORS.filter((vendor) => {
    return (state.vendorCounts.get(vendor) || 0) > 0;
  });

  selectedVendors.forEach((vendor) => {
    const count = state.vendorCounts.get(vendor);
    const item = document.createElement("li");
    item.innerHTML = `<strong>${vendor}</strong><span>x${count}</span>`;
    elements.vendorList.appendChild(item);
  });

  const hasItems = selectedVendors.length > 0;
  elements.emptyVendorText.hidden = hasItems;
  elements.clearVendorButton.disabled = !hasItems;
}

async function startCamera(step) {
  if (!PHOTO_MARKS[step]) {
    return;
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    const message = "此瀏覽器不支援直接開相機，請使用手機 Safari 或 Chrome 開啟 HTTPS 網址。";
    setPhotoStatus(message, "error");
    alert(message);
    return;
  }

  if (state.permissionProbePromise) {
    setPhotoStatus("正在等待相機權限確認...");
    await state.permissionProbePromise;
  }

  stopCamera();

  state.activeStep = step;
  elements.cameraStepBadge.textContent = step;
  elements.cameraPanel.hidden = false;
  elements.captureCameraButton.disabled = true;
  setCameraStatus("正在開啟相機...");
  setPhotoStatus(`${step} 正在開啟相機...`);
  elements.cameraPanel.scrollIntoView({ behavior: "smooth", block: "start" });

  try {
    const stream = await requestEnvironmentCamera();
    state.cameraStream = stream;
    elements.cameraVideo.srcObject = stream;
    await elements.cameraVideo.play();
    elements.captureCameraButton.disabled = false;
    setCameraStatus("對準後按「拍照」。");
    setPhotoStatus("相機已開啟。");
  } catch (error) {
    console.error(error);
    stopCamera();
    const message = getCameraErrorMessage(error);
    setPhotoStatus(message, "error");
    alert(message);
  }
}

async function warmUpCameraPermission() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    setPhotoStatus("此瀏覽器不支援直接開相機，請改用手機 Safari 或 Chrome。", "error");
    return;
  }

  setPhotoStatus("正在詢問相機權限...");

  try {
    const stream = await requestEnvironmentCamera();
    stream.getTracks().forEach((track) => track.stop());
    setPhotoStatus("相機權限已允許，請按 P1 / P2 / P3 拍照。", "success");
  } catch (error) {
    console.warn("Camera permission probe failed.", error);
    setPhotoStatus(getCameraErrorMessage(error), "error");
  } finally {
    state.permissionProbePromise = null;
  }
}

async function requestEnvironmentCamera() {
  const highResolution = {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
  };

  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        ...highResolution,
        facingMode: { exact: "environment" },
      },
    });
  } catch (error) {
    if (error && (error.name === "NotAllowedError" || error.name === "SecurityError")) {
      throw error;
    }

    return navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        ...highResolution,
        facingMode: "environment",
      },
    });
  }
}

async function captureCurrentPhoto() {
  const step = state.activeStep;
  const video = elements.cameraVideo;

  if (!step || !video.videoWidth || !video.videoHeight) {
    alert("相機尚未準備好，請稍候再拍。");
    return;
  }

  elements.captureCameraButton.disabled = true;
  setCameraStatus("照片處理中...");

  try {
    const capturedAt = new Date();

    if (elements.quickModeCheckbox.checked) {
      const result = annotateVideoFrameDataUrl(video, step, capturedAt);
      downloadPhotoImmediately(result);
      stopCamera();
      setCopyStatus(`${step} 圖片已產生。`, "success");
      setPhotoStatus(`${step} 圖片已直接儲存，預覽已清除。`, "success");
      window.setTimeout(clearCurrentPhoto, 900);
      return;
    }

    const result = await annotateVideoFrame(video, step, capturedAt);
    stopCamera();
    setCopyStatus(`${step} 圖片已產生。`, "success");
    updatePhotoPreview(result);
    setPhotoStatus(`${step} 圖片已產生，請按「儲存 ${step} 圖片」。`, "success");
  } catch (error) {
    console.error(error);
    elements.captureCameraButton.disabled = false;
    alert("照片處理失敗，請重新拍照。");
    setCameraStatus("照片處理失敗。");
  }
}

function stopCamera() {
  if (state.cameraStream) {
    state.cameraStream.getTracks().forEach((track) => track.stop());
  }

  state.cameraStream = null;
  state.activeStep = null;
  elements.cameraVideo.pause();
  elements.cameraVideo.srcObject = null;
  elements.cameraPanel.hidden = true;
  elements.captureCameraButton.disabled = false;
  setCameraStatus("");
}

async function annotateVideoFrame(video, step, capturedAt) {
  const canvas = drawVideoFrameToCanvas(video, step, capturedAt);
  const blob = await canvasToBlob(canvas);
  const url = URL.createObjectURL(blob);

  return {
    blob,
    url,
    step,
    fileName: `${step}_${formatFileDate(capturedAt)}.jpg`,
  };
}

function annotateVideoFrameDataUrl(video, step, capturedAt) {
  const canvas = drawVideoFrameToCanvas(video, step, capturedAt);
  const url = canvas.toDataURL("image/jpeg", JPEG_QUALITY);

  return {
    url,
    step,
    fileName: `${step}_${formatFileDate(capturedAt)}.jpg`,
  };
}

function drawVideoFrameToCanvas(video, step, capturedAt) {
  const sourceWidth = video.videoWidth;
  const sourceHeight = video.videoHeight;
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(sourceWidth, sourceHeight));
  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d", { alpha: false });
  context.drawImage(video, 0, 0, width, height);
  drawPhotoOverlay(context, width, step, formatDisplayDate(capturedAt));

  return canvas;
}

function drawPhotoOverlay(context, width, step, timestampText) {
  const padding = clamp(Math.round(width * 0.026), 18, 48);
  const titleSize = clamp(Math.round(width * 0.052), 30, 86);
  const bodySize = clamp(Math.round(width * 0.034), 23, 58);
  const maxTextWidth = width - padding * 2;

  context.textBaseline = "top";
  context.textAlign = "left";

  const fontFamily =
    '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans TC", "Microsoft JhengHei", sans-serif';

  context.font = `850 ${bodySize}px ${fontFamily}`;
  const detailLines = wrapText(context, PHOTO_MARKS[step], maxTextWidth);
  const titleLineHeight = Math.round(titleSize * 1.12);
  const bodyLineHeight = Math.round(bodySize * 1.36);
  const backgroundHeight =
    padding * 2 + titleLineHeight + detailLines.length * bodyLineHeight + bodyLineHeight;

  context.fillStyle = "rgba(0, 0, 0, 0.72)";
  context.fillRect(0, 0, width, backgroundHeight);

  context.shadowColor = "rgba(0, 0, 0, 0.45)";
  context.shadowBlur = Math.max(3, Math.round(width * 0.004));
  context.shadowOffsetX = 1;
  context.shadowOffsetY = 1;
  context.fillStyle = "#ffffff";

  let y = padding;
  context.font = `900 ${titleSize}px ${fontFamily}`;
  context.fillText(step, padding, y, maxTextWidth);

  y += titleLineHeight;
  context.font = `850 ${bodySize}px ${fontFamily}`;
  detailLines.forEach((line) => {
    context.fillText(line, padding, y, maxTextWidth);
    y += bodyLineHeight;
  });

  context.fillText(timestampText, padding, y, maxTextWidth);

  context.shadowColor = "transparent";
  context.shadowBlur = 0;
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;
}

function wrapText(context, text, maxWidth) {
  const tokens = text.includes(" ") ? text.split(/(\s+)/) : Array.from(text);
  const lines = [];
  let line = "";

  tokens.forEach((token) => {
    const testLine = line + token;
    const testWidth = context.measureText(testLine).width;

    if (testWidth > maxWidth && line) {
      lines.push(line.trimEnd());
      line = token.trimStart();
      return;
    }

    line = testLine;
  });

  if (line) {
    lines.push(line.trim());
  }

  return lines;
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }

        reject(new Error("Canvas failed to create image blob."));
      },
      "image/jpeg",
      JPEG_QUALITY,
    );
  });
}

function updatePhotoPreview(photo) {
  clearCurrentPhoto();

  state.currentPhoto = photo;

  const image = document.createElement("img");
  image.src = photo.url;
  image.alt = `${photo.step} 標示後圖片`;

  elements.photoPreview.innerHTML = "";
  elements.photoPreview.appendChild(image);
  elements.downloadPhoto.href = photo.url;
  elements.downloadPhoto.download = photo.fileName;
  elements.downloadPhoto.textContent = `儲存 ${photo.step} 圖片`;
  elements.downloadPhoto.hidden = false;
  elements.clearPhotoButton.hidden = false;
}

function downloadPhotoImmediately(photo) {
  clearCurrentPhoto();

  state.currentPhoto = photo;
  elements.downloadPhoto.href = photo.url;
  elements.downloadPhoto.download = photo.fileName;
  elements.downloadPhoto.click();
}

function clearCurrentPhoto() {
  if (state.currentPhoto && state.currentPhoto.url && state.currentPhoto.url.startsWith("blob:")) {
    URL.revokeObjectURL(state.currentPhoto.url);
  }

  state.currentPhoto = null;
  elements.photoPreview.innerHTML = "<span>尚未拍照</span>";
  elements.downloadPhoto.removeAttribute("href");
  elements.downloadPhoto.removeAttribute("download");
  elements.downloadPhoto.hidden = true;
  elements.clearPhotoButton.hidden = true;
  setPhotoStatus("目前照片已清除。");
}

async function copyReportText() {
  const vendorText = getVendorReportText();
  const staff = elements.staffSelect.value;

  if (!vendorText) {
    hideReportOutput();
    alert("請先加入外包商箱數");
    setCopyStatus("請先加入外包商箱數。", "error");
    return;
  }

  if (!staff) {
    hideReportOutput();
    alert("請先選擇出貨人員");
    setCopyStatus("請先選擇出貨人員。", "error");
    return;
  }

  const reportText = [
    "【今日外包出貨確認】",
    "",
    `外包商箱數：${vendorText}`,
    "",
    `出貨人員：${staff}`,
    "",
    REPORT_LABELS.P1,
    REPORT_LABELS.P2,
    REPORT_LABELS.P3,
  ].join("\n");

  showReportOutput(reportText);

  try {
    await writeTextToClipboard(reportText, elements.reportOutput);
    setCopyStatus("資訊已複製。", "success");
  } catch (error) {
    console.error(error);
    alert("複製失敗，請長按下方文字手動複製。");
    setCopyStatus("複製失敗，請使用下方文字。", "error");
  }
}

function getVendorReportText() {
  return VENDORS.filter((vendor) => {
    return (state.vendorCounts.get(vendor) || 0) > 0;
  })
    .map((vendor) => `${vendor}x${state.vendorCounts.get(vendor)}`)
    .join("，");
}

async function writeTextToClipboard(text, fallbackTextarea) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch (error) {
      console.warn("navigator.clipboard.writeText failed, falling back to execCommand.", error);
    }
  }

  const textarea = fallbackTextarea || document.createElement("textarea");
  const shouldRemoveTextarea = !fallbackTextarea;

  if (!fallbackTextarea) {
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
  }

  textarea.focus();
  textarea.select();

  try {
    const copied = document.execCommand("copy");
    if (!copied) {
      throw new Error("document.execCommand('copy') returned false.");
    }
  } finally {
    if (shouldRemoveTextarea) {
      document.body.removeChild(textarea);
    }
  }
}

function showReportOutput(text) {
  elements.reportOutput.value = text;
  elements.reportOutput.hidden = false;
}

function hideReportOutput() {
  elements.reportOutput.value = "";
  elements.reportOutput.hidden = true;
}

function setCopyStatus(message, type) {
  elements.copyStatus.textContent = message;
  elements.copyStatus.className = "status-text";

  if (type) {
    elements.copyStatus.classList.add(type);
  }
}

function setCameraStatus(message) {
  elements.cameraStatus.textContent = message;
}

function setPhotoStatus(message, type) {
  elements.photoStatus.textContent = message;
  elements.photoStatus.className = "status-text";

  if (type) {
    elements.photoStatus.classList.add(type);
  }
}

function getCameraErrorMessage(error) {
  if (!window.isSecureContext) {
    return "相機需要 HTTPS 網址，請用 GitHub Pages 網址開啟。";
  }

  if (!error || !error.name) {
    return "無法開啟相機，請確認瀏覽器允許相機權限。";
  }

  if (error.name === "NotAllowedError" || error.name === "SecurityError") {
    return "相機權限未允許，請在瀏覽器設定中允許此網站使用相機。";
  }

  if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
    return "找不到可用相機，請確認手機相機可正常使用。";
  }

  if (error.name === "NotReadableError" || error.name === "TrackStartError") {
    return "相機正在被其他 App 使用，請關閉其他相機程式後再試。";
  }

  if (error.name === "OverconstrainedError" || error.name === "ConstraintNotSatisfiedError") {
    return "無法使用後鏡頭，請再按一次或改用支援相機的手機瀏覽器。";
  }

  return `無法開啟相機：${error.name}`;
}

function formatDisplayDate(date) {
  return `${date.getFullYear()}/${pad2(date.getMonth() + 1)}/${pad2(date.getDate())} ${pad2(
    date.getHours(),
  )}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
}

function formatFileDate(date) {
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}_${pad2(
    date.getHours(),
  )}${pad2(date.getMinutes())}${pad2(date.getSeconds())}`;
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
