function generateQR() {
  const qrContainer = document.getElementById("qrcode");
  const textInput = document.getElementById("text");
  const text = textInput.value.trim();
  const downloadBtns = document.getElementById("downloadBtns");

  qrContainer.innerHTML = ""; // Clear old QR
  downloadBtns.style.display = "none"; // hide buttons initially

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

  // Wait a little for QR code element to be added, then show buttons
  setTimeout(() => {
    if (qrContainer.querySelector("canvas") || qrContainer.querySelector("img")) {
      downloadBtns.style.display = "flex";
    }
  }, 200); // 200ms usually enough
}


// Download as PNG (works better on mobile)
function downloadImage() {
  let img = document.querySelector("#qrcode img");
  if (!img) return;

  // Convert image src to blob
  fetch(img.src)
    .then(res => res.blob())
    .then(blob => {
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = "qrcode.png";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    })
    .catch(err => console.error("Error downloading image:", err));
}


// Download as PDF
function downloadPDF() {
  const qrContainer = document.getElementById("qrcode");
  if (!qrContainer) return;

  const qrCanvas = qrContainer.querySelector("canvas");
  if (!qrCanvas) {
    alert("Please generate a QR code first!");
    return;
  }

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();

  const imgData = qrCanvas.toDataURL("image/png");
  pdf.text("QR Code", 90, 20);
  pdf.addImage(imgData, "PNG", 55, 30, 100, 100);

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  if (isMobile) {
    const pdfDataUri = pdf.output('dataurlstring');
    window.open(pdfDataUri, '_blank'); // open in viewer
  } else {
    pdf.save("qrcode.pdf"); // download on desktop
  }
}


// Helper function to create PDF from canvas
function createPDF(canvas) {
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();

  const imgData = canvas.toDataURL("image/png");
  pdf.text("QR Code", 90, 20);
  pdf.addImage(imgData, "PNG", 55, 30, 100, 100);

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  if (isMobile) {
    // Open PDF in new tab on mobile
    const pdfDataUri = pdf.output('dataurlstring');
    window.open(pdfDataUri, '_blank');
  } else {
    // Desktop: download
    pdf.save("qrcode.pdf");
  }
}



