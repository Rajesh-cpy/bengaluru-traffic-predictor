// This function's job is to create realistic *fake* data for the
// features your model needs, since we don't have real-time sensors.
// It uses the time of day to guess what the traffic is like.

function getSimulatedFeatures(time) {
  const [hour] = time.split(':').map(Number);

  let congestion = 0.2; // Default: Low (20%)
  let avgSpeed = 45.0;  // Default: High speed
  let trafficVolume = 800; // Default: Low volume

  // Simulate peak hours (This logic would be learned by your model)
  if (hour >= 8 && hour < 11) { // Morning peak
    congestion = 0.8;
    avgSpeed = 18.5;
    trafficVolume = 2500;
  } else if (hour >= 11 && hour < 17) { // Mid-day
    congestion = 0.4;
    avgSpeed = 35.0;
    trafficVolume = 1500;
  } else if (hour >= 17 && hour < 20) { // Evening peak
    congestion = 0.9;
    avgSpeed = 15.0;
    trafficVolume = 3000;
  }

  // From your model snippet: "Roadwork and Construction Activity"
  // Simulate 1 in 10 chance of roadwork
  const roadwork = Math.random() < 0.1 ? 'Yes' : 'No';

  // From your model snippet: "Incident Reports"
  // Simulate 1 in 20 chance of an incident
  const incidents = Math.random() < 0.05 ? 1 : 0;

  // Return the full feature set.
  // The names MUST match what your model was trained on.
  return {
    'Traffic Volume': trafficVolume,
    'Average Speed': avgSpeed,
    'Congestion Level': congestion,
    // --- Other features from your model (simulating defaults) ---
    'Road Capacity Utilization': congestion * 0.9, // Guess
    'Incident Reports': incidents,
    'Public Transport Usage': trafficVolume / 5, // Guess
    'Parking Usage': Math.min(0.95, congestion * 1.2), // Guess
    'Pedestrian and Cyclist Count': trafficVolume / 10, // Guess
    'Roadwork and Construction Activity': roadwork,
  };
}

module.exports = { getSimulatedFeatures };