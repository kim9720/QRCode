function generateQR() {
  let qrContainer = document.getElementById("qrcode");
  let textInput = document.getElementById("text");
  let text = textInput.value.trim();
  let downloadBtns = document.getElementById("downloadBtns");

  qrContainer.innerHTML = ""; // Clear old QR

  if (text === "") {
    // Shake the input
    textInput.classList.add("shake");

    // Remove shake class after animation ends
    setTimeout(() => {
      textInput.classList.remove("shake");
    }, 500);

    // Vibrate on mobile if supported
    if (navigator.vibrate) {
      navigator.vibrate(200); // vibrate for 200ms
    }

    return; // stop function
  }

  // Generate QR
  new QRCode(qrContainer, {
    text: text,
    width: 200,
    height: 200,
  });

  // Show download buttons after QR is generated
  setTimeout(() => {
    let img = qrContainer.querySelector("img");
    if (img) {
      downloadBtns.style.display = "flex";
    }
  }, 300);
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
// Download as PDF
function downloadPDF() {
  let img = document.querySelector("#qrcode img");
  if (!img) return;

  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF();
  pdf.text("QR Code", 90, 20);
  pdf.addImage(img.src, "PNG", 55, 30, 100, 100);

  // Generate blob instead of direct save
  const pdfBlob = pdf.output("blob");

  // Create download link with correct MIME type
  const blobUrl = URL.createObjectURL(pdfBlob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = "qrcode.pdf";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(blobUrl);
}

