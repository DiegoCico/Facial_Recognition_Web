import { ModelLoadingState } from '../types';

/**
 * ModelLoadingIndicator creates and manages a UI component for showing model loading progress
 */
export class ModelLoadingIndicator {
  private container: HTMLElement;
  private progressBar: HTMLElement;
  private progressText: HTMLElement;
  private modelsList: HTMLElement;

  constructor(parentElement: HTMLElement) {
    this.container = this.createContainer();
    this.progressBar = this.createProgressBar();
    this.progressText = this.createProgressText();
    this.modelsList = this.createModelsList();
    
    this.container.appendChild(this.progressText);
    this.container.appendChild(this.progressBar);
    this.container.appendChild(this.modelsList);
    
    parentElement.appendChild(this.container);
  }

  /**
   * Update the loading indicator with current state
   */
  public updateProgress(state: ModelLoadingState): void {
    // Update overall progress
    this.progressBar.style.width = `${state.progress}%`;
    
    if (state.isLoading) {
      this.progressText.textContent = `Loading models... ${state.loadedModels}/${state.totalModels} (${state.progress}%)`;
    } else if (state.error) {
      this.progressText.textContent = `Error loading models: ${state.error}`;
      this.progressText.style.color = '#ff4444';
    } else {
      this.progressText.textContent = 'All models loaded successfully!';
      this.progressText.style.color = '#44ff44';
    }

    // Update individual model status
    this.updateModelsList(state.models);
  }

  /**
   * Show the loading indicator
   */
  public show(): void {
    this.container.style.display = 'block';
  }

  /**
   * Hide the loading indicator
   */
  public hide(): void {
    this.container.style.display = 'none';
  }

  /**
   * Remove the loading indicator from DOM
   */
  public destroy(): void {
    if (this.container.parentElement) {
      this.container.parentElement.removeChild(this.container);
    }
  }

  private createContainer(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'model-loading-indicator';
    container.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0, 0, 0, 0.9);
      color: white;
      padding: 20px;
      border-radius: 10px;
      min-width: 300px;
      text-align: center;
      z-index: 1000;
      font-family: Arial, sans-serif;
    `;
    return container;
  }

  private createProgressBar(): HTMLElement {
    const progressContainer = document.createElement('div');
    progressContainer.style.cssText = `
      width: 100%;
      height: 20px;
      background: #333;
      border-radius: 10px;
      margin: 10px 0;
      overflow: hidden;
    `;

    const progressBar = document.createElement('div');
    progressBar.style.cssText = `
      height: 100%;
      background: linear-gradient(90deg, #4CAF50, #45a049);
      width: 0%;
      transition: width 0.3s ease;
      border-radius: 10px;
    `;

    progressContainer.appendChild(progressBar);
    this.container?.appendChild(progressContainer);
    
    return progressBar;
  }

  private createProgressText(): HTMLElement {
    const text = document.createElement('div');
    text.style.cssText = `
      margin-bottom: 10px;
      font-size: 16px;
      font-weight: bold;
    `;
    text.textContent = 'Initializing model loading...';
    return text;
  }

  private createModelsList(): HTMLElement {
    const list = document.createElement('div');
    list.style.cssText = `
      margin-top: 15px;
      text-align: left;
      font-size: 12px;
    `;
    return list;
  }

  private updateModelsList(models: Array<{ modelName: string; loaded: boolean; progress: number; error?: string }>): void {
    this.modelsList.innerHTML = '';
    
    models.forEach(model => {
      const modelItem = document.createElement('div');
      modelItem.style.cssText = `
        margin: 5px 0;
        padding: 5px;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 5px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      `;

      const modelName = document.createElement('span');
      modelName.textContent = model.modelName;

      const modelStatus = document.createElement('span');
      if (model.error) {
        modelStatus.textContent = '❌ Error';
        modelStatus.style.color = '#ff4444';
      } else if (model.loaded) {
        modelStatus.textContent = '✅ Loaded';
        modelStatus.style.color = '#44ff44';
      } else {
        modelStatus.textContent = '⏳ Loading...';
        modelStatus.style.color = '#ffaa44';
      }

      modelItem.appendChild(modelName);
      modelItem.appendChild(modelStatus);
      this.modelsList.appendChild(modelItem);
    });
  }
}