import { FaceDetectionResult } from '../types';
/**
 * FaceDetectionEngine handles real-time face detection on video streams
 */
export declare class FaceDetectionEngine {
    private detectionOptions;
    private isInitialized;
    private frameSkipCount;
    private FRAME_SKIP_INTERVAL;
    constructor();
    /**
     * Initialize the face detection engine
     */
    initialize(): Promise<void>;
    /**
     * Detect faces in a video element
     */
    detectFaces(videoElement: HTMLVideoElement): Promise<FaceDetectionResult[]>;
    /**
     * Detect faces in a single frame (for testing or one-time detection)
     */
    detectFacesInFrame(imageElement: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement): Promise<FaceDetectionResult[]>;
    /**
     * Update detection options for performance tuning
     */
    updateDetectionOptions(options: Partial<{
        minConfidence: number;
        maxResults: number;
        frameSkipInterval: number;
    }>): void;
    /**
     * Get current detection configuration
     */
    getDetectionOptions(): {
        minConfidence: number;
        maxResults: number;
        frameSkipInterval: number;
    };
    /**
     * Check if the engine is ready for detection
     */
    isReady(): boolean;
    /**
     * Get face bounding box from detection result
     */
    getFaceBoundingBox(detection: FaceDetectionResult): {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    /**
     * Calculate face center point
     */
    getFaceCenter(detection: FaceDetectionResult): {
        x: number;
        y: number;
    };
    /**
     * Calculate face area for size-based filtering
     */
    getFaceArea(detection: FaceDetectionResult): number;
    private convertToFaceDetectionResult;
}
//# sourceMappingURL=FaceDetectionEngine.d.ts.map