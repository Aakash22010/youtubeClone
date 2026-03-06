export const getUserCity = (): Promise<string> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve('Unknown');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`
          );
          const data = await response.json();
          const city = data.address?.city || data.address?.town || data.address?.village || 'Unknown';
          resolve(city);
        } catch (error) {
          console.error('Reverse geocoding failed', error);
          resolve('Unknown');
        }
      },
      (error) => {
        console.warn('Geolocation error:', error);
        resolve('Unknown');
      },
      { timeout: 10000 }
    );
  });
};