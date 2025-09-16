// Main entry point for the facial recognition application
import { CameraManager } from './services/CameraManager.js';
import { ModelLoader } from './services/ModelLoader.js';
import { FaceDetectionEngine } from './services/FaceDetectionEngine.js';
import { ModelLoadingIndicator } from './components/ModelLoadingIndicator.js';
import type { ErrorState } from './types/index.js';

class FacialRecognitionApp {
  private cameraManager: CameraManager;
  private modelLoader: ModelLoader;
  private faceDetectionEngine: FaceDetectionEngine;
  private loadingIndicator: ModelLoadingIndicator;
  
  private videoElement: HTMLVideoElement;
  private canvasElement: HTMLCanvasElement;
  private overlayContainer: HTMLElement;
  private startButton: HTMLButtonElement;
  private stopButton: HTMLButtonElement;
  private statusElement: HTMLElement;
  private errorElement: HTMLElement;
  
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;

  constructor() {
    // Initialize DOM elements
    this.videoElement = document.getElementById('video') as HTMLVideoElement;
    this.canvasElement = document.getElementById('canvas') as HTMLCanvasElement;
    this.overlayContainer = document.getElementById('overlay-container') as HTMLElement;
    this.startButton = document.getElementById('start-btn') as HTMLButtonElement;
    this.stopButton = document.getElementById('stop-btn') as HTMLButtonElement;
    this.statusElement = document.getElementById('status') as HTMLElement;
    this.errorElement = document.getElementById('error') as HTMLElement;

    // Initialize services
    this.cameraManager = new CameraManager();
    this.modelLoader = new ModelLoader();
    this.faceDetectionEngine = new FaceDetectionEngine();
    this.loadingIndicator = new ModelLoadingIndicator(document.body);

    this.setupEventListeners();
    this.initialize();
  }

  private setupEventListeners(): void {
    this.startButton.addEventListener('click', () => this.startRecognition());
    this.stopButton.addEventListener('click', () => this.stopRecognition());
    
    // Handle page unload to clean up camera resources
    window.addEventListener('beforeunload', () => this.cleanup());
    window.addEventListener('unload', () => this.cleanup());
  }

  private async initialize(): Promise<void> {
    try {
      this.updateStatus('Initializing face detection models...');
      
      // Set up progress callback
      this.modelLoader.onProgress((state) => {
        this.loadingIndicator.updateProgress(state);
      });
      
      // Show loading indicator
      this.loadingIndicator.show();
      
      // Load models
      await this.modelLoader.loadModels('/models');
      
      // Initialize face detection engine
      await this.faceDetectionEngine.initialize();
      
      // Hide loading indicator
      this.loadingIndicator.hide();
      
      this.updateStatus('Ready to start facial recognition');
    } catch (error) {
      this.loadingIndicator.hide();
      this.handleError({
        type: 'detection',
        message: 'Failed to load face detection models',
        recoverable: false
      });
    }
  }

  private async startRecognition(): Promise<void> {
    try {
      // Check if models are loaded
      if (!this.modelLoader.areModelsLoaded()) {
        this.handleError({
          type: 'detection',
          message: 'Face detection models are not loaded yet',
          recoverable: true
        });
        return;
      }

      this.updateStatus('Starting camera...');
      this.startButton.disabled = true;
      
      const stream = await this.cameraManager.initializeCamera();
      this.videoElement.srcObject = stream;
      
      await new Promise<void>((resolve) => {
        this.videoElement.onloadedmetadata = () => {
          this.setupCanvas();
          resolve();
        };
      });

      this.isRunning = true;
      this.startButton.disabled = true;
      this.stopButton.disabled = false;
      this.updateStatus('Camera active - detecting faces...');
      
      this.startDetectionLoop();
      
    } catch (error) {
      this.handleError({
        type: 'camera',
        message: error instanceof Error ? error.message : 'Failed to access camera',
        recoverable: true
      });
      this.startButton.disabled = false;
    }
  }

  private stopRecognition(): void {
    this.isRunning = false;
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    this.cameraManager.stopCamera();
    
    this.startButton.disabled = false;
    this.stopButton.disabled = true;
    this.updateStatus('Camera stopped');
  }

  private setupCanvas(): void {
    const { videoWidth, videoHeight } = this.videoElement;
    this.canvasElement.width = videoWidth;
    this.canvasElement.height = videoHeight;
  }



  private updateStatus(message: string): void {
    this.statusElement.textContent = message;
    this.errorElement.classList.add('hidden');
  }

  private handleError(error: ErrorState): void {
    this.errorElement.textContent = error.message;
    this.errorElement.classList.remove('hidden');
    this.statusElement.textContent = '';
    
    if (!error.recoverable) {
      this.startButton.disabled = true;
    }
  }

  private startDetectionLoop(): void {
    const detectFaces = async () => {
      if (!this.isRunning) return;

      try {
        const detections = await this.faceDetectionEngine.detectFaces(this.videoElement);
        
        // Clear canvas
        const ctx = this.canvasElement.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, this.canvasElement.width, this.canvasElement.height);
        }

        // Draw face bounding boxes for detected faces
        for (const detection of detections) {
          this.drawFaceBoundingBox(detection);
        }

      } catch (error) {
        console.error('Detection error:', error);
      }

      if (this.isRunning) {
        this.animationFrameId = requestAnimationFrame(detectFaces);
      }
    };

    detectFaces();
  }

  private drawFaceBoundingBox(detection: any): void {
    const ctx = this.canvasElement.getContext('2d');
    if (!ctx) return;

    const { x, y, width, height } = detection.boundingBox;
    
    ctx.strokeStyle = '#00ff00';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);
    
    // Draw confidence score
    ctx.fillStyle = '#00ff00';
    ctx.font = '16px Arial';
    ctx.fillText(`${Math.round(detection.confidence * 100)}%`, x, y - 5);
  }

  private cleanup(): void {
    this.stopRecognition();
  }
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new FacialRecognitionApp();
});