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
