import { CameraManager } from '../CameraManager';
import type { CameraConfig } from '../../types/index';

// Mock MediaDevices API
const mockGetUserMedia = jest.fn();
const mockEnumerateDevices = jest.fn();
const mockPermissionsQuery = jest.fn();

// Mock MediaStream and MediaStreamTrack
const mockTrack = {
  stop: jest.fn(),
  addEventListener: jest.fn(),
  kind: 'video',
  enabled: true,
  muted: false,
  readyState: 'live'
};

const mockStream = {
  getTracks: jest.fn(() => [mockTrack]),
  active: true,
  id: 'mock-stream-id'
};

// Setup global mocks
Object.defineProperty(global.navigator, 'mediaDevices', {
  value: {
    getUserMedia: mockGetUserMedia,
    enumerateDevices: mockEnumerateDevices
  },
  writable: true
});

Object.defineProperty(global.navigator, 'permissions', {
  value: {
    query: mockPermissionsQuery
  },
  writable: true
});

describe('CameraManager', () => {
  let cameraManager: CameraManager;

  beforeEach(() => {
    cameraManager = new CameraManager();
    jest.clearAllMocks();
    
    // Reset mock implementations
    mockGetUserMedia.mockResolvedValue(mockStream);
    mockEnumerateDevices.mockResolvedValue([]);
    mockPermissionsQuery.mockResolvedValue({
      state: 'granted',
      addEventListener: jest.fn()
    });
  });

  afterEach(() => {
    cameraManager.destroy();
  });

  describe('initializeCamera', () => {
    it('should successfully initialize camera with default config', async () => {
      const stream = await cameraManager.initializeCamera();

      expect(mockGetUserMedia).toHaveBeenCalledWith({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });
      expect(stream).toBe(mockStream);
      expect(cameraManager.isCameraActive()).toBe(true);
      expect(cameraManager.getPermissionState()).toBe('granted');
    });

    it('should initialize camera with custom config', async () => {
      const customConfig: Partial<CameraConfig> = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'environment'
        }
      };

      await cameraManager.initializeCamera(customConfig);

      expect(mockGetUserMedia).toHaveBeenCalledWith({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'environment'
        }
      });
    });

    it('should return existing stream if camera is already active', async () => {
      // First initialization
      const stream1 = await cameraManager.initializeCamera();
      
      // Second initialization should return same stream
      const stream2 = await cameraManager.initializeCamera();

      expect(stream1).toBe(stream2);
      expect(mockGetUserMedia).toHaveBeenCalledTimes(1);
    });

    it('should handle permission denied error', async () => {
      const permissionError = new Error('Permission denied');
      permissionError.name = 'NotAllowedError';
      mockGetUserMedia.mockRejectedValue(permissionError);

      await expect(cameraManager.initializeCamera()).rejects.toThrow('Permission denied');
      expect(cameraManager.getPermissionState()).toBe('denied');
    });

    it('should handle camera not found error', async () => {
      const notFoundError = new Error('Camera not found');
      notFoundError.name = 'NotFoundError';
      mockGetUserMedia.mockRejectedValue(notFoundError);

      await expect(cameraManager.initializeCamera()).rejects.toThrow('Camera not found');
    });

    it('should handle camera in use error', async () => {
      const inUseError = new Error('Camera in use');
      inUseError.name = 'NotReadableError';
      mockGetUserMedia.mockRejectedValue(inUseError);

      await expect(cameraManager.initializeCamera()).rejects.toThrow('Camera in use');
    });

    it('should handle overconstrained error', async () => {
      const constraintError = new Error('Constraints not satisfied');
      constraintError.name = 'OverconstrainedError';
      mockGetUserMedia.mockRejectedValue(constraintError);

      await expect(cameraManager.initializeCamera()).rejects.toThrow('Constraints not satisfied');
    });

    it('should handle security error', async () => {
      const securityError = new Error('Security error');
      securityError.name = 'SecurityError';
      mockGetUserMedia.mockRejectedValue(securityError);

      await expect(cameraManager.initializeCamera()).rejects.toThrow('Security error');
    });

    it('should handle abort error', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';
      mockGetUserMedia.mockRejectedValue(abortError);

      await expect(cameraManager.initializeCamera()).rejects.toThrow('Aborted');
    });
  });

  describe('stopCamera', () => {
    it('should stop camera and clean up resources', async () => {
      await cameraManager.initializeCamera();
      
      cameraManager.stopCamera();

      expect(mockTrack.stop).toHaveBeenCalled();
      expect(cameraManager.isCameraActive()).toBe(false);
      expect(cameraManager.getCameraStream()).toBeNull();
    });

    it('should handle stopping camera when not initialized', () => {
      expect(() => cameraManager.stopCamera()).not.toThrow();
    });
  });

  describe('getCameraStream', () => {
    it('should return null when camera is not initialized', () => {
      expect(cameraManager.getCameraStream()).toBeNull();
    });

    it('should return stream when camera is initialized', async () => {
      await cameraManager.initializeCamera();
      
      expect(cameraManager.getCameraStream()).toBe(mockStream);
    });
  });

  describe('isCameraActive', () => {
    it('should return false when camera is not initialized', () => {
      expect(cameraManager.isCameraActive()).toBe(false);
    });

    it('should return true when camera is active', async () => {
      await cameraManager.initializeCamera();
      
      expect(cameraManager.isCameraActive()).toBe(true);
    });

    it('should return false after stopping camera', async () => {
      await cameraManager.initializeCamera();
      cameraManager.stopCamera();
      
      expect(cameraManager.isCameraActive()).toBe(false);
    });
  });

  describe('getPermissionState', () => {
    it('should return unknown initially', () => {
      expect(cameraManager.getPermissionState()).toBe('unknown');
    });

    it('should return granted after successful initialization', async () => {
      await cameraManager.initializeCamera();
      
      expect(cameraManager.getPermissionState()).toBe('granted');
    });

    it('should return denied after permission error', async () => {
      const permissionError = new Error('Permission denied');
      permissionError.name = 'NotAllowedError';
      mockGetUserMedia.mockRejectedValue(permissionError);

      try {
        await cameraManager.initializeCamera();
      } catch (error) {
        // Expected to throw
      }

      expect(cameraManager.getPermissionState()).toBe('denied');
    });
  });

  describe('getAvailableCameras', () => {
    it('should return available video input devices', async () => {
      const mockDevices = [
        { kind: 'videoinput', deviceId: 'camera1', label: 'Front Camera' },
        { kind: 'audioinput', deviceId: 'mic1', label: 'Microphone' },
        { kind: 'videoinput', deviceId: 'camera2', label: 'Back Camera' }
      ];
      mockEnumerateDevices.mockResolvedValue(mockDevices);

      const cameras = await cameraManager.getAvailableCameras();

      expect(cameras).toHaveLength(2);
      expect(cameras[0]?.deviceId).toBe('camera1');
      expect(cameras[1]?.deviceId).toBe('camera2');
    });

    it('should return empty array when enumeration fails', async () => {
      mockEnumerateDevices.mockRejectedValue(new Error('Enumeration failed'));

      const cameras = await cameraManager.getAvailableCameras();

      expect(cameras).toEqual([]);
    });
  });

  describe('switchCamera', () => {
    it('should switch to specified camera device', async () => {
      // Initialize with default camera first
      await cameraManager.initializeCamera();
      expect(mockTrack.stop).not.toHaveBeenCalled();

      // Switch to different camera
      await cameraManager.switchCamera('camera2');

      expect(mockTrack.stop).toHaveBeenCalled();
      expect(mockGetUserMedia).toHaveBeenCalledWith({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
          deviceId: { exact: 'camera2' }
        }
      });
    });
  });

  describe('permission handling', () => {
    it('should check permissions using Permissions API when available', async () => {
      const mockPermission = {
        state: 'prompt',
        addEventListener: jest.fn()
      };
      mockPermissionsQuery.mockResolvedValue(mockPermission);

      await cameraManager.initializeCamera();

      expect(mockPermissionsQuery).toHaveBeenCalledWith({ name: 'camera' });
      expect(mockPermission.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should handle Permissions API not being available', async () => {
      // Create a new CameraManager instance with mocked navigator
      const originalNavigator = global.navigator;
      
      // Mock navigator without permissions property
      Object.defineProperty(global, 'navigator', {
        value: {
          ...originalNavigator,
          mediaDevices: originalNavigator.mediaDevices
          // permissions property is omitted
        },
        configurable: true
      });

      const testCameraManager = new CameraManager();
      await testCameraManager.initializeCamera();

      expect(testCameraManager.getPermissionState()).toBe('granted');

      // Restore original navigator
      Object.defineProperty(global, 'navigator', {
        value: originalNavigator,
        configurable: true
      });
      
      testCameraManager.destroy();
    });

    it('should handle Permissions API query failure', async () => {
      mockPermissionsQuery.mockRejectedValue(new Error('Permissions API failed'));

      await cameraManager.initializeCamera();

      expect(cameraManager.getPermissionState()).toBe('granted');
    });
  });

  describe('stream event handling', () => {
    it('should set up event listeners on stream tracks', async () => {
      await cameraManager.initializeCamera();

      expect(mockTrack.addEventListener).toHaveBeenCalledWith('ended', expect.any(Function));
      expect(mockTrack.addEventListener).toHaveBeenCalledWith('mute', expect.any(Function));
      expect(mockTrack.addEventListener).toHaveBeenCalledWith('unmute', expect.any(Function));
    });

    it('should handle track ended event', async () => {
      await cameraManager.initializeCamera();
      
      // Simulate track ended event
      const endedCallback = mockTrack.addEventListener.mock.calls.find(
        call => call[0] === 'ended'
      )?.[1];
      
      if (endedCallback) {
        endedCallback();
      }

      expect(cameraManager.getCameraStream()).toBeNull();
    });
  });

  describe('destroy', () => {
    it('should clean up resources when destroyed', async () => {
      await cameraManager.initializeCamera();
      
      cameraManager.destroy();

      expect(mockTrack.stop).toHaveBeenCalled();
      expect(cameraManager.isCameraActive()).toBe(false);
    });
  });
});