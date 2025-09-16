import { 
  KnownFace, 
  FaceDescriptor, 
  FaceDatabase as FaceDatabaseType,
  FaceDetectionResult 
} from '../types';
import { FaceRecognitionService } from './FaceRecognitionService';

/**
 * FaceDatabase manages the storage and training of known faces
 */
export class FaceDatabase {
  private database: FaceDatabaseType;
  private faceRecognitionService: FaceRecognitionService;
  private readonly STORAGE_KEY = 'facial_recognition_database';
  private readonly MAX_DESCRIPTORS_PER_FACE = 10;
  private readonly MIN_TRAINING_SAMPLES = 3;

  constructor(faceRecognitionService: FaceRecognitionService) {
    this.faceRecognitionService = faceRecognitionService;
    this.database = {
      faces: new Map<string, KnownFace>(),
      totalDescriptors: 0,
      lastUpdated: new Date()
    };
    this.loadFromStorage();
  }

  /**
   * Train a new face with multiple samples
   */
  public async trainFace(
    name: string,
    videoElement: HTMLVideoElement,
    faceDetections: FaceDetectionResult[],
    onProgress?: (progress: number, total: number) => void
  ): Promise<{
    success: boolean;
    samplesAdded: number;
    totalSamples: number;
    message: string;
  }> {
    if (faceDetections.length === 0) {
      return {
        success: false,
        samplesAdded: 0,
        totalSamples: 0,
        message: 'No face detections provided for training'
      };
    }

    let samplesAdded = 0;
    const faceId = this.generateFaceId(name);
    
    for (let i = 0; i < faceDetections.length; i++) {
      if (onProgress) {
        onProgress(i + 1, faceDetections.length);
      }

      const faceDetection = faceDetections[i];
      if (!faceDetection) continue;
      
      const success = await this.faceRecognitionService.addKnownFace(
        name,
        videoElement,
        faceDetection
      );

      if (success) {
        samplesAdded++;
      }

      // Update our local database and check limits
      this.syncFromRecognitionService();
      const existingFace = this.database.faces.get(faceId);
      if (existingFace && existingFace.descriptors.length >= this.MAX_DESCRIPTORS_PER_FACE) {
        break;
      }
    }

    // Update our local database from the recognition service
    this.syncFromRecognitionService();
    this.saveToStorage();

    const totalSamples = this.database.faces.get(faceId)?.descriptors.length || 0;
    const isWellTrained = totalSamples >= this.MIN_TRAINING_SAMPLES;

    return {
      success: samplesAdded > 0,
      samplesAdded,
      totalSamples,
      message: isWellTrained 
        ? `Successfully trained ${name} with ${totalSamples} samples`
        : `Added ${samplesAdded} samples for ${name}. Need ${this.MIN_TRAINING_SAMPLES - totalSamples} more for optimal recognition`
    };
  }

  /**
   * Add a single training sample for a face
   */
  public async addTrainingSample(
    name: string,
    videoElement: HTMLVideoElement,
    faceDetection: FaceDetectionResult
  ): Promise<boolean> {
    const success = await this.faceRecognitionService.addKnownFace(
      name,
      videoElement,
      faceDetection
    );

    if (success) {
      this.syncFromRecognitionService();
      this.saveToStorage();
    }

    return success;
  }

  /**
   * Remove a known face from the database
   */
  public removeFace(name: string): boolean {
    const success = this.faceRecognitionService.removeKnownFace(name);
    
    if (success) {
      const faceId = this.generateFaceId(name);
      this.database.faces.delete(faceId);
      this.database.lastUpdated = new Date();
      this.saveToStorage();
    }

    return success;
  }

  /**
   * Get all known faces with training status
   */
  public getKnownFaces(): Array<KnownFace & { 
    isWellTrained: boolean;
    trainingProgress: number;
  }> {
    // Sync from recognition service to get latest data
    this.syncFromRecognitionService();
    
    return Array.from(this.database.faces.values()).map(face => ({
      ...face,
      isWellTrained: face.descriptors.length >= this.MIN_TRAINING_SAMPLES,
      trainingProgress: Math.min(face.descriptors.length / this.MIN_TRAINING_SAMPLES, 1)
    }));
  }

  /**
   * Get face by name
   */
  public getFace(name: string): (KnownFace & { 
    isWellTrained: boolean;
    trainingProgress: number;
  }) | null {
    // Sync from recognition service to get latest data
    this.syncFromRecognitionService();
    
    const faceId = this.generateFaceId(name);
    const face = this.database.faces.get(faceId);
    
    if (!face) {
      return null;
    }

    return {
      ...face,
      isWellTrained: face.descriptors.length >= this.MIN_TRAINING_SAMPLES,
      trainingProgress: Math.min(face.descriptors.length / this.MIN_TRAINING_SAMPLES, 1)
    };
  }

  /**
   * Get database statistics
   */
  public getStatistics(): {
    totalFaces: number;
    totalDescriptors: number;
    wellTrainedFaces: number;
    averageDescriptorsPerFace: number;
    lastUpdated: Date;
    storageSize: number;
  } {
    // Sync from recognition service to get latest data
    this.syncFromRecognitionService();
    
    const faces = Array.from(this.database.faces.values());
    const wellTrainedFaces = faces.filter(face => 
      face.descriptors.length >= this.MIN_TRAINING_SAMPLES
    ).length;

    const averageDescriptors = faces.length > 0 
      ? faces.reduce((sum, face) => sum + face.descriptors.length, 0) / faces.length 
      : 0;

    return {
      totalFaces: this.database.faces.size,
      totalDescriptors: this.database.totalDescriptors,
      wellTrainedFaces,
      averageDescriptorsPerFace: Math.round(averageDescriptors * 100) / 100,
      lastUpdated: this.database.lastUpdated,
      storageSize: this.getStorageSize()
    };
  }

