function generateQR() {
  const qrContainer = document.getElementById("qrcode");
  const textInput = document.getElementById("text");
  const text = textInput.value.trim();
  const downloadBtns = document.getElementById("downloadBtns");

  qrContainer.innerHTML = ""; // Clear old QR
  downloadBtns.style.display = "none"; // Hide buttons initially

  if (!text) {
    // Shake input
    textInput.classList.add("shake");
    setTimeout(() => textInput.classList.remove("shake"), 500);
    if (navigator.vibrate) navigator.vibrate(200);
    return;
  }

  // Generate QR code
  new QRCode(qrContainer, {
    text: text,
    width: 200,
    height: 200,
    correctLevel: QRCode.CorrectLevel.H,
  });

  // Wait for QR code to render, then show buttons
  setTimeout(() => {
    if (qrContainer.querySelector("canvas")) {
      downloadBtns.style.display = "flex";
    }
  }, 200);
}

function downloadImage() {
  const qrContainer = document.getElementById("qrcode");
  const canvas = qrContainer.querySelector("canvas");
  if (!canvas) {
    alert("Please generate a QR code first!");
    return;
  }

  // Convert canvas to PNG blob
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "qrcode.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, "image/png");
}

function downloadPDF() {
  const qrContainer = document.getElementById("qrcode");
  const canvas = qrContainer.querySelector("canvas");
  if (!canvas) {
    alert("Please generate a QR code first!");
    return;
  }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();
  const imgData = canvas.toDataURL("image/png");
  pdf.text("QR Code", 90, 20);
  pdf.addImage(imgData, "PNG", 55, 30, 100, 100);

  // Generate PDF blob
  const blob = pdf.output("blob");
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "qrcode.pdf";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
