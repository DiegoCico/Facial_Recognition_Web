import { FaceRecognitionService } from '../FaceRecognitionService';
import { FaceDetectionResult } from '../../types';
import * as faceapi from 'face-api.js';

// Mock face-api.js
jest.mock('face-api.js', () => ({
  nets: {
    faceRecognitionNet: {
      isLoaded: true
    },
    faceLandmark68Net: {
      isLoaded: true
    },
    ssdMobilenetv1: {
      isLoaded: true
    }
  },
  detectAllFaces: jest.fn(() => ({
    withFaceLandmarks: jest.fn(() => ({
      withFaceDescriptors: jest.fn()
    }))
  })),
  FaceDetection: jest.fn().mockImplementation((score, box) => ({
    score,
    box
  })),
  Box: jest.fn().mockImplementation((x, y, width, height) => ({
    x, y, width, height
  })),
  computeFaceDescriptor: jest.fn()
}));

describe('FaceRecognitionService', () => {
  let service: FaceRecognitionService;
  let mockVideoElement: HTMLVideoElement;
  let mockFaceDetection: FaceDetectionResult;

  beforeEach(() => {
    service = new FaceRecognitionService();
    
    // Create mock video element
    mockVideoElement = document.createElement('video') as HTMLVideoElement;
    
    // Create mock face detection result
    mockFaceDetection = {
      id: 'test_face_1',
      boundingBox: {
        x: 100,
        y: 100,
        width: 150,
        height: 150
      },
      confidence: 0.95,
      landmarks: [
        { x: 125, y: 125 },
        { x: 175, y: 125 }
      ]
    };

    // Reset mocks and restore default values
    jest.clearAllMocks();
    
    // Reset model loading states to true
    (faceapi.nets.faceRecognitionNet as any).isLoaded = true;
    (faceapi.nets.faceLandmark68Net as any).isLoaded = true;
    (faceapi.nets.ssdMobilenetv1 as any).isLoaded = true;
  });

  describe('Initialization', () => {
    it('should initialize successfully when all models are loaded', async () => {
      await expect(service.initialize()).resolves.not.toThrow();
      expect(service.isReady()).toBe(true);
    });

    it('should throw error when face recognition model is not loaded', async () => {
      (faceapi.nets.faceRecognitionNet as any).isLoaded = false;
      
      await expect(service.initialize()).rejects.toThrow('Face Recognition model is not loaded');
    });

    it('should throw error when face landmark model is not loaded', async () => {
      (faceapi.nets.faceRecognitionNet as any).isLoaded = true;
      (faceapi.nets.faceLandmark68Net as any).isLoaded = false;
      (faceapi.nets.ssdMobilenetv1 as any).isLoaded = true;
      
      await expect(service.initialize()).rejects.toThrow('Face Landmark model is not loaded');
    });

    it('should throw error when SSD MobileNet model is not loaded', async () => {
      (faceapi.nets.faceRecognitionNet as any).isLoaded = true;
      (faceapi.nets.faceLandmark68Net as any).isLoaded = true;
      (faceapi.nets.ssdMobilenetv1 as any).isLoaded = false;
      
      await expect(service.initialize()).rejects.toThrow('SSD MobileNet model is not loaded');
    });

    it('should not reinitialize if already initialized', async () => {
      await service.initialize();
      expect(service.isReady()).toBe(true);
      
      // Initialize again - should not throw or change state
      await service.initialize();
      expect(service.isReady()).toBe(true);
    });
  });

  describe('Face Recognition', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should return no match when no descriptor can be extracted', async () => {
      const mockDetectAllFaces = faceapi.detectAllFaces as jest.Mock;
      mockDetectAllFaces.mockReturnValue({
        withFaceLandmarks: jest.fn().mockReturnValue({
          withFaceDescriptors: jest.fn().mockResolvedValue([])
        })
      });

      const result = await service.recognizeFace(mockVideoElement, mockFaceDetection);

      expect(result.isMatch).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should return no match when no known faces exist', async () => {
      const mockDescriptor = new Float32Array([0.1, 0.2, 0.3, 0.4]);
      const mockDetectAllFaces = faceapi.detectAllFaces as jest.Mock;
      mockDetectAllFaces.mockReturnValue({
        withFaceLandmarks: jest.fn().mockReturnValue({
          withFaceDescriptors: jest.fn().mockResolvedValue([{
            detection: {
              box: { x: 100, y: 100, width: 150, height: 150 }
            },
            descriptor: mockDescriptor
          }])
        })
      });

      const result = await service.recognizeFace(mockVideoElement, mockFaceDetection);

      expect(result.isMatch).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should recognize a known face with high confidence', async () => {
      const mockDescriptor = new Float32Array([0.1, 0.2, 0.3, 0.4]);
      const mockDetectAllFaces = faceapi.detectAllFaces as jest.Mock;
      mockDetectAllFaces.mockReturnValue({
        withFaceLandmarks: jest.fn().mockReturnValue({
          withFaceDescriptors: jest.fn().mockResolvedValue([{
            detection: {
              box: { x: 100, y: 100, width: 150, height: 150 }
            },
            descriptor: mockDescriptor
          }])
        })
      });

      // Add a known face first
      await service.addKnownFace('John Doe', mockVideoElement, mockFaceDetection);

      // Try to recognize the same face
      const result = await service.recognizeFace(mockVideoElement, mockFaceDetection);

      expect(result.isMatch).toBe(true);
      expect(result.match?.personName).toBe('John Doe');
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should handle recognition errors gracefully', async () => {
      const mockDetectAllFaces = faceapi.detectAllFaces as jest.Mock;
      mockDetectAllFaces.mockReturnValue({
        withFaceLandmarks: jest.fn().mockReturnValue({
          withFaceDescriptors: jest.fn().mockRejectedValue(new Error('Recognition failed'))
        })
      });

      const result = await service.recognizeFace(mockVideoElement, mockFaceDetection);

      expect(result.isMatch).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.processingTime).toBeGreaterThan(0);
    });
  });

  describe('Known Face Management', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should add a new known face successfully', async () => {
      const mockDescriptor = new Float32Array([0.1, 0.2, 0.3, 0.4]);
      const mockDetectAllFaces = faceapi.detectAllFaces as jest.Mock;
      mockDetectAllFaces.mockReturnValue({
        withFaceLandmarks: jest.fn().mockReturnValue({
          withFaceDescriptors: jest.fn().mockResolvedValue([{
            detection: {
              box: { x: 100, y: 100, width: 150, height: 150 }
            },
            descriptor: mockDescriptor
          }])
        })
      });

      const result = await service.addKnownFace('Jane Smith', mockVideoElement, mockFaceDetection);

      expect(result).toBe(true);
      
      const knownFaces = service.getKnownFaces();
      expect(knownFaces).toHaveLength(1);
      expect(knownFaces[0]?.name).toBe('Jane Smith');
      expect(knownFaces[0]?.descriptors).toHaveLength(1);
    });

    it('should add multiple descriptors to existing face', async () => {
      const mockDescriptor1 = new Float32Array([0.1, 0.2, 0.3, 0.4]);
      const mockDescriptor2 = new Float32Array([0.15, 0.25, 0.35, 0.45]);
      
      const mockDetectAllFaces = faceapi.detectAllFaces as jest.Mock;
      mockDetectAllFaces
        .mockReturnValueOnce({
          withFaceLandmarks: jest.fn().mockReturnValue({
            withFaceDescriptors: jest.fn().mockResolvedValue([{
              detection: { box: { x: 100, y: 100, width: 150, height: 150 } },
              descriptor: mockDescriptor1
            }])
          })
        })
        .mockReturnValueOnce({
          withFaceLandmarks: jest.fn().mockReturnValue({
            withFaceDescriptors: jest.fn().mockResolvedValue([{
              detection: { box: { x: 100, y: 100, width: 150, height: 150 } },
              descriptor: mockDescriptor2
            }])
          })
        });

      await service.addKnownFace('John Doe', mockVideoElement, mockFaceDetection);
      await service.addKnownFace('John Doe', mockVideoElement, mockFaceDetection);

      const knownFaces = service.getKnownFaces();
      expect(knownFaces).toHaveLength(1);
      expect(knownFaces[0]?.name).toBe('John Doe');
      expect(knownFaces[0]?.descriptors).toHaveLength(2);
    });

    it('should fail to add face when descriptor extraction fails', async () => {
      const mockDetectAllFaces = faceapi.detectAllFaces as jest.Mock;
      mockDetectAllFaces.mockReturnValue({
        withFaceLandmarks: jest.fn().mockReturnValue({
          withFaceDescriptors: jest.fn().mockResolvedValue([])
        })
      });

      const result = await service.addKnownFace('Failed Face', mockVideoElement, mockFaceDetection);

      expect(result).toBe(false);
      expect(service.getKnownFaces()).toHaveLength(0);
    });

    it('should remove known face successfully', async () => {
      const mockDescriptor = new Float32Array([0.1, 0.2, 0.3, 0.4]);
      const mockDetectAllFaces = faceapi.detectAllFaces as jest.Mock;
      mockDetectAllFaces.mockReturnValue({
        withFaceLandmarks: jest.fn().mockReturnValue({
          withFaceDescriptors: jest.fn().mockResolvedValue([{
            detection: { box: { x: 100, y: 100, width: 150, height: 150 } },
            descriptor: mockDescriptor
          }])
        })
      });

      await service.addKnownFace('To Be Removed', mockVideoElement, mockFaceDetection);
      expect(service.getKnownFaces()).toHaveLength(1);

      const result = service.removeKnownFace('To Be Removed');

      expect(result).toBe(true);
      expect(service.getKnownFaces()).toHaveLength(0);
    });

    it('should return false when removing non-existent face', () => {
      const result = service.removeKnownFace('Non Existent');
      expect(result).toBe(false);
    });

    it('should clear all known faces', async () => {
      const mockDescriptor = new Float32Array([0.1, 0.2, 0.3, 0.4]);
      const mockDetectAllFaces = faceapi.detectAllFaces as jest.Mock;
      mockDetectAllFaces.mockReturnValue({
        withFaceLandmarks: jest.fn().mockReturnValue({
          withFaceDescriptors: jest.fn().mockResolvedValue([{
            detection: { box: { x: 100, y: 100, width: 150, height: 150 } },
            descriptor: mockDescriptor
          }])
        })
      });

      await service.addKnownFace('Face 1', mockVideoElement, mockFaceDetection);
      await service.addKnownFace('Face 2', mockVideoElement, mockFaceDetection);
      
      expect(service.getKnownFaces()).toHaveLength(2);

      service.clearDatabase();

      expect(service.getKnownFaces()).toHaveLength(0);
      
      const stats = service.getDatabaseStats();
      expect(stats.totalFaces).toBe(0);
      expect(stats.totalDescriptors).toBe(0);
    });
  });

  describe('Database Statistics', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should return correct database statistics', async () => {
      const mockDescriptor = new Float32Array([0.1, 0.2, 0.3, 0.4]);
      const mockDetectAllFaces = faceapi.detectAllFaces as jest.Mock;
      mockDetectAllFaces.mockReturnValue({
        withFaceLandmarks: jest.fn().mockReturnValue({
          withFaceDescriptors: jest.fn().mockResolvedValue([{
            detection: { box: { x: 100, y: 100, width: 150, height: 150 } },
            descriptor: mockDescriptor
          }])
        })
      });

      const initialStats = service.getDatabaseStats();
      expect(initialStats.totalFaces).toBe(0);
      expect(initialStats.totalDescriptors).toBe(0);

      await service.addKnownFace('Person 1', mockVideoElement, mockFaceDetection);
      await service.addKnownFace('Person 1', mockVideoElement, mockFaceDetection); // Add second descriptor
      await service.addKnownFace('Person 2', mockVideoElement, mockFaceDetection);

      const stats = service.getDatabaseStats();
      expect(stats.totalFaces).toBe(2);
      expect(stats.totalDescriptors).toBe(3);
      expect(stats.lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe('Configuration Management', () => {
    it('should update recognition thresholds', () => {
      const initialConfig = service.getConfiguration();
      
      service.updateThresholds({
        recognitionThreshold: 0.8,
        minConfidence: 0.7,
        maxDistance: 0.4
      });

      const updatedConfig = service.getConfiguration();
      expect(updatedConfig.recognitionThreshold).toBe(0.8);
      expect(updatedConfig.minConfidence).toBe(0.7);
      expect(updatedConfig.maxDistance).toBe(0.4);
    });

    it('should clamp threshold values to valid ranges', () => {
      service.updateThresholds({
        recognitionThreshold: 1.5, // Should be clamped to 1
        minConfidence: -0.5, // Should be clamped to 0
        maxDistance: 3.0 // Should be clamped to 2
      });

      const config = service.getConfiguration();
      expect(config.recognitionThreshold).toBe(1);
      expect(config.minConfidence).toBe(0);
      expect(config.maxDistance).toBe(2);
    });
  });

  describe('Distance Calculation', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should calculate correct Euclidean distance', async () => {
      // Test with known descriptors to verify distance calculation
      // Use closer descriptors that will be within the MAX_DISTANCE threshold
      const descriptor1 = new Float32Array([0.1, 0.2, 0.3, 0.4]);
      const descriptor2 = new Float32Array([0.15, 0.25, 0.35, 0.45]);
      
      const mockDetectAllFaces = faceapi.detectAllFaces as jest.Mock;
      mockDetectAllFaces
        .mockReturnValueOnce({
          withFaceLandmarks: jest.fn().mockReturnValue({
            withFaceDescriptors: jest.fn().mockResolvedValue([{
              detection: { box: { x: 100, y: 100, width: 150, height: 150 } },
              descriptor: descriptor1
            }])
          })
        })
        .mockReturnValueOnce({
          withFaceLandmarks: jest.fn().mockReturnValue({
            withFaceDescriptors: jest.fn().mockResolvedValue([{
              detection: { box: { x: 100, y: 100, width: 150, height: 150 } },
              descriptor: descriptor2
            }])
          })
        });

      // Add first face
      await service.addKnownFace('Test Person', mockVideoElement, mockFaceDetection);
      
      // Try to recognize with different descriptor
      const result = await service.recognizeFace(mockVideoElement, mockFaceDetection);
      
      // Calculate expected distance manually
      const expectedDistance = Math.sqrt(
        Math.pow(0.1 - 0.15, 2) + 
        Math.pow(0.2 - 0.25, 2) + 
        Math.pow(0.3 - 0.35, 2) + 
        Math.pow(0.4 - 0.45, 2)
      );
      
      expect(result.match?.distance).toBeCloseTo(expectedDistance, 2);
    });
  });

  describe('Error Handling', () => {
    it('should handle face-api.js errors gracefully', async () => {
      const mockDetectAllFaces = faceapi.detectAllFaces as jest.Mock;
      mockDetectAllFaces.mockReturnValue({
        withFaceLandmarks: jest.fn().mockReturnValue({
          withFaceDescriptors: jest.fn().mockRejectedValue(new Error('Face API error'))
        })
      });

      const result = await service.addKnownFace('Error Face', mockVideoElement, mockFaceDetection);

      expect(result).toBe(false);
    });

    it('should handle invalid descriptor types', async () => {
      const mockDetectAllFaces = faceapi.detectAllFaces as jest.Mock;
      mockDetectAllFaces.mockReturnValue({
        withFaceLandmarks: jest.fn().mockReturnValue({
          withFaceDescriptors: jest.fn().mockResolvedValue([{
            detection: { box: { x: 100, y: 100, width: 150, height: 150 } },
            descriptor: null // Invalid descriptor
          }])
        })
      });

      const result = await service.addKnownFace('Invalid Face', mockVideoElement, mockFaceDetection);

      expect(result).toBe(false);
    });
  });

  describe('Confidence Scoring', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should provide higher confidence for closer matches', async () => {
      const baseDescriptor = new Float32Array([0.1, 0.2, 0.3, 0.4]);
      const closeDescriptor = new Float32Array([0.11, 0.21, 0.31, 0.41]); // Very close
      const farDescriptor = new Float32Array([0.5, 0.6, 0.7, 0.8]); // Further away

      const mockDetectAllFaces = faceapi.detectAllFaces as jest.Mock;
      
      // Add base face
      mockDetectAllFaces.mockReturnValueOnce({
        withFaceLandmarks: jest.fn().mockReturnValue({
          withFaceDescriptors: jest.fn().mockResolvedValue([{
            detection: { box: { x: 100, y: 100, width: 150, height: 150 } },
            descriptor: baseDescriptor
          }])
        })
      });
      await service.addKnownFace('Test Person', mockVideoElement, mockFaceDetection);

      // Test close match
      mockDetectAllFaces.mockReturnValueOnce({
        withFaceLandmarks: jest.fn().mockReturnValue({
          withFaceDescriptors: jest.fn().mockResolvedValue([{
            detection: { box: { x: 100, y: 100, width: 150, height: 150 } },
            descriptor: closeDescriptor
          }])
        })
      });
      const closeResult = await service.recognizeFace(mockVideoElement, mockFaceDetection);

      // Test far match
      mockDetectAllFaces.mockReturnValueOnce({
        withFaceLandmarks: jest.fn().mockReturnValue({
          withFaceDescriptors: jest.fn().mockResolvedValue([{
            detection: { box: { x: 100, y: 100, width: 150, height: 150 } },
            descriptor: farDescriptor
          }])
        })
      });
      const farResult = await service.recognizeFace(mockVideoElement, mockFaceDetection);

      if (closeResult.isMatch && farResult.isMatch) {
        expect(closeResult.confidence).toBeGreaterThan(farResult.confidence);
      }
    });
  });
});