  /**
   * Clear all faces from the database
   */
  public clearDatabase(): void {
    this.faceRecognitionService.clearDatabase();
    this.database.faces.clear();
    this.database.totalDescriptors = 0;
    this.database.lastUpdated = new Date();
    this.saveToStorage();
  }

  /**
   * Export database to JSON
   */
  public exportDatabase(): string {
    // Sync from recognition service to get latest data
    this.syncFromRecognitionService();
    
    const exportData = {
      faces: Array.from(this.database.faces.entries()).map(([id, face]) => ({
        id,
        name: face.name,
        descriptors: Array.from(face.descriptors).map(desc => Array.from(desc)),
        addedAt: face.addedAt.toISOString(),
        lastSeen: face.lastSeen?.toISOString()
      })),
      totalDescriptors: this.database.totalDescriptors,
      lastUpdated: this.database.lastUpdated.toISOString(),
      exportedAt: new Date().toISOString()
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import database from JSON
   */
  public async importDatabase(jsonData: string): Promise<{
    success: boolean;
    facesImported: number;
    descriptorsImported: number;
    message: string;
  }> {
    try {
      const importData = JSON.parse(jsonData);
      
      if (!importData.faces || !Array.isArray(importData.faces)) {
        return {
          success: false,
          facesImported: 0,
          descriptorsImported: 0,
          message: 'Invalid database format'
        };
      }

      // Clear existing database
      this.clearDatabase();

      let facesImported = 0;
      let descriptorsImported = 0;

      for (const faceData of importData.faces) {
        try {
          const face: KnownFace = {
            id: faceData.id,
            name: faceData.name,
            descriptors: faceData.descriptors.map((desc: number[]) => new Float32Array(desc)),
            addedAt: new Date(faceData.addedAt),
            ...(faceData.lastSeen && { lastSeen: new Date(faceData.lastSeen) })
          };

          this.database.faces.set(faceData.id, face);
          facesImported++;
          descriptorsImported += face.descriptors.length;
        } catch (error) {
          console.warn(`Failed to import face ${faceData.name}:`, error);
        }
      }

      this.database.totalDescriptors = descriptorsImported;
      this.database.lastUpdated = new Date();

      // Sync to recognition service
      this.syncToRecognitionService();
      this.saveToStorage();

      return {
        success: true,
        facesImported,
        descriptorsImported,
        message: `Successfully imported ${facesImported} faces with ${descriptorsImported} descriptors`
      };
    } catch (error) {
      return {
        success: false,
        facesImported: 0,
        descriptorsImported: 0,
        message: `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Validate face training quality
   */
  public validateTraining(name: string): {
    isValid: boolean;
    sampleCount: number;
    recommendations: string[];
  } {
    // Sync from recognition service to get latest data
    this.syncFromRecognitionService();
    
    const faceId = this.generateFaceId(name);
    const face = this.database.faces.get(faceId);
    const recommendations: string[] = [];

    if (!face) {
      return {
        isValid: false,
        sampleCount: 0,
        recommendations: ['Face not found in database']
      };
    }

    if (face.descriptors.length < this.MIN_TRAINING_SAMPLES) {
      recommendations.push(
        `Add ${this.MIN_TRAINING_SAMPLES - face.descriptors.length} more training samples`
      );
    }

    if (face.descriptors.length < 5) {
      recommendations.push('Consider adding more samples for better accuracy');
    }

    if (face.descriptors.length === this.MAX_DESCRIPTORS_PER_FACE) {
      recommendations.push('Maximum training samples reached');
    }

    return {
      isValid: face.descriptors.length >= this.MIN_TRAINING_SAMPLES,
      sampleCount: face.descriptors.length,
      recommendations
    };
  }

  /**
   * Sync database from recognition service
   */
  private syncFromRecognitionService(): void {
    const knownFaces = this.faceRecognitionService.getKnownFaces();
    const stats = this.faceRecognitionService.getDatabaseStats();

    // Update our database with the latest data
    this.database.faces.clear();
    
    for (const face of knownFaces) {
      this.database.faces.set(face.id, face);
    }

    this.database.totalDescriptors = stats.totalDescriptors;
    this.database.lastUpdated = stats.lastUpdated;
  }

  /**
   * Sync database to recognition service
   */
  private syncToRecognitionService(): void {
    this.faceRecognitionService.clearDatabase();
    
    // This would require extending FaceRecognitionService to accept pre-computed descriptors
    // For now, we'll note this as a limitation
    console.warn('Direct sync to recognition service not implemented - requires manual re-training');
  }

  /**
   * Save database to localStorage
   */
  private saveToStorage(): void {
    try {
      const serializedData = this.exportDatabase();
      localStorage.setItem(this.STORAGE_KEY, serializedData);
    } catch (error) {
      console.error('Failed to save database to storage:', error);
    }
  }

  /**
   * Load database from localStorage
   */
  private loadFromStorage(): void {
    try {
      const storedData = localStorage.getItem(this.STORAGE_KEY);
      if (storedData) {
        this.importDatabase(storedData);
      }
    } catch (error) {
      console.error('Failed to load database from storage:', error);
    }
  }

  /**
   * Get storage size in bytes
   */
  private getStorageSize(): number {
    try {
      const storedData = localStorage.getItem(this.STORAGE_KEY);
      return storedData ? new Blob([storedData]).size : 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Generate a consistent face ID from a name
   */
  private generateFaceId(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  }
}