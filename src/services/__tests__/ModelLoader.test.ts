import { ModelLoader } from '../ModelLoader';
import { ModelLoadingState } from '../../types';

// Mock face-api.js
jest.mock('face-api.js', () => ({
  nets: {
    ssdMobilenetv1: {
      loadFromUri: jest.fn()
    },
    faceLandmark68Net: {
      loadFromUri: jest.fn()
    },
    faceRecognitionNet: {
      loadFromUri: jest.fn()
    },
    faceExpressionNet: {
      loadFromUri: jest.fn()
    }
  }
}));

import * as faceapi from 'face-api.js';

describe('ModelLoader', () => {
  let modelLoader: ModelLoader;
  let progressCallback: jest.Mock;

  beforeEach(() => {
    modelLoader = new ModelLoader();
    progressCallback = jest.fn();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default loading state', () => {
      const state = modelLoader.getLoadingState();
      expect(state.isLoading).toBe(false);
      expect(state.totalModels).toBe(0);
      expect(state.loadedModels).toBe(0);
      expect(state.progress).toBe(0);
      expect(state.models).toEqual([]);
    });
  });

  describe('onProgress', () => {
    it('should set progress callback', () => {
      modelLoader.onProgress(progressCallback);
      // Callback should be called during model loading
      expect(progressCallback).not.toHaveBeenCalled();
    });
  });

  describe('loadModels', () => {
    beforeEach(() => {
      // Mock successful model loading
      (faceapi.nets.ssdMobilenetv1.loadFromUri as jest.Mock).mockResolvedValue(undefined);
      (faceapi.nets.faceLandmark68Net.loadFromUri as jest.Mock).mockResolvedValue(undefined);
      (faceapi.nets.faceRecognitionNet.loadFromUri as jest.Mock).mockResolvedValue(undefined);
    });

    it('should load all required models successfully', async () => {
      modelLoader.onProgress(progressCallback);
      
      await modelLoader.loadModels('/test-models');

      expect(faceapi.nets.ssdMobilenetv1.loadFromUri).toHaveBeenCalledWith('/test-models');
      expect(faceapi.nets.faceLandmark68Net.loadFromUri).toHaveBeenCalledWith('/test-models');
      expect(faceapi.nets.faceRecognitionNet.loadFromUri).toHaveBeenCalledWith('/test-models');

      const finalState = modelLoader.getLoadingState();
      expect(finalState.isLoading).toBe(false);
      expect(finalState.loadedModels).toBe(3);
      expect(finalState.totalModels).toBe(3);
      expect(finalState.progress).toBe(100);
    });

    it('should call progress callback during loading', async () => {
      modelLoader.onProgress(progressCallback);
      
      await modelLoader.loadModels('/test-models');

      // Should be called multiple times during loading
      expect(progressCallback).toHaveBeenCalledTimes(8); // Initial + 3 models * 2 calls each + final
      
      // Check that progress increases
      const calls = progressCallback.mock.calls;
      expect(calls[0][0].progress).toBe(0);
      expect(calls[calls.length - 1][0].progress).toBe(100);
    });

    it('should handle model loading errors', async () => {
      const error = new Error('Failed to load model');
      (faceapi.nets.ssdMobilenetv1.loadFromUri as jest.Mock).mockRejectedValue(error);

      modelLoader.onProgress(progressCallback);

      await expect(modelLoader.loadModels('/test-models')).rejects.toThrow('Failed to load model');

      const finalState = modelLoader.getLoadingState();
      expect(finalState.isLoading).toBe(false);
      expect(finalState.error).toBe('Failed to load model');
    });

    it('should use default model path when none provided', async () => {
      await modelLoader.loadModels();

      expect(faceapi.nets.ssdMobilenetv1.loadFromUri).toHaveBeenCalledWith('/models');
    });

    it('should track individual model loading progress', async () => {
      modelLoader.onProgress(progressCallback);
      
      await modelLoader.loadModels('/test-models');

      const finalState = modelLoader.getLoadingState();
      expect(finalState.models).toHaveLength(3);
      
      finalState.models.forEach(model => {
        expect(model.loaded).toBe(true);
        expect(model.progress).toBe(100);
        expect(model.error).toBeUndefined();
      });
    });
  });

  describe('areModelsLoaded', () => {
    it('should return false when no models are loaded', () => {
      expect(modelLoader.areModelsLoaded()).toBe(false);
    });

    it('should return true when all models are loaded', async () => {
      (faceapi.nets.ssdMobilenetv1.loadFromUri as jest.Mock).mockResolvedValue(undefined);
      (faceapi.nets.faceLandmark68Net.loadFromUri as jest.Mock).mockResolvedValue(undefined);
      (faceapi.nets.faceRecognitionNet.loadFromUri as jest.Mock).mockResolvedValue(undefined);

      await modelLoader.loadModels('/test-models');
      
      expect(modelLoader.areModelsLoaded()).toBe(true);
    });

    it('should return false when some models failed to load', async () => {
      (faceapi.nets.ssdMobilenetv1.loadFromUri as jest.Mock).mockRejectedValue(new Error('Failed'));
      
      try {
        await modelLoader.loadModels('/test-models');
      } catch (error) {
        // Expected to fail
      }
      
      expect(modelLoader.areModelsLoaded()).toBe(false);
    });
  });

  describe('getLoadingState', () => {
    it('should return a copy of the loading state', () => {
      const state1 = modelLoader.getLoadingState();
      const state2 = modelLoader.getLoadingState();
      
      expect(state1).toEqual(state2);
      expect(state1).not.toBe(state2); // Should be different objects
    });
  });
});