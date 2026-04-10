// utils/pdfGenerator.js
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export const generatePDFFromHTML = async (
  htmlContent,
  fileName = "invoice.pdf"
) => {
  return new Promise((resolve, reject) => {
    try {
      // Create a temporary iframe to render HTML
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      iframe.srcdoc = htmlContent;

      document.body.appendChild(iframe);

      iframe.onload = async () => {
        try {
          const iframeDoc =
            iframe.contentDocument || iframe.contentWindow.document;
          const iframeBody = iframeDoc.body;

          // Add print styles
          const style = iframeDoc.createElement("style");
          style.textContent = `
            @media print {
              body { margin: 0; padding: 0; }
              .invoice-container { border: none !important; }
            }
            body { 
              margin: 0; 
              padding: 0; 
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            * { box-sizing: border-box; }
          `;
          iframeDoc.head.appendChild(style);

          // Wait for images to load
          await new Promise((resolve) => setTimeout(resolve, 500));

          // Generate PDF
          const pdf = new jsPDF("p", "mm", "a4");
          const canvas = await html2canvas(iframeBody, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: "#ffffff",
          });

          const imgData = canvas.toDataURL("image/png");
          const imgWidth = 210; // A4 width in mm
          const pageHeight = 297; // A4 height in mm
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          let heightLeft = imgHeight;
          let position = 0;

          pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
          heightLeft -= pageHeight;

          // Add additional pages if needed
          while (heightLeft > 0) {
            position = heightLeft - imgHeight;
            pdf.addPage();
            pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;
          }

          // Cleanup
          document.body.removeChild(iframe);

          // Return PDF blob
          const pdfBlob = pdf.output("blob");
          resolve(pdfBlob);
        } catch (error) {
          document.body.removeChild(iframe);
          reject(error);
        }
      };

      iframe.onerror = (error) => {
        document.body.removeChild(iframe);
        reject(error);
      };
    } catch (error) {
      reject(error);
    }
  });
};

export const downloadPDF = (pdfBlob, fileName = "invoice.pdf") => {
  const url = URL.createObjectURL(pdfBlob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// This function opens HTML directly in new window for printing
export const openHTMLInPrintWindow = (htmlContent) => {
  const printWindow = window.open("", "_blank");
  printWindow.document.open();
  printWindow.document.write(htmlContent);
  printWindow.document.close();

  // Wait small delay to load complete HTML then print
  setTimeout(() => {
    printWindow.print();
  }, 500);
};

// Helper function to print PDF blob
export const printPDFBlob = (pdfBlob) => {
  const url = URL.createObjectURL(pdfBlob);
  const printWindow = window.open(url, "_blank");
  if (printWindow) {
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }
};
