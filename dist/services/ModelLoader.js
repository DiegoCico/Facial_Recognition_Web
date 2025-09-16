import * as faceapi from 'face-api.js';
/**
 * ModelLoader handles loading face-api.js models with progress tracking
 */
export class ModelLoader {
    constructor() {
        this.loadingState = {
            isLoading: false,
            totalModels: 0,
            loadedModels: 0,
            progress: 0,
            models: []
        };
    }
    /**
     * Set callback for progress updates
     */
    onProgress(callback) {
        this.progressCallback = callback;
    }
    /**
     * Load all required models for face detection and recognition
     */
    async loadModels(modelPath = '/models') {
        const requiredModels = [
            'ssdMobilenetv1',
            'faceLandmark68Net',
            'faceRecognitionNet'
        ];
        this.initializeLoadingState(requiredModels);
        this.updateProgress();
        try {
            // Load models sequentially to track progress accurately
            for (const modelType of requiredModels) {
                await this.loadSingleModel(modelType, modelPath);
            }
            this.loadingState.isLoading = false;
            this.updateProgress();
        }
        catch (error) {
            this.loadingState.error = error instanceof Error ? error.message : 'Unknown error loading models';
            this.loadingState.isLoading = false;
            this.updateProgress();
            throw error;
        }
    }
    /**
     * Check if all models are loaded
     */
    areModelsLoaded() {
        return this.loadingState.loadedModels === this.loadingState.totalModels &&
            this.loadingState.totalModels > 0;
    }
    /**
     * Get current loading state
     */
    getLoadingState() {
        return { ...this.loadingState };
    }
    initializeLoadingState(models) {
        this.loadingState = {
            isLoading: true,
            totalModels: models.length,
            loadedModels: 0,
            progress: 0,
            models: models.map(modelName => ({
                modelName,
                loaded: false,
                progress: 0
            })),
            error: undefined
        };
    }
    async loadSingleModel(modelType, modelPath) {
        const modelProgress = this.loadingState.models.find(m => m.modelName === modelType);
        if (!modelProgress)
            return;
        try {
            modelProgress.progress = 0;
            this.updateProgress();
            switch (modelType) {
                case 'ssdMobilenetv1':
                    await faceapi.nets.ssdMobilenetv1.loadFromUri(modelPath);
                    break;
                case 'faceLandmark68Net':
                    await faceapi.nets.faceLandmark68Net.loadFromUri(modelPath);
                    break;
                case 'faceRecognitionNet':
                    await faceapi.nets.faceRecognitionNet.loadFromUri(modelPath);
                    break;
                case 'faceExpressionNet':
                    await faceapi.nets.faceExpressionNet.loadFromUri(modelPath);
                    break;
                default:
                    throw new Error(`Unknown model type: ${modelType}`);
            }
            modelProgress.loaded = true;
            modelProgress.progress = 100;
            this.loadingState.loadedModels++;
            this.updateProgress();
        }
        catch (error) {
            modelProgress.error = error instanceof Error ? error.message : 'Failed to load model';
            throw error;
        }
    }
    updateProgress() {
        this.loadingState.progress = this.loadingState.totalModels > 0
            ? Math.round((this.loadingState.loadedModels / this.loadingState.totalModels) * 100)
            : 0;
        if (this.progressCallback) {
            this.progressCallback(this.getLoadingState());
        }
    }
}
//# sourceMappingURL=ModelLoader.js.map