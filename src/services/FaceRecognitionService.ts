import * as faceapi from 'face-api.js';
import { 
  FaceDetectionResult, 
  FaceDescriptor, 
  FaceMatch, 
  RecognitionResult, 
  KnownFace,
  FaceDatabase 
} from '../types';

/**
 * FaceRecognitionService handles face recognition and matching against known faces
 */
export class FaceRecognitionService {
  private faceDatabase: FaceDatabase;
  private isInitialized: boolean = false;
  private readonly RECOGNITION_THRESHOLD: number = 0.6; // Lower values = more strict matching
  private readonly MIN_CONFIDENCE: number = 0.5;
  private readonly MAX_DISTANCE: number = 0.6;

  constructor() {
    this.faceDatabase = {
      faces: new Map<string, KnownFace>(),
      totalDescriptors: 0,
      lastUpdated: new Date()
    };
  }

  /**
   * Initialize the face recognition service
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Verify that the face recognition model is loaded
    if (!faceapi.nets.faceRecognitionNet.isLoaded) {
      throw new Error('Face Recognition model is not loaded');
    }

    if (!faceapi.nets.faceLandmark68Net.isLoaded) {
      throw new Error('Face Landmark model is not loaded');
    }

    if (!faceapi.nets.ssdMobilenetv1.isLoaded) {
      throw new Error('SSD MobileNet model is not loaded');
    }

    this.isInitialized = true;
  }

  /**
   * Recognize a face from detection result
   */
  public async recognizeFace(
    videoElement: HTMLVideoElement,
    faceDetection: FaceDetectionResult
  ): Promise<RecognitionResult> {
    const startTime = performance.now();

    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // Extract face descriptor from the detected face
      const descriptor = await this.extractFaceDescriptor(videoElement, faceDetection);
      
      if (!descriptor) {
        return {
          isMatch: false,
          confidence: 0,
          processingTime: performance.now() - startTime
        };
      }

      // Find the best match in our database
      const match = this.findBestMatch(descriptor);

      const processingTime = performance.now() - startTime;

      if (match && match.confidence >= this.MIN_CONFIDENCE && match.distance <= this.MAX_DISTANCE) {
        return {
          isMatch: true,
          match,
          confidence: match.confidence,
          processingTime
        };
      }

      return {
        isMatch: false,
        confidence: match?.confidence || 0,
        processingTime
      };
    } catch (error) {
      console.error('Face recognition error:', error);
      return {
        isMatch: false,
        confidence: 0,
        processingTime: performance.now() - startTime
      };
    }
  }

  /**
   * Add a known face to the database
   */
  public async addKnownFace(
    name: string,
    videoElement: HTMLVideoElement,
    faceDetection: FaceDetectionResult
  ): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const descriptor = await this.extractFaceDescriptor(videoElement, faceDetection);
      
      if (!descriptor) {
        return false;
      }

      const faceId = this.generateFaceId(name);
      const existingFace = this.faceDatabase.faces.get(faceId);

      if (existingFace) {
        // Add descriptor to existing face
        existingFace.descriptors.push(descriptor);
        existingFace.lastSeen = new Date();
      } else {
        // Create new known face
        const knownFace: KnownFace = {
          id: faceId,
          name,
          descriptors: [descriptor],
          addedAt: new Date(),
          lastSeen: new Date()
        };
        this.faceDatabase.faces.set(faceId, knownFace);
      }

      this.faceDatabase.totalDescriptors++;
      this.faceDatabase.lastUpdated = new Date();

      return true;
    } catch (error) {
      console.error('Error adding known face:', error);
      return false;
    }
  }

  /**
   * Remove a known face from the database
   */
  public removeKnownFace(name: string): boolean {
    const faceId = this.generateFaceId(name);
    const face = this.faceDatabase.faces.get(faceId);
    
    if (face) {
      this.faceDatabase.totalDescriptors -= face.descriptors.length;
      this.faceDatabase.faces.delete(faceId);
      this.faceDatabase.lastUpdated = new Date();
      return true;
    }
    
    return false;
  }

  /**
   * Get all known faces
   */
  public getKnownFaces(): KnownFace[] {
    return Array.from(this.faceDatabase.faces.values());
  }

  /**
   * Get face database statistics
   */
  public getDatabaseStats(): {
    totalFaces: number;
    totalDescriptors: number;
    lastUpdated: Date;
  } {
    return {
      totalFaces: this.faceDatabase.faces.size,
      totalDescriptors: this.faceDatabase.totalDescriptors,
      lastUpdated: this.faceDatabase.lastUpdated
    };
  }

  /**
   * Clear all known faces from the database
   */
  public clearDatabase(): void {
    this.faceDatabase.faces.clear();
    this.faceDatabase.totalDescriptors = 0;
    this.faceDatabase.lastUpdated = new Date();
  }

  /**
   * Update recognition thresholds
   */
  public updateThresholds(options: {
    recognitionThreshold?: number;
    minConfidence?: number;
    maxDistance?: number;
  }): void {
    if (options.recognitionThreshold !== undefined) {
      (this as any).RECOGNITION_THRESHOLD = Math.max(0, Math.min(1, options.recognitionThreshold));
    }
    if (options.minConfidence !== undefined) {
      (this as any).MIN_CONFIDENCE = Math.max(0, Math.min(1, options.minConfidence));
    }
    if (options.maxDistance !== undefined) {
      (this as any).MAX_DISTANCE = Math.max(0, Math.min(2, options.maxDistance));
    }
  }

  /**
   * Get current recognition configuration
   */
  public getConfiguration(): {
    recognitionThreshold: number;
    minConfidence: number;
    maxDistance: number;
  } {
    return {
      recognitionThreshold: this.RECOGNITION_THRESHOLD,
      minConfidence: this.MIN_CONFIDENCE,
      maxDistance: this.MAX_DISTANCE
    };
  }

  /**
   * Check if the service is ready for recognition
   */
  public isReady(): boolean {
    return this.isInitialized && 
           faceapi.nets.faceRecognitionNet.isLoaded &&
           faceapi.nets.faceLandmark68Net.isLoaded &&
           faceapi.nets.ssdMobilenetv1.isLoaded;
  }

  /**
   * Extract face descriptor from video element and face detection
   */
  private async extractFaceDescriptor(
    videoElement: HTMLVideoElement,
    faceDetection: FaceDetectionResult
  ): Promise<Float32Array | null> {
    try {
      // Use face-api.js to detect faces with descriptors directly
      const detections = await faceapi
        .detectAllFaces(videoElement)
        .withFaceLandmarks()
        .withFaceDescriptors();

      if (detections.length === 0) {
        return null;
      }

      // Find the detection that best matches our face detection result
      let bestMatch = detections[0];
      let bestOverlap = 0;

      for (const detection of detections) {
        const overlap = this.calculateBoundingBoxOverlap(
          faceDetection.boundingBox,
          {
            x: detection.detection.box.x,
            y: detection.detection.box.y,
            width: detection.detection.box.width,
            height: detection.detection.box.height
          }
        );

        if (overlap > bestOverlap) {
          bestOverlap = overlap;
          bestMatch = detection;
        }
      }

      // Return the descriptor if we have a good match
      if (bestOverlap > 0.5 && bestMatch && bestMatch.descriptor) {
        return bestMatch.descriptor;
      }
      
      return null;
    } catch (error) {
      console.error('Error extracting face descriptor:', error);
      return null;
    }
  }

  /**
   * Calculate bounding box overlap percentage
   */
  private calculateBoundingBoxOverlap(
    box1: { x: number; y: number; width: number; height: number },
    box2: { x: number; y: number; width: number; height: number }
  ): number {
    const x1 = Math.max(box1.x, box2.x);
    const y1 = Math.max(box1.y, box2.y);
    const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
    const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);

    if (x2 <= x1 || y2 <= y1) {
      return 0; // No overlap
    }

    const intersectionArea = (x2 - x1) * (y2 - y1);
    const box1Area = box1.width * box1.height;
    const box2Area = box2.width * box2.height;
    const unionArea = box1Area + box2Area - intersectionArea;

    return intersectionArea / unionArea;
  }

  /**
   * Find the best match for a face descriptor
   */
  private findBestMatch(descriptor: Float32Array): FaceMatch | null {
    let bestMatch: FaceMatch | null = null;
    let bestDistance = Infinity;

    for (const [faceId, knownFace] of this.faceDatabase.faces) {
      for (let i = 0; i < knownFace.descriptors.length; i++) {
        const knownDescriptor = knownFace.descriptors[i];
        if (!knownDescriptor) continue;
        
        const distance = this.calculateEuclideanDistance(descriptor, knownDescriptor);
        
        if (distance < bestDistance && distance <= this.MAX_DISTANCE) {
          bestDistance = distance;
          bestMatch = {
            personName: knownFace.name,
            confidence: this.distanceToConfidence(distance),
            distance,
            descriptorId: `${faceId}_${i}`
          };
        }
      }
    }

    return bestMatch;
  }

  /**
   * Calculate Euclidean distance between two descriptors
   */
  private calculateEuclideanDistance(desc1: Float32Array, desc2: Float32Array): number {
    if (desc1.length !== desc2.length) {
      throw new Error('Descriptors must have the same length');
    }

    let sum = 0;
    for (let i = 0; i < desc1.length; i++) {
      const val1 = desc1[i];
      const val2 = desc2[i];
      if (val1 !== undefined && val2 !== undefined) {
        const diff = val1 - val2;
        sum += diff * diff;
      }
    }

    return Math.sqrt(sum);
  }

  /**
   * Convert distance to confidence score (0-1)
   */
  private distanceToConfidence(distance: number): number {
    // Convert distance to confidence: lower distance = higher confidence
    // Using exponential decay function
    const confidence = Math.exp(-distance * 2);
    return Math.max(0, Math.min(1, confidence));
  }

  /**
   * Generate a consistent face ID from a name
   */
  private generateFaceId(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
  }
}