import { FaceDatabase } from '../FaceDatabase';
import { FaceRecognitionService } from '../FaceRecognitionService';
import { FaceDetectionResult, KnownFace } from '../../types';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock FaceRecognitionService
jest.mock('../FaceRecognitionService');

describe('FaceDatabase', () => {
  let faceDatabase: FaceDatabase;
  let mockFaceRecognitionService: jest.Mocked<FaceRecognitionService>;
  let mockVideoElement: HTMLVideoElement;
  let mockFaceDetection: FaceDetectionResult;

  beforeEach(() => {
    // Reset localStorage mock
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockClear();
    
    // Create mock FaceRecognitionService
    mockFaceRecognitionService = {
      addKnownFace: jest.fn(),
      removeKnownFace: jest.fn(),
      getKnownFaces: jest.fn(),
      getDatabaseStats: jest.fn(),
      clearDatabase: jest.fn(),
      initialize: jest.fn(),
      recognizeFace: jest.fn(),
      updateThresholds: jest.fn(),
      getConfiguration: jest.fn(),
      isReady: jest.fn()
    } as any;

    // Set up default mock returns
    mockFaceRecognitionService.getKnownFaces.mockReturnValue([]);
    mockFaceRecognitionService.getDatabaseStats.mockReturnValue({
      totalFaces: 0,
      totalDescriptors: 0,
      lastUpdated: new Date()
    });

    faceDatabase = new FaceDatabase(mockFaceRecognitionService);

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
  });

  describe('Training', () => {
    it('should train a face with multiple samples', async () => {
      const faceDetections = [mockFaceDetection, mockFaceDetection, mockFaceDetection];
      mockFaceRecognitionService.addKnownFace.mockResolvedValue(true);

      const mockKnownFace: KnownFace = {
        id: 'john_doe',
        name: 'John Doe',
        descriptors: [
          new Float32Array([0.1, 0.2]),
          new Float32Array([0.15, 0.25]),
          new Float32Array([0.12, 0.22])
        ],
        addedAt: new Date(),
        lastSeen: new Date()
      };

      mockFaceRecognitionService.getKnownFaces.mockReturnValue([mockKnownFace]);
      mockFaceRecognitionService.getDatabaseStats.mockReturnValue({
        totalFaces: 1,
        totalDescriptors: 3,
        lastUpdated: new Date()
      });

      const result = await faceDatabase.trainFace('John Doe', mockVideoElement, faceDetections);

      expect(result.success).toBe(true);
      expect(result.samplesAdded).toBe(3);
      expect(result.totalSamples).toBe(3);
      expect(result.message).toContain('Successfully trained John Doe');
      expect(mockFaceRecognitionService.addKnownFace).toHaveBeenCalledTimes(3);
    });

    it('should handle training failures gracefully', async () => {
      const faceDetections = [mockFaceDetection, mockFaceDetection];
      mockFaceRecognitionService.addKnownFace.mockResolvedValue(false);

      const result = await faceDatabase.trainFace('Failed Person', mockVideoElement, faceDetections);

      expect(result.success).toBe(false);
      expect(result.samplesAdded).toBe(0);
      expect(result.totalSamples).toBe(0);
    });

    it('should provide progress updates during training', async () => {
      const faceDetections = [mockFaceDetection, mockFaceDetection, mockFaceDetection];
      mockFaceRecognitionService.addKnownFace.mockResolvedValue(true);

      const progressCallback = jest.fn();
      await faceDatabase.trainFace('Progress Person', mockVideoElement, faceDetections, progressCallback);

      expect(progressCallback).toHaveBeenCalledTimes(3);
      expect(progressCallback).toHaveBeenNthCalledWith(1, 1, 3);
      expect(progressCallback).toHaveBeenNthCalledWith(2, 2, 3);
      expect(progressCallback).toHaveBeenNthCalledWith(3, 3, 3);
    });

    it('should limit descriptors per face', async () => {
      // Create 15 face detections (more than MAX_DESCRIPTORS_PER_FACE = 10)
      const faceDetections = Array(15).fill(mockFaceDetection);
      mockFaceRecognitionService.addKnownFace.mockResolvedValue(true);

      // Mock that the face already has 10 descriptors after some additions
      const mockKnownFace: KnownFace = {
        id: 'limited_person',
        name: 'Limited Person',
        descriptors: Array(10).fill(new Float32Array([0.1, 0.2])),
        addedAt: new Date(),
        lastSeen: new Date()
      };

      // Return the face with 10 descriptors after the 10th call
      mockFaceRecognitionService.getKnownFaces.mockImplementation(() => {
        if (mockFaceRecognitionService.addKnownFace.mock.calls.length >= 10) {
          return [mockKnownFace];
        }
        return [];
      });

      const result = await faceDatabase.trainFace('Limited Person', mockVideoElement, faceDetections);

      // Should stop at 10 calls even though 15 detections were provided
      expect(mockFaceRecognitionService.addKnownFace).toHaveBeenCalledTimes(10);
    });

    it('should handle empty face detections', async () => {
      const result = await faceDatabase.trainFace('Empty Person', mockVideoElement, []);

      expect(result.success).toBe(false);
      expect(result.message).toBe('No face detections provided for training');
      expect(mockFaceRecognitionService.addKnownFace).not.toHaveBeenCalled();
    });
  });

  describe('Single Sample Training', () => {
    it('should add a single training sample', async () => {
      mockFaceRecognitionService.addKnownFace.mockResolvedValue(true);

      const result = await faceDatabase.addTrainingSample('Sample Person', mockVideoElement, mockFaceDetection);

      expect(result).toBe(true);
      expect(mockFaceRecognitionService.addKnownFace).toHaveBeenCalledWith(
        'Sample Person',
        mockVideoElement,
        mockFaceDetection
      );
    });

    it('should handle single sample training failure', async () => {
      mockFaceRecognitionService.addKnownFace.mockResolvedValue(false);

      const result = await faceDatabase.addTrainingSample('Failed Sample', mockVideoElement, mockFaceDetection);

      expect(result).toBe(false);
    });
  });

  describe('Face Management', () => {
    it('should remove a face successfully', () => {
      mockFaceRecognitionService.removeKnownFace.mockReturnValue(true);

      const result = faceDatabase.removeFace('Remove Person');

      expect(result).toBe(true);
      expect(mockFaceRecognitionService.removeKnownFace).toHaveBeenCalledWith('Remove Person');
    });

    it('should handle face removal failure', () => {
      mockFaceRecognitionService.removeKnownFace.mockReturnValue(false);

      const result = faceDatabase.removeFace('Nonexistent Person');

      expect(result).toBe(false);
    });

    it('should get known faces with training status', () => {
      const mockKnownFaces: KnownFace[] = [
        {
          id: 'well_trained',
          name: 'Well Trained',
          descriptors: Array(5).fill(new Float32Array([0.1, 0.2])),
          addedAt: new Date(),
          lastSeen: new Date()
        },
        {
          id: 'under_trained',
          name: 'Under Trained',
          descriptors: Array(2).fill(new Float32Array([0.1, 0.2])),
          addedAt: new Date(),
          lastSeen: new Date()
        }
      ];

      mockFaceRecognitionService.getKnownFaces.mockReturnValue(mockKnownFaces);

      const faces = faceDatabase.getKnownFaces();

      expect(faces).toHaveLength(2);
      expect(faces[0]?.isWellTrained).toBe(true);
      expect(faces[0]?.trainingProgress).toBe(1);
      expect(faces[1]?.isWellTrained).toBe(false);
      expect(faces[1]?.trainingProgress).toBeCloseTo(0.67, 2);
    });

    it('should get a specific face by name', () => {
      const mockKnownFace: KnownFace = {
        id: 'specific_person',
        name: 'Specific Person',
        descriptors: Array(3).fill(new Float32Array([0.1, 0.2])),
        addedAt: new Date(),
        lastSeen: new Date()
      };

      mockFaceRecognitionService.getKnownFaces.mockReturnValue([mockKnownFace]);

      const face = faceDatabase.getFace('Specific Person');

      expect(face).not.toBeNull();
      expect(face?.name).toBe('Specific Person');
      expect(face?.isWellTrained).toBe(true);
    });

    it('should return null for non-existent face', () => {
      mockFaceRecognitionService.getKnownFaces.mockReturnValue([]);

      const face = faceDatabase.getFace('Nonexistent Person');

      expect(face).toBeNull();
    });

    it('should clear the database', () => {
      faceDatabase.clearDatabase();

      expect(mockFaceRecognitionService.clearDatabase).toHaveBeenCalled();
    });
  });

  describe('Statistics', () => {
    it('should return correct database statistics', () => {
      const mockKnownFaces: KnownFace[] = [
        {
          id: 'person1',
          name: 'Person 1',
          descriptors: Array(5).fill(new Float32Array([0.1, 0.2])),
          addedAt: new Date(),
          lastSeen: new Date()
        },
        {
          id: 'person2',
          name: 'Person 2',
          descriptors: Array(2).fill(new Float32Array([0.1, 0.2])),
          addedAt: new Date(),
          lastSeen: new Date()
        }
      ];

      mockFaceRecognitionService.getKnownFaces.mockReturnValue(mockKnownFaces);
      mockFaceRecognitionService.getDatabaseStats.mockReturnValue({
        totalFaces: 2,
        totalDescriptors: 7,
        lastUpdated: new Date()
      });

      const stats = faceDatabase.getStatistics();

      expect(stats.totalFaces).toBe(2);
      expect(stats.totalDescriptors).toBe(7);
      expect(stats.wellTrainedFaces).toBe(1); // Only person1 has >= 3 descriptors
      expect(stats.averageDescriptorsPerFace).toBe(3.5);
    });
  });

  describe('Import/Export', () => {
    it('should export database to JSON', () => {
      const mockKnownFace: KnownFace = {
        id: 'export_person',
        name: 'Export Person',
        descriptors: [new Float32Array([0.1, 0.2, 0.3])],
        addedAt: new Date('2023-01-01'),
        lastSeen: new Date('2023-01-02')
      };

      mockFaceRecognitionService.getKnownFaces.mockReturnValue([mockKnownFace]);
      mockFaceRecognitionService.getDatabaseStats.mockReturnValue({
        totalFaces: 1,
        totalDescriptors: 1,
        lastUpdated: new Date('2023-01-01')
      });

      const exportedData = faceDatabase.exportDatabase();
      const parsed = JSON.parse(exportedData);

      expect(parsed.faces).toHaveLength(1);
      expect(parsed.faces[0]?.name).toBe('Export Person');
      // Check that descriptors are arrays with approximately correct values
      expect(parsed.faces[0]?.descriptors[0]).toHaveLength(3);
      expect(parsed.faces[0]?.descriptors[0][0]).toBeCloseTo(0.1, 1);
      expect(parsed.faces[0]?.descriptors[0][1]).toBeCloseTo(0.2, 1);
      expect(parsed.faces[0]?.descriptors[0][2]).toBeCloseTo(0.3, 1);
    });

    it('should import database from JSON', async () => {
      const importData = {
        faces: [
          {
            id: 'import_person',
            name: 'Import Person',
            descriptors: [[0.1, 0.2, 0.3], [0.4, 0.5, 0.6]],
            addedAt: '2023-01-01T00:00:00.000Z',
            lastSeen: '2023-01-02T00:00:00.000Z'
          }
        ],
        totalDescriptors: 2,
        lastUpdated: '2023-01-01T00:00:00.000Z'
      };

      const result = await faceDatabase.importDatabase(JSON.stringify(importData));

      expect(result.success).toBe(true);
      expect(result.facesImported).toBe(1);
      expect(result.descriptorsImported).toBe(2);
      expect(mockFaceRecognitionService.clearDatabase).toHaveBeenCalled();
    });

    it('should handle invalid import data', async () => {
      const result = await faceDatabase.importDatabase('invalid json');

      expect(result.success).toBe(false);
      expect(result.message).toContain('Import failed');
    });

    it('should handle import data with invalid format', async () => {
      const invalidData = { notFaces: [] };

      const result = await faceDatabase.importDatabase(JSON.stringify(invalidData));

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid database format');
    });
  });

  describe('Training Validation', () => {
    it('should validate well-trained face', () => {
      const mockKnownFace: KnownFace = {
        id: 'validated_person',
        name: 'Validated Person',
        descriptors: Array(5).fill(new Float32Array([0.1, 0.2])),
        addedAt: new Date(),
        lastSeen: new Date()
      };

      mockFaceRecognitionService.getKnownFaces.mockReturnValue([mockKnownFace]);

      const validation = faceDatabase.validateTraining('Validated Person');

      expect(validation.isValid).toBe(true);
      expect(validation.sampleCount).toBe(5);
      // Face with 5 descriptors should not get the "add more samples" recommendation
      expect(validation.recommendations).not.toContain('Consider adding more samples for better accuracy');
    });

    it('should validate under-trained face', () => {
      const mockKnownFace: KnownFace = {
        id: 'under_trained',
        name: 'Under Trained',
        descriptors: Array(2).fill(new Float32Array([0.1, 0.2])),
        addedAt: new Date(),
        lastSeen: new Date()
      };

      mockFaceRecognitionService.getKnownFaces.mockReturnValue([mockKnownFace]);

      const validation = faceDatabase.validateTraining('Under Trained');

      expect(validation.isValid).toBe(false);
      expect(validation.sampleCount).toBe(2);
      expect(validation.recommendations).toContain('Add 1 more training samples');
    });

    it('should handle validation for non-existent face', () => {
      mockFaceRecognitionService.getKnownFaces.mockReturnValue([]);

      const validation = faceDatabase.validateTraining('Nonexistent Person');

      expect(validation.isValid).toBe(false);
      expect(validation.sampleCount).toBe(0);
      expect(validation.recommendations).toContain('Face not found in database');
    });
  });

  describe('Storage', () => {
    it('should save to localStorage on training', async () => {
      mockFaceRecognitionService.addKnownFace.mockResolvedValue(true);

      await faceDatabase.addTrainingSample('Storage Person', mockVideoElement, mockFaceDetection);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'facial_recognition_database',
        expect.any(String)
      );
    });

    it('should load from localStorage on initialization', () => {
      const storedData = JSON.stringify({
        faces: [{
          id: 'stored_person',
          name: 'Stored Person',
          descriptors: [[0.1, 0.2]],
          addedAt: '2023-01-01T00:00:00.000Z'
        }],
        totalDescriptors: 1,
        lastUpdated: '2023-01-01T00:00:00.000Z'
      });

      localStorageMock.getItem.mockReturnValue(storedData);

      // Create new instance to trigger loading
      const newDatabase = new FaceDatabase(mockFaceRecognitionService);

      expect(localStorageMock.getItem).toHaveBeenCalledWith('facial_recognition_database');
    });
  });
});