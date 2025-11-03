require('dotenv').config(); // Load .env file first

const express = require('express');
const axios = require('axios'); // Use axios for API calls
const { OpenAI } = require('openai'); // Use the OpenAI library for HF compatibility
const router = express.Router();

// --- Configuration ---
const ML_SERVICE_URL = 'http://localhost:5000/predict'; // Python service endpoint

const HF_TOKEN = process.env.HUGGINGFACE_API_TOKEN;
const HF_BASE_URL = "https://router.huggingface.co/v1"; // Correct endpoint from your example
const HF_MODEL = "meta-llama/Llama-3.1-8B-Instruct:novita"; // Specific model from your example

const ORS_API_KEY = process.env.ORS_API_KEY;
const ORS_DIRECTIONS_URL = 'https://api.openrouteservice.org/v2/directions/driving-car/geojson';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

const ASSUMED_FREE_FLOW_SPEED_KMH = 45; // Adjust based on typical free-flow speed in Bangalore (km/h)
const ADDED_BUFFER_MINUTES = 20; // *** ADDED BUFFER TIME ***
// ---

// --- Initialize Hugging Face Client ---
let hfOpenAIClient;
if (HF_TOKEN) {
  hfOpenAIClient = new OpenAI({
    apiKey: HF_TOKEN,
    baseURL: HF_BASE_URL,
  });
  console.log(`Hugging Face client initialized for OpenAI compatibility endpoint: ${HF_BASE_URL}`);
} else {
  console.warn("HUGGINGFACE_API_TOKEN missing. AI context features will use defaults.");
}
// ---

// =========== HELPER FUNCTIONS ===========

/**
 * Geocodes a location name using OpenStreetMap Nominatim.
 */
async function geocodeLocation(locationName) {
    console.log(`Geocoding: ${locationName}, Bengaluru`);
    const userAgent = `TrafficApp/1.0 (${process.env.APP_CONTACT_EMAIL || 'anonymous_user@example.com'})`;
    try {
        const response = await axios.get(NOMINATIM_URL, {
            params: {
                q: `${locationName}, Bengaluru, Karnataka, India`,
                format: 'json', limit: 1, countrycodes: 'in', addressdetails: 0
            },
            headers: { 'User-Agent': userAgent },
            timeout: 7000
        });
        if (response.data && response.data.length > 0) {
            const result = response.data[0];
            console.log(`Geocoded "${locationName}" to: Lat ${result.lat}, Lon ${result.lon}`);
            return [parseFloat(result.lon), parseFloat(result.lat)]; // ORS expects [longitude, latitude]
        } else {
            throw new Error(`Could not find coordinates for "${locationName}"`);
        }
    } catch (error) {
        console.error(`Geocoding error for ${locationName}:`, error.message);
        throw new Error(`Failed to geocode location: "${locationName}". Please check spelling or be more specific.`);
    }
}

/**
 * Gets route distance using OpenRouteService API.
 */
async function getRouteDistanceFromORS(startCoords, endCoords) {
  console.log(`Calling OpenRouteService for distance: ${startCoords} -> ${endCoords}`);
  if (!ORS_API_KEY) {
    throw new Error("Missing ORS_API_KEY in backend/.env file. Cannot calculate route distance.");
  }
  const headers = { 'Authorization': ORS_API_KEY, 'Content-Type': 'application/json; charset=utf-8', 'Accept': 'application/json, application/geo+json' };
  const payload = { coordinates: [startCoords, endCoords] };
  try {
    const response = await axios.post(ORS_DIRECTIONS_URL, payload, { headers: headers, timeout: 15000 });
    if (response.data?.features?.[0]?.properties?.summary) {
      const distanceMeters = response.data.features[0].properties.summary.distance;
      const distanceKm = distanceMeters / 1000.0;
      console.log(`ORS Route Distance: ${distanceKm.toFixed(2)} km`);
      return parseFloat(distanceKm.toFixed(2));
    } else {
      throw new Error("Invalid response structure from ORS.");
    }
  } catch (error) {
    const errorMsg = error.response ? JSON.stringify(error.response.data?.error || error.response.statusText) : error.message;
    console.error("OpenRouteService API Error:", errorMsg);
    throw new Error(`Failed to get route distance from OpenRouteService: ${errorMsg}`);
  }
}

/**
 * Uses an AI model (Hugging Face via OpenAI compat) to generate the 10 features needed by the Python model.
 */
