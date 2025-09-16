import { KnownFace, FaceDetectionResult } from '../types';
import { FaceRecognitionService } from './FaceRecognitionService';
/**
 * FaceDatabase manages the storage and training of known faces
 */
export declare class FaceDatabase {
    private database;
    private faceRecognitionService;
    private readonly STORAGE_KEY;
    private readonly MAX_DESCRIPTORS_PER_FACE;
    private readonly MIN_TRAINING_SAMPLES;
    constructor(faceRecognitionService: FaceRecognitionService);
    /**
     * Train a new face with multiple samples
     */
    trainFace(name: string, videoElement: HTMLVideoElement, faceDetections: FaceDetectionResult[], onProgress?: (progress: number, total: number) => void): Promise<{
        success: boolean;
        samplesAdded: number;
        totalSamples: number;
        message: string;
    }>;
    /**
     * Add a single training sample for a face
     */
    addTrainingSample(name: string, videoElement: HTMLVideoElement, faceDetection: FaceDetectionResult): Promise<boolean>;
    /**
     * Remove a known face from the database
     */
    removeFace(name: string): boolean;
    /**
     * Get all known faces with training status
     */
    getKnownFaces(): Array<KnownFace & {
        isWellTrained: boolean;
        trainingProgress: number;
    }>;
    /**
     * Get face by name
     */
    getFace(name: string): (KnownFace & {
        isWellTrained: boolean;
        trainingProgress: number;
    }) | null;
    /**
     * Get database statistics
     */
    getStatistics(): {
        totalFaces: number;
        totalDescriptors: number;
        wellTrainedFaces: number;
        averageDescriptorsPerFace: number;
        lastUpdated: Date;
        storageSize: number;
    };
    /**
     * Clear all faces from the database
     */
    clearDatabase(): void;
    /**
     * Export database to JSON
     */
    exportDatabase(): string;
    /**
     * Import database from JSON
     */
    importDatabase(jsonData: string): Promise<{
        success: boolean;
        facesImported: number;
        descriptorsImported: number;
        message: string;
    }>;
    /**
     * Validate face training quality
     */
    validateTraining(name: string): {
        isValid: boolean;
        sampleCount: number;
        recommendations: string[];
    };
    /**
     * Sync database from recognition service
     */
    private syncFromRecognitionService;
    /**
     * Sync database to recognition service
     */
    private syncToRecognitionService;
    /**
     * Save database to localStorage
     */
    private saveToStorage;
    /**
     * Load database from localStorage
     */
    private loadFromStorage;
    /**
     * Get storage size in bytes
     */
    private getStorageSize;
    /**
     * Generate a consistent face ID from a name
     */
    private generateFaceId;
}
//# sourceMappingURL=FaceDatabase.d.ts.map