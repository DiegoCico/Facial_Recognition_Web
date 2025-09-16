import * as faceapi from 'face-api.js';
import { FaceDetectionResult } from '../types';

/**
 * FaceDetectionEngine handles real-time face detection on video streams
 */
export class FaceDetectionEngine {
  private detectionOptions: faceapi.SsdMobilenetv1Options;
  private isInitialized: boolean = false;
  private frameSkipCount: number = 0;
  private FRAME_SKIP_INTERVAL = 3; // Process every 3rd frame for performance

  constructor() {
    // Configure detection options for optimal performance
    this.detectionOptions = new faceapi.SsdMobilenetv1Options({
      minConfidence: 0.5,
      maxResults: 10
    });
  }

  /**
   * Initialize the face detection engine
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // Verify that required models are loaded
    if (!faceapi.nets.ssdMobilenetv1.isLoaded) {
      throw new Error('SSD MobileNet model is not loaded');
    }

    if (!faceapi.nets.faceLandmark68Net.isLoaded) {
      throw new Error('Face Landmark model is not loaded');
    }

    this.isInitialized = true;
  }

  /**
   * Detect faces in a video element
   */
  public async detectFaces(videoElement: HTMLVideoElement): Promise<FaceDetectionResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Skip frames for performance optimization
    this.frameSkipCount++;
    if (this.frameSkipCount % this.FRAME_SKIP_INTERVAL !== 0) {
      return [];
    }

    try {
      // Perform face detection with landmarks
      const detections = await faceapi
        .detectAllFaces(videoElement, this.detectionOptions)
        .withFaceLandmarks();

      // Convert face-api.js results to our FaceDetectionResult format
      return detections.map((detection, index) => this.convertToFaceDetectionResult(detection, index));
    } catch (error) {
      console.error('Face detection error:', error);
      return [];
    }
  }

  /**
   * Detect faces in a single frame (for testing or one-time detection)
   */
  public async detectFacesInFrame(
    imageElement: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement
  ): Promise<FaceDetectionResult[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      const detections = await faceapi
        .detectAllFaces(imageElement, this.detectionOptions)
        .withFaceLandmarks();

      return detections.map((detection, index) => this.convertToFaceDetectionResult(detection, index));
    } catch (error) {
      console.error('Face detection error:', error);
      return [];
    }
  }

  /**
   * Update detection options for performance tuning
   */
  public updateDetectionOptions(options: Partial<{
    minConfidence: number;
    maxResults: number;
    frameSkipInterval: number;
  }>): void {
    if (options.minConfidence !== undefined) {
      this.detectionOptions = new faceapi.SsdMobilenetv1Options({
        minConfidence: options.minConfidence,
        maxResults: this.detectionOptions.maxResults
      });
    }

    if (options.maxResults !== undefined) {
      this.detectionOptions = new faceapi.SsdMobilenetv1Options({
        minConfidence: this.detectionOptions.minConfidence,
        maxResults: options.maxResults
      });
    }

    if (options.frameSkipInterval !== undefined) {
      this.FRAME_SKIP_INTERVAL = Math.max(1, options.frameSkipInterval);
    }
  }

  /**
   * Get current detection configuration
   */
  public getDetectionOptions(): {
    minConfidence: number;
    maxResults: number;
    frameSkipInterval: number;
  } {
    return {
      minConfidence: this.detectionOptions.minConfidence,
      maxResults: this.detectionOptions.maxResults,
      frameSkipInterval: this.FRAME_SKIP_INTERVAL
    };
  }

  /**
   * Check if the engine is ready for detection
   */
  public isReady(): boolean {
    return this.isInitialized && 
           faceapi.nets.ssdMobilenetv1.isLoaded && 
           faceapi.nets.faceLandmark68Net.isLoaded;
  }

  /**
   * Get face bounding box from detection result
   */
  public getFaceBoundingBox(detection: FaceDetectionResult): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    return {
      x: detection.boundingBox.x,
      y: detection.boundingBox.y,
      width: detection.boundingBox.width,
      height: detection.boundingBox.height
    };
  }

  /**
   * Calculate face center point
   */
  public getFaceCenter(detection: FaceDetectionResult): { x: number; y: number } {
    const box = detection.boundingBox;
    return {
      x: box.x + box.width / 2,
      y: box.y + box.height / 2
    };
  }

  /**
   * Calculate face area for size-based filtering
   */
  public getFaceArea(detection: FaceDetectionResult): number {
    return detection.boundingBox.width * detection.boundingBox.height;
  }

  private convertToFaceDetectionResult(
    detection: faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }, faceapi.FaceLandmarks68>,
    index: number
  ): FaceDetectionResult {
    const box = detection.detection.box;
    const landmarks = detection.landmarks.positions;

    return {
      id: `face_${Date.now()}_${index}`,
      boundingBox: {
        x: Math.round(box.x),
        y: Math.round(box.y),
        width: Math.round(box.width),
        height: Math.round(box.height)
      },
      confidence: detection.detection.score,
      landmarks: landmarks.map(point => ({
        x: Math.round(point.x),
        y: Math.round(point.y)
      }))
    };
  }
}