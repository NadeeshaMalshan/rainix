exports.getMeteoContent = async (req, res) => {
  try {
    const response = await fetch('https://meteo.gov.lk/content.json');
    
    if (!response.ok) {
      throw new Error(`Failed to fetch from meteo.gov.lk: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error("Error fetching meteo content:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch meteo content",
      error: error.message
    });
  }
};
// Polyfill for DOMMatrix in serverless environments (Vercel)
if (typeof global.DOMMatrix === 'undefined') {
  global.DOMMatrix = class DOMMatrix {
    constructor() {
      this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0;
    }
  };
}

const pdfParse = require('pdf-parse');

exports.getPdfText = async (req, res) => {
  try {
    const { path } = req.query;
    if (!path) {
      return res.status(400).json({ success: false, message: "Missing 'path' query parameter" });
    }

    // Clean up path if it already contains the base url
    let pdfUrl = path;
    if (!path.startsWith('http')) {
      // Remove leading slash if present to avoid double slash
      const cleanPath = path.startsWith('/') ? path.substring(1) : path;
      pdfUrl = `https://meteo.gov.lk/${cleanPath}`;
    }

    const response = await fetch(pdfUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const data = await pdfParse(buffer);
    
    res.json({
      success: true,
      text: data.text
    });

  } catch (error) {
    console.error("Error fetching or parsing PDF:", error);
    res.status(500).json({
      success: false,
      message: "Failed to parse PDF",
      error: error.message
    });
  }
};
