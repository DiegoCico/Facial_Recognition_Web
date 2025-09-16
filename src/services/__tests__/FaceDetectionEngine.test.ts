import { FaceDetectionEngine } from '../FaceDetectionEngine';
import { FaceDetectionResult } from '../../types';

// Mock face-api.js
jest.mock('face-api.js', () => ({
  nets: {
    ssdMobilenetv1: {
      isLoaded: true
    },
    faceLandmark68Net: {
      isLoaded: true
    }
  },
  SsdMobilenetv1Options: jest.fn().mockImplementation((options) => ({
    minConfidence: options?.minConfidence || 0.5,
    maxResults: options?.maxResults || 10
  })),
  detectAllFaces: jest.fn().mockReturnValue({
    withFaceLandmarks: jest.fn()
  })
}));

import * as faceapi from 'face-api.js';

describe('FaceDetectionEngine', () => {
  let faceDetectionEngine: FaceDetectionEngine;
  let mockVideoElement: HTMLVideoElement;
  let mockDetectAllFaces: jest.Mock;
  let mockWithFaceLandmarks: jest.Mock;

  beforeEach(() => {
    // Clear mocks first
    jest.clearAllMocks();
    
    // Reset model loading state
    (faceapi.nets.ssdMobilenetv1 as any).isLoaded = true;
    (faceapi.nets.faceLandmark68Net as any).isLoaded = true;
    
    // Setup face-api.js mocks
    mockWithFaceLandmarks = jest.fn();
    mockDetectAllFaces = faceapi.detectAllFaces as jest.Mock;
    mockDetectAllFaces.mockReturnValue({
      withFaceLandmarks: mockWithFaceLandmarks
    });
    
    // Create instance after mocks are set up
    faceDetectionEngine = new FaceDetectionEngine();
    
    // Create mock video element
    mockVideoElement = document.createElement('video') as HTMLVideoElement;
  });

  describe('constructor', () => {
    it('should initialize with default detection options', () => {
      // The constructor creates the options, so we check if it was called
      expect(faceapi.SsdMobilenetv1Options).toHaveBeenCalled();
    });

    it('should not be initialized by default', () => {
      expect(faceDetectionEngine.isReady()).toBe(false); // Not initialized yet
    });
  });

  describe('initialize', () => {
    beforeEach(() => {
      // Reset initialization state
      (faceDetectionEngine as any).isInitialized = false;
    });

    it('should initialize successfully when models are loaded', async () => {
      await faceDetectionEngine.initialize();
      expect(faceDetectionEngine.isReady()).toBe(true);
    });

    it('should throw error when SSD MobileNet model is not loaded', async () => {
      (faceapi.nets.ssdMobilenetv1 as any).isLoaded = false;
      
      await expect(faceDetectionEngine.initialize()).rejects.toThrow('SSD MobileNet model is not loaded');
    });

    it('should throw error when Face Landmark model is not loaded', async () => {
      (faceapi.nets.ssdMobilenetv1 as any).isLoaded = true; // Keep this one loaded
      (faceapi.nets.faceLandmark68Net as any).isLoaded = false;
      
      await expect(faceDetectionEngine.initialize()).rejects.toThrow('Face Landmark model is not loaded');
    });

    it('should not reinitialize if already initialized', async () => {
      await faceDetectionEngine.initialize();
      const firstCall = jest.fn();
      
      await faceDetectionEngine.initialize();
      // Should not throw or cause issues
      expect(faceDetectionEngine.isReady()).toBe(true);
    });
  });

  describe('detectFaces', () => {
    const mockDetectionResult = {
      detection: {
        box: { x: 100, y: 100, width: 50, height: 50 },
        score: 0.95
      },
      landmarks: {
        positions: [
          { x: 110, y: 110 },
          { x: 120, y: 115 },
          { x: 130, y: 120 }
        ]
      }
    };

    beforeEach(async () => {
      await faceDetectionEngine.initialize();
      mockWithFaceLandmarks.mockResolvedValue([mockDetectionResult]);
    });

    it('should detect faces successfully', async () => {
      // Skip frames to get to the processing frame
      await faceDetectionEngine.detectFaces(mockVideoElement); // frame 1 - skipped
      await faceDetectionEngine.detectFaces(mockVideoElement); // frame 2 - skipped
      const results = await faceDetectionEngine.detectFaces(mockVideoElement); // frame 3 - processed

      expect(mockDetectAllFaces).toHaveBeenCalledWith(mockVideoElement, expect.any(Object));
      expect(mockWithFaceLandmarks).toHaveBeenCalled();
      expect(results).toHaveLength(1);
      
      const detection = results[0]!;
      expect(detection.boundingBox).toEqual({
        x: 100,
        y: 100,
        width: 50,
        height: 50
      });
      expect(detection.confidence).toBe(0.95);
      expect(detection.landmarks).toHaveLength(3);
      expect(detection.id).toMatch(/^face_\d+_0$/);
    });

    it('should return empty array when no faces detected', async () => {
      mockWithFaceLandmarks.mockResolvedValue([]);

      const results = await faceDetectionEngine.detectFaces(mockVideoElement);

      expect(results).toEqual([]);
    });

    it('should handle detection errors gracefully', async () => {
      mockWithFaceLandmarks.mockRejectedValue(new Error('Detection failed'));
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      // Skip frames to get to the processing frame
      await faceDetectionEngine.detectFaces(mockVideoElement); // frame 1 - skipped
      await faceDetectionEngine.detectFaces(mockVideoElement); // frame 2 - skipped
      const results = await faceDetectionEngine.detectFaces(mockVideoElement); // frame 3 - processed

      expect(results).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('Face detection error:', expect.any(Error));
      
      consoleSpy.mockRestore();
    });

    it('should skip frames for performance optimization', async () => {
      // First call should be skipped (frame 1)
      let results = await faceDetectionEngine.detectFaces(mockVideoElement);
      expect(results).toEqual([]);
      expect(mockDetectAllFaces).not.toHaveBeenCalled();

      // Second call should be skipped (frame 2)
      results = await faceDetectionEngine.detectFaces(mockVideoElement);
      expect(results).toEqual([]);
      expect(mockDetectAllFaces).not.toHaveBeenCalled();

      // Third call should process (frame 3)
      results = await faceDetectionEngine.detectFaces(mockVideoElement);
      expect(mockDetectAllFaces).toHaveBeenCalledTimes(1);
    });

    it('should initialize automatically if not initialized', async () => {
      const newEngine = new FaceDetectionEngine();
      mockWithFaceLandmarks.mockResolvedValue([mockDetectionResult]);

      // Skip frames to get to the processing frame
      await newEngine.detectFaces(mockVideoElement); // frame 1 - skipped
      await newEngine.detectFaces(mockVideoElement); // frame 2 - skipped
      const results = await newEngine.detectFaces(mockVideoElement); // frame 3 - processed

      expect(results).toHaveLength(1);
      expect(newEngine.isReady()).toBe(true);
    });
  });

  describe('detectFacesInFrame', () => {
    const mockDetectionResult = {
      detection: {
        box: { x: 50, y: 60, width: 40, height: 45 },
        score: 0.85
      },
      landmarks: {
        positions: [
          { x: 60, y: 70 },
          { x: 70, y: 75 }
        ]
      }
    };

    beforeEach(async () => {
      await faceDetectionEngine.initialize();
      mockWithFaceLandmarks.mockResolvedValue([mockDetectionResult]);
    });

    it('should detect faces in a single frame', async () => {
      const mockImage = document.createElement('img') as HTMLImageElement;
      
      const results = await faceDetectionEngine.detectFacesInFrame(mockImage);

      expect(mockDetectAllFaces).toHaveBeenCalledWith(mockImage, expect.any(Object));
      expect(results).toHaveLength(1);
      
      const detection = results[0]!;
      expect(detection.boundingBox).toEqual({
        x: 50,
        y: 60,
        width: 40,
        height: 45
      });
      expect(detection.confidence).toBe(0.85);
    });

    it('should work with canvas elements', async () => {
      const mockCanvas = document.createElement('canvas') as HTMLCanvasElement;
      
      const results = await faceDetectionEngine.detectFacesInFrame(mockCanvas);

      expect(mockDetectAllFaces).toHaveBeenCalledWith(mockCanvas, expect.any(Object));
      expect(results).toHaveLength(1);
    });
  });

  describe('updateDetectionOptions', () => {
    it('should update minimum confidence', () => {
      faceDetectionEngine.updateDetectionOptions({ minConfidence: 0.8 });

      const options = faceDetectionEngine.getDetectionOptions();
      expect(options.minConfidence).toBe(0.8);
    });

    it('should update maximum results', () => {
      faceDetectionEngine.updateDetectionOptions({ maxResults: 5 });

      const options = faceDetectionEngine.getDetectionOptions();
      expect(options.maxResults).toBe(5);
    });

    it('should update frame skip interval', () => {
      faceDetectionEngine.updateDetectionOptions({ frameSkipInterval: 5 });

      const options = faceDetectionEngine.getDetectionOptions();
      expect(options.frameSkipInterval).toBe(5);
    });

    it('should handle minimum frame skip interval', () => {
      faceDetectionEngine.updateDetectionOptions({ frameSkipInterval: 0 });

      const options = faceDetectionEngine.getDetectionOptions();
      expect(options.frameSkipInterval).toBe(1);
    });
  });

  describe('utility methods', () => {
    const mockDetection: FaceDetectionResult = {
      id: 'test_face',
      boundingBox: { x: 100, y: 150, width: 80, height: 90 },
      confidence: 0.9,
      landmarks: [
        { x: 110, y: 160 },
        { x: 170, y: 165 }
      ]
    };

    describe('getFaceBoundingBox', () => {
      it('should return correct bounding box', () => {
        const box = faceDetectionEngine.getFaceBoundingBox(mockDetection);
        
        expect(box).toEqual({
          x: 100,
          y: 150,
          width: 80,
          height: 90
        });
      });
    });

    describe('getFaceCenter', () => {
      it('should calculate correct face center', () => {
        const center = faceDetectionEngine.getFaceCenter(mockDetection);
        
        expect(center).toEqual({
          x: 140, // 100 + 80/2
          y: 195  // 150 + 90/2
        });
      });
    });

    describe('getFaceArea', () => {
      it('should calculate correct face area', () => {
        const area = faceDetectionEngine.getFaceArea(mockDetection);
        
        expect(area).toBe(7200); // 80 * 90
      });
    });
  });

  describe('getDetectionOptions', () => {
    it('should return current detection options', () => {
      const options = faceDetectionEngine.getDetectionOptions();
      
      expect(options).toEqual({
        minConfidence: 0.5,
        maxResults: 10,
        frameSkipInterval: 3
      });
    });
  });

  describe('isReady', () => {
    it('should return true when initialized and models loaded', async () => {
      await faceDetectionEngine.initialize();
      expect(faceDetectionEngine.isReady()).toBe(true);
    });

    it('should return false when models not loaded', () => {
      (faceapi.nets.ssdMobilenetv1 as any).isLoaded = false;
      expect(faceDetectionEngine.isReady()).toBe(false);
    });
  });
});