const request = require("supertest");
const express = require("express");
const router = require("../routes/predict");
const axios = require("axios");

jest.mock("axios");

// Setup test app
const app = express();
app.use(express.json());
app.use("/predict", router);

describe("POST /predict API", () => {

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ❌ Test Case 1: Missing required fields
  it("should return 400 if required fields are missing", async () => {
    const res = await request(app)
      .post("/predict")
      .send({ from: "BTM Layout" });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  // ✅ Test Case 2: Valid prediction request
  it("should return 200 and prediction data for valid input", async () => {

    // Mock geocoding (FROM & TO)
    axios.get
      .mockResolvedValueOnce({
        data: [{ lat: 12.91, lon: 77.60 }]
      })
      .mockResolvedValueOnce({
        data: [{ lat: 12.97, lon: 77.64 }]
      })
      // Mock weather API
      .mockResolvedValueOnce({
        data: {
          forecast: {
            forecastday: [
              {
                hour: [
                  {
                    time_epoch: 1763613600,
                    condition: { text: "Clear" },
                    temp_c: 25,
                    humidity: 40,
                    wind_kph: 8
                  }
                ]
              }
            ]
          }
        }
      });

    // Mock OpenRouteService API
    axios.post.mockResolvedValue({
      data: {
        routes: [
          {
            summary: {
              distance: 5000,
              duration: 600
            },
            geometry: "abc123"
          }
        ]
      }
    });

    const res = await request(app)
      .post("/predict")
      .send({
        from: "BTM",
        to: "Silk Board",
        date: "2025-11-20",
        time: "10:00"
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.route).toHaveProperty("distance_km");
    expect(res.body).toHaveProperty("predictions");
    expect(res.body.predictions).toHaveProperty("congestion_level");
  });

});