async function getAiTrafficFeatures(from, to, date, time) {
    console.log(`Calling AI (${HF_MODEL}) for traffic features...`);

    // Define default values in case AI fails
    const defaultFeatures = {
        "Weather Conditions": "Clear",
        "Incident Reports": 0,
        "Roadwork and Construction Activity": "No",
        "Traffic Volume": 1500, // Average default
        "Average Speed": 30,    // Average default
        "Congestion Level": 0.5, // Average default
        "Road Capacity Utilization": 0.6,
        "Public Transport Usage": 300,
        "Parking Usage": 0.5,
        "Pedestrian and Cyclist Count": 100
    };

    if (!hfOpenAIClient) {
        console.warn("Hugging Face client not initialized. Using default traffic features.");
        return defaultFeatures;
    }

    // Prompt asking for the 10 specific features, simulating Google Maps/real-time data
    const system_prompt = `You are an expert Bengaluru traffic data provider. Simulate real-time conditions similar to Google Maps for the specific route and time provided. Output ONLY the JSON object requested, nothing else.`;
    const user_prompt = `
      Provide realistic estimates for traffic conditions in Bengaluru, India for the following trip:
      - Origin: ${from}
      - Destination: ${to}
      - Date: ${date}
      - Time: ${time}

      Return ONLY a single, valid JSON object containing EXACTLY these 10 keys (do NOT include routeDistanceKm):
      "Weather Conditions" (string, e.g., "Clear", "Cloudy", "Rain"),
      "Incident Reports" (integer, 0-3, estimate based on time/location),
      "Roadwork and Construction Activity" (string, "Yes" or "No", estimate based on typical areas),
      "Traffic Volume" (integer, estimated vehicles per hour for this route/time),
      "Average Speed" (number, estimated average driving speed in km/h considering traffic),
      "Congestion Level" (number, 0.0-1.0),
      "Road Capacity Utilization" (number, 0.0-1.0),
      "Public Transport Usage" (integer, relative index 100-1000),
      "Parking Usage" (number, 0.0-1.0, impact near destination),
      "Pedestrian and Cyclist Count" (integer, relative index 0-500)

      Example: {"Weather Conditions": "Haze", "Incident Reports": 1, "Roadwork and Construction Activity": "Yes", "Traffic Volume": 2900, "Average Speed": 15.0, "Congestion Level": 0.9, "Road Capacity Utilization": 0.95, "Public Transport Usage": 700, "Parking Usage": 0.85, "Pedestrian and Cyclist Count": 200}
    `;

    try {
        console.log(`Attempting completion with model: ${HF_MODEL}`);
        const completion = await hfOpenAIClient.chat.completions.create({
            model: HF_MODEL,
            messages: [
                { role: "system", content: system_prompt },
                { role: "user", content: user_prompt }
            ],
            temperature: 0.2,
            max_tokens: 512,
            // response_format: { type: "json_object" }, // Keep commented out for compatibility
        });

        if (!completion.choices?.[0]?.message?.content) {
            throw new Error("Received unexpected data format from AI API.");
        }

        const aiText = completion.choices[0].message.content.trim();
        console.log("HF API success. Raw text received:", aiText);

        // Robust JSON parsing
        try {
            const jsonStartIndex = aiText.indexOf('{');
            const jsonEndIndex = aiText.lastIndexOf('}');
            if (jsonStartIndex === -1 || jsonEndIndex === -1) {
                throw new Error("No JSON object found in AI response for context.");
            }
            const jsonString = aiText.substring(jsonStartIndex, jsonEndIndex + 1);
            console.log("Attempting to parse extracted JSON string:", jsonString);
            const parsedJson = JSON.parse(jsonString);

            // Basic validation - Check for a few core expected keys
            if (typeof parsedJson['Traffic Volume'] === 'undefined' || typeof parsedJson['Average Speed'] === 'undefined') {
                throw new Error("Parsed JSON from AI is missing required keys.");
            }

            console.log("Successfully parsed AI features.");

            // Merge AI results with defaults to ensure all 10 keys exist for the ML model
            const finalFeatures = { ...defaultFeatures, ...parsedJson };

            // Ensure correct types (optional but good practice)
            finalFeatures['Incident Reports'] = parseInt(finalFeatures['Incident Reports']) || 0;
            finalFeatures['Traffic Volume'] = parseInt(finalFeatures['Traffic Volume']) || 1500;
            finalFeatures['Average Speed'] = parseFloat(finalFeatures['Average Speed']) || 30;
            finalFeatures['Congestion Level'] = parseFloat(finalFeatures['Congestion Level']) || 0.5;
            finalFeatures['Road Capacity Utilization'] = parseFloat(finalFeatures['Road Capacity Utilization']) || 0.6;
            finalFeatures['Public Transport Usage'] = parseInt(finalFeatures['Public Transport Usage']) || 300;
            finalFeatures['Parking Usage'] = parseFloat(finalFeatures['Parking Usage']) || 0.5;
            finalFeatures['Pedestrian and Cyclist Count'] = parseInt(finalFeatures['Pedestrian and Cyclist Count']) || 100;
            finalFeatures['Weather Conditions'] = String(finalFeatures['Weather Conditions'] || 'Clear');
            finalFeatures['Roadwork and Construction Activity'] = String(finalFeatures['Roadwork and Construction Activity'] || 'No');


            return finalFeatures; // Return the combined object

        } catch (parseError) {
            console.error("Failed to parse JSON from AI response:", parseError.message);
            throw new Error(`AI returned invalid JSON: ${parseError.message}`);
        }
    } catch (error) {
        console.error("Hugging Face API Call Error (Features):", error.message);
        console.warn("AI feature generation failed. Using default traffic features.");
        return defaultFeatures; // Fallback to defaults
    }
}


