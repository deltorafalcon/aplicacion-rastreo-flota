/**
 * GPS Service - Works in both Browser AND Native App (Capacitor)
 * Automatically detects the environment and uses the right API.
 */

const isBrowser = () => {
    // Check if we're in a regular browser (not a Capacitor native app)
    return !window.Capacitor || !window.Capacitor.isNativePlatform();
};

export const gpsService = {
    /**
     * Request permissions for Geolocation
     */
    requestPermissions: async () => {
        if (isBrowser()) {
            // Browser: permissions are requested automatically on watchPosition
            return true;
        }
        try {
            const { Geolocation } = await import('@capacitor/geolocation');
            const status = await Geolocation.requestPermissions();
            return status.location === 'granted';
        } catch (error) {
            console.error('Error requesting GPS permissions:', error);
            return true; // fallback to browser
        }
    },

    /**
     * Start tracking - auto-detects browser vs native
     */
    startBackgroundTracking: async (callback) => {
        if (isBrowser()) {
            // === BROWSER MODE: Use navigator.geolocation ===
            console.log('GPS: Using Browser Geolocation API');
            return new Promise((resolve, reject) => {
                if (!navigator.geolocation) {
                    console.error('Geolocation not supported');
                    reject('Geolocation not supported');
                    return;
                }
                const watchId = navigator.geolocation.watchPosition(
                    (position) => {
                        callback({
                            lat: position.coords.latitude,
                            lng: position.coords.longitude,
                            speed: Math.round((position.coords.speed || 0) * 3.6), // m/s to km/h
                            timestamp: position.timestamp
                        });
                    },
                    (error) => {
                        console.error('Browser GPS error:', error);
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 1000
                    }
                );
                resolve(watchId);
            });
        } else {
            // === NATIVE MODE: Use Capacitor Plugin ===
            try {
                const { registerPlugin } = await import('@capacitor/core');
                const BackgroundGeolocation = registerPlugin('BackgroundGeolocation');

                const watcherId = await BackgroundGeolocation.addWatcher(
                    {
                        backgroundMessage: "Rastreo de flota activo",
                        backgroundTitle: "Fleet Tracking Pro",
                        requestPermissions: true,
                        stale: false,
                        distanceFilter: 10
                    },
                    (location, error) => {
                        if (error) return;
                        if (location) {
                            callback({
                                lat: location.latitude,
                                lng: location.longitude,
                                speed: Math.round((location.speed || 0) * 3.6),
                                timestamp: location.time
                            });
                        }
                    }
                );
                return watcherId;
            } catch (error) {
                console.error('Native GPS error, falling back to browser:', error);
                // Fallback to browser if native fails
                return gpsService.startBackgroundTracking(callback);
            }
        }
    },

    /**
     * Stop tracking
     */
    stopBackgroundTracking: async (watchId) => {
        if (isBrowser()) {
            navigator.geolocation.clearWatch(watchId);
        } else {
            try {
                const { registerPlugin } = await import('@capacitor/core');
                const BackgroundGeolocation = registerPlugin('BackgroundGeolocation');
                await BackgroundGeolocation.removeWatcher({ id: watchId });
            } catch (e) {
                navigator.geolocation.clearWatch(watchId);
            }
        }
    },

    stopTracking: async (watchId) => {
        navigator.geolocation.clearWatch(watchId);
    }
};
