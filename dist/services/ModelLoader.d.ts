import { ModelLoadingState } from '../types';
/**
 * ModelLoader handles loading face-api.js models with progress tracking
 */
export declare class ModelLoader {
    private loadingState;
    private progressCallback?;
    constructor();
    /**
     * Set callback for progress updates
     */
    onProgress(callback: (state: ModelLoadingState) => void): void;
    /**
     * Load all required models for face detection and recognition
     */
    loadModels(modelPath?: string): Promise<void>;
    /**
     * Check if all models are loaded
     */
    areModelsLoaded(): boolean;
    /**
     * Get current loading state
     */
    getLoadingState(): ModelLoadingState;
    private initializeLoadingState;
    private loadSingleModel;
    private updateProgress;
}
//# sourceMappingURL=ModelLoader.d.ts.map