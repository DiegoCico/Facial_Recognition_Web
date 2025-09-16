/**
 * CameraManager handles camera access, video stream management, and permission handling
 * with proper TypeScript type definitions and error states.
 */
export class CameraManager {
    constructor() {
        this.currentStream = null;
        this.permissionState = 'unknown';
        this.defaultConfig = {
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            }
        };
    }
    /**
     * Initialize camera access with permission handling
     * @param config Optional camera configuration
     * @returns Promise resolving to MediaStream
     * @throws Error with typed error states for various failure scenarios
     */
    async initializeCamera(config) {
        try {
            // Check if camera is already initialized
            if (this.currentStream && this.currentStream.active) {
                return this.currentStream;
            }
            // Merge provided config with defaults
            const cameraConfig = this.mergeConfig(config);
            // Check camera permission state
            await this.checkCameraPermission();
            // Request camera access
            const stream = await navigator.mediaDevices.getUserMedia(cameraConfig);
            this.currentStream = stream;
            this.permissionState = 'granted';
            // Set up stream event listeners
            this.setupStreamEventListeners(stream);
            return stream;
        }
        catch (error) {
            this.handleCameraError(error);
            throw error; // Re-throw for caller to handle
        }
    }
    /**
     * Stop camera and clean up resources
     */
    stopCamera() {
        if (this.currentStream) {
            // Stop all tracks in the stream
            this.currentStream.getTracks().forEach(track => {
                track.stop();
            });
            this.currentStream = null;
        }
    }
    /**
     * Get current camera stream
     * @returns Current MediaStream or null if not initialized
     */
    getCameraStream() {
        return this.currentStream;
    }
    /**
     * Check if camera is currently active
     * @returns Boolean indicating if camera is active
     */
    isCameraActive() {
        return this.currentStream !== null && this.currentStream.active;
    }
    /**
     * Get current camera permission state
     * @returns Current permission state
     */
    getPermissionState() {
        return this.permissionState;
    }
    /**
     * Check available camera devices
     * @returns Promise resolving to array of available video input devices
     */
    async getAvailableCameras() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.filter(device => device.kind === 'videoinput');
        }
        catch (error) {
            console.error('Failed to enumerate camera devices:', error);
            return [];
        }
    }
    /**
     * Switch to a different camera device
     * @param deviceId ID of the camera device to switch to
     * @returns Promise resolving to new MediaStream
     */
    async switchCamera(deviceId) {
        // Stop current camera
        this.stopCamera();
        // Create config with specific device ID
        const config = {
            video: {
                ...this.defaultConfig.video,
                deviceId: { exact: deviceId }
            }
        };
        return this.initializeCamera(config);
    }
    /**
     * Check camera permission status using Permissions API if available
     */
    async checkCameraPermission() {
        if ('permissions' in navigator) {
            try {
                const permission = await navigator.permissions.query({ name: 'camera' });
                this.permissionState = permission.state;
                // Listen for permission changes
                permission.addEventListener('change', () => {
                    this.permissionState = permission.state;
                });
            }
            catch (error) {
                // Permissions API not supported or failed
                this.permissionState = 'unknown';
            }
        }
    }
    /**
     * Merge provided config with default configuration
     * @param config Partial camera configuration
     * @returns Complete camera configuration
     */
    mergeConfig(config) {
        if (!config) {
            return this.defaultConfig;
        }
        return {
            video: {
                ...this.defaultConfig.video,
                ...config.video
            }
        };
    }
    /**
     * Set up event listeners for the media stream
     * @param stream MediaStream to monitor
     */
    setupStreamEventListeners(stream) {
        // Listen for track events
        stream.getTracks().forEach(track => {
            track.addEventListener('ended', () => {
                console.warn('Camera track ended unexpectedly');
                this.currentStream = null;
            });
            track.addEventListener('mute', () => {
                console.warn('Camera track muted');
            });
            track.addEventListener('unmute', () => {
                console.log('Camera track unmuted');
            });
        });
    }
    /**
     * Handle camera-related errors with proper typing
     * @param error Error from camera operations
     */
    handleCameraError(error) {
        let errorMessage = 'Unknown camera error';
        if (error instanceof Error) {
            switch (error.name) {
                case 'NotAllowedError':
                    this.permissionState = 'denied';
                    errorMessage = 'Camera access denied. Please allow camera permissions and try again.';
                    break;
                case 'NotFoundError':
                    errorMessage = 'No camera device found. Please connect a camera and try again.';
                    break;
                case 'NotReadableError':
                    errorMessage = 'Camera is already in use by another application. Please close other applications using the camera.';
                    break;
                case 'OverconstrainedError':
                    errorMessage = 'Camera constraints cannot be satisfied. Please try with different settings.';
                    break;
                case 'SecurityError':
                    errorMessage = 'Camera access blocked due to security restrictions.';
                    break;
                case 'AbortError':
                    errorMessage = 'Camera initialization was aborted.';
                    break;
                default:
                    errorMessage = `Camera error: ${error.message}`;
            }
        }
        console.error('Camera Manager Error:', errorMessage, error);
    }
    /**
     * Clean up resources when the manager is destroyed
     */
    destroy() {
        this.stopCamera();
    }
}
//# sourceMappingURL=CameraManager.js.map