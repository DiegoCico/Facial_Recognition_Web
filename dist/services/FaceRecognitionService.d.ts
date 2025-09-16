import { FaceDetectionResult, RecognitionResult, KnownFace } from '../types';
/**
 * FaceRecognitionService handles face recognition and matching against known faces
 */
export declare class FaceRecognitionService {
    private faceDatabase;
    private isInitialized;
    private readonly RECOGNITION_THRESHOLD;
    private readonly MIN_CONFIDENCE;
    private readonly MAX_DISTANCE;
    constructor();
    /**
     * Initialize the face recognition service
     */
    initialize(): Promise<void>;
    /**
     * Recognize a face from detection result
     */
    recognizeFace(videoElement: HTMLVideoElement, faceDetection: FaceDetectionResult): Promise<RecognitionResult>;
    /**
     * Add a known face to the database
     */
    addKnownFace(name: string, videoElement: HTMLVideoElement, faceDetection: FaceDetectionResult): Promise<boolean>;
    /**
     * Remove a known face from the database
     */
    removeKnownFace(name: string): boolean;
    /**
     * Get all known faces
     */
    getKnownFaces(): KnownFace[];
    /**
     * Get face database statistics
     */
    getDatabaseStats(): {
        totalFaces: number;
        totalDescriptors: number;
        lastUpdated: Date;
    };
    /**
     * Clear all known faces from the database
     */
    clearDatabase(): void;
    /**
     * Update recognition thresholds
     */
    updateThresholds(options: {
        recognitionThreshold?: number;
        minConfidence?: number;
        maxDistance?: number;
    }): void;
    /**
     * Get current recognition configuration
     */
    getConfiguration(): {
        recognitionThreshold: number;
        minConfidence: number;
        maxDistance: number;
    };
    /**
     * Check if the service is ready for recognition
     */
    isReady(): boolean;
    /**
     * Extract face descriptor from video element and face detection
     */
    private extractFaceDescriptor;
    /**
     * Calculate bounding box overlap percentage
     */
    private calculateBoundingBoxOverlap;
    /**
     * Find the best match for a face descriptor
     */
    private findBestMatch;
    /**
     * Calculate Euclidean distance between two descriptors
     */
    private calculateEuclideanDistance;
    /**
     * Convert distance to confidence score (0-1)
     */
    private distanceToConfidence;
    /**
     * Generate a consistent face ID from a name
     */
    private generateFaceId;
}
//# sourceMappingURL=FaceRecognitionService.d.ts.map