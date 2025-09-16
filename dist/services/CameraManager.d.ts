import type { CameraConfig, CameraPermissionState } from '../types/index.js';
/**
 * CameraManager handles camera access, video stream management, and permission handling
 * with proper TypeScript type definitions and error states.
 */
export declare class CameraManager {
    private currentStream;
    private permissionState;
    private readonly defaultConfig;
    /**
     * Initialize camera access with permission handling
     * @param config Optional camera configuration
     * @returns Promise resolving to MediaStream
     * @throws Error with typed error states for various failure scenarios
     */
    initializeCamera(config?: Partial<CameraConfig>): Promise<MediaStream>;
    /**
     * Stop camera and clean up resources
     */
    stopCamera(): void;
    /**
     * Get current camera stream
     * @returns Current MediaStream or null if not initialized
     */
    getCameraStream(): MediaStream | null;
    /**
     * Check if camera is currently active
     * @returns Boolean indicating if camera is active
     */
    isCameraActive(): boolean;
    /**
     * Get current camera permission state
     * @returns Current permission state
     */
    getPermissionState(): CameraPermissionState;
    /**
     * Check available camera devices
     * @returns Promise resolving to array of available video input devices
     */
    getAvailableCameras(): Promise<MediaDeviceInfo[]>;
    /**
     * Switch to a different camera device
     * @param deviceId ID of the camera device to switch to
     * @returns Promise resolving to new MediaStream
     */
    switchCamera(deviceId: string): Promise<MediaStream>;
    /**
     * Check camera permission status using Permissions API if available
     */
    private checkCameraPermission;
    /**
     * Merge provided config with default configuration
     * @param config Partial camera configuration
     * @returns Complete camera configuration
     */
    private mergeConfig;
    /**
     * Set up event listeners for the media stream
     * @param stream MediaStream to monitor
     */
    private setupStreamEventListeners;
    /**
     * Handle camera-related errors with proper typing
     * @param error Error from camera operations
     */
    private handleCameraError;
    /**
     * Clean up resources when the manager is destroyed
     */
    destroy(): void;
}
//# sourceMappingURL=CameraManager.d.ts.map