// --- Main Prediction Route ---
router.post('/', async (req, res) => {
  try {
    const { from, to, date, time } = req.body;
    console.log(`\n--- New Prediction Request: ${from} to ${to} at ${time} on ${date} ---`);

    // --- 1. Geocode locations ---
    console.log("Step 1: Geocoding locations...");
    const startCoords = await geocodeLocation(from);
    const endCoords = await geocodeLocation(to);

    // --- 2. Get Accurate Route Distance from OpenRouteService ---
    console.log("Step 2: Getting route distance from ORS...");
    const accurateDistanceKm = await getRouteDistanceFromORS(startCoords, endCoords);

    // --- 3. Get AI-Powered Traffic Context Features ---
    console.log("Step 3: Getting AI-powered features...");
    const modelFeatures = await getAiTrafficFeatures(from, to, date, time);
    console.log("AI Features received:", modelFeatures);

    // --- 4. Call the Python ML Service ---
    console.log("Step 4: Sending features to Python ML service:", modelFeatures);
    let mlResponse;
    try {
      mlResponse = await axios.post(ML_SERVICE_URL, modelFeatures);
      if (!mlResponse.data || typeof mlResponse.data.travel_time_index === 'undefined') {
          console.error("Invalid response format from ML service:", mlResponse.data);
          throw new Error("ML service did not return 'travel_time_index'. Check ml_service/app.py.");
      }
    } catch (mlError) {
      console.error("ML Service Error:", mlError.message);
      const errorDetail = mlError.response ? JSON.stringify(mlError.response.data) : mlError.message;
      return res.status(500).json({ message: `Python ML service communication error: ${errorDetail}` });
    }
    
    // --- 5. Get the predicted Travel Time Index from the ML model ---
    const predictedIndex = parseFloat(mlResponse.data.travel_time_index);

    if (isNaN(predictedIndex) || predictedIndex <= 0) { 
        console.warn(`Invalid or non-positive prediction index received from ML model: ${mlResponse.data.travel_time_index}. Using index = 1.`);
        predictedIndex = 1.0; // Use 1.0 as a minimum TTI if the model gives bad values
    }
    console.log(`ML Model Prediction (Travel Time Index): ${predictedIndex.toFixed(4)}`);

    // --- 6. Calculate Final Estimated Time using ORS distance and ML index ---
    const freeFlowTimeMinutes = (accurateDistanceKm / ASSUMED_FREE_FLOW_SPEED_KMH) * 60; 
    console.log(`Calculated Free Flow Time: ${freeFlowTimeMinutes.toFixed(2)} mins (Distance: ${accurateDistanceKm} km, Assumed Speed: ${ASSUMED_FREE_FLOW_SPEED_KMH} km/h)`);
    
    // Apply the index and add the buffer
    const calculatedTime = freeFlowTimeMinutes * predictedIndex;
    const finalEstimatedTime = calculatedTime + ADDED_BUFFER_MINUTES; // Add 15 minutes buffer

    console.log(`Step 5: Final Calculated Time (with buffer): ${finalEstimatedTime.toFixed(1)} minutes`);

    // --- 7. Send the Complete Response to the Frontend ---
    res.status(200).json({
      prediction: {
        // Send the final calculated time, rounded
        estimated_time_minutes: Math.round(finalEstimatedTime) 
      },
      route: { 
        from, to, date, time, 
        distance: accurateDistanceKm // Use the accurate distance from ORS
      },
      realFeatures: modelFeatures, // Features actually used by the model
      weather: { 
        main: modelFeatures['Weather Conditions'] // Use weather from AI context
      }
    });

  } catch (error) {
    console.error('Prediction route error:', error.message);
    res.status(500).json({ message: error.message || 'Internal server error' });
  }
});

module.exports = router;