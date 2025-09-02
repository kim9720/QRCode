// Adds tooltips, comments, and a loading spinner to the QR code generator

function generateQR() {
  const qrContainer = document.getElementById("qrcode");
  const textInput = document.getElementById("text");
  const text = textInput.value.trim();
  const downloadBtns = document.getElementById("downloadBtns");
  const spinner = document.getElementById("spinner"); // Spinner element

  // Clear previous QR code and hide download buttons
  qrContainer.innerHTML = "";
  downloadBtns.style.display = "none";

  // Show loading spinner
  if (spinner) spinner.style.display = "block";

  if (!text) {
    // Shake input and vibrate if empty
    textInput.classList.add("shake");
    setTimeout(() => textInput.classList.remove("shake"), 500);
    if (navigator.vibrate) navigator.vibrate(200);
    if (spinner) spinner.style.display = "none"; // Hide spinner if error
    return;
  }

  // Generate QR code
  try {
    new QRCode(qrContainer, {
      text: text,
      width: 200,
      height: 200,
      correctLevel: QRCode.CorrectLevel.H,
    });
  } catch (e) {
    alert("Failed to generate QR code.");
    if (spinner) spinner.style.display = "none";
    return;
  }

  // Wait for QR code to render, then show buttons and hide spinner
  setTimeout(() => {
    if (qrContainer.querySelector("canvas")) {
      downloadBtns.style.display = "flex";
    }
    if (spinner) spinner.style.display = "none";
  }, 200);
}

// Download QR code as PNG image
function downloadImage() {
  const qrContainer = document.getElementById("qrcode");
  const canvas = qrContainer.querySelector("canvas");
  if (!canvas) {
    alert("Please generate a QR code first!");
    return;
  }

  // Convert canvas to PNG blob and trigger download
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

// Download QR code as PDF
function downloadPDF() {
  const qrContainer = document.getElementById("qrcode");
  const canvas = qrContainer.querySelector("canvas");
  if (!canvas) {
    alert("Please generate a QR code first!");
    return;
  }

  // Create PDF and add QR code image
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();
  const imgData = canvas.toDataURL("image/png");
  pdf.text("QR Code", 90, 20);
  pdf.addImage(imgData, "PNG", 55, 30, 100, 100);

  // Generate PDF blob and trigger download
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
