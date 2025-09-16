import { ModelLoadingState } from '../types';
/**
 * ModelLoadingIndicator creates and manages a UI component for showing model loading progress
 */
export declare class ModelLoadingIndicator {
    private container;
    private progressBar;
    private progressText;
    private modelsList;
    constructor(parentElement: HTMLElement);
    /**
     * Update the loading indicator with current state
     */
    updateProgress(state: ModelLoadingState): void;
    /**
     * Show the loading indicator
     */
    show(): void;
    /**
     * Hide the loading indicator
     */
    hide(): void;
    /**
     * Remove the loading indicator from DOM
     */
    destroy(): void;
    private createContainer;
    private createProgressBar;
    private createProgressText;
    private createModelsList;
    private updateModelsList;
}
//# sourceMappingURL=ModelLoadingIndicator.d.ts